/* Estimate It — API routes */

const express = require("express");
const { requireAuth } = require("../middleware/auth");
const createHttpError = require("../utils/httpError");
const EstimateItAttempt = require("../models/EstimateItAttempt");
const User = require("../models/User");
const { getGameDate, getOrAssignDailyQuestions } = require("../services/estimateItDaily");
const {
    TOTAL_ROUNDS, TOTAL_CHIPS, MIN_BET, TIMER_SECONDS,
    calculatePercentageError, getTier, calculateXp,
    validateBet, maxBetForRound, parseEstimate
} = require("../games/estimateIt/logic");

const router = express.Router();
const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* ── Helpers ────────────────────────────────────────────── */

/** Build the client-safe view of the current game state.
 *  The current round's answer is NEVER included unless already submitted. */
const buildView = (attempt, questions) => {
    const roundIndex = attempt.currentRound - 1;
    const currentQuestion = questions[roundIndex];
    const completedRounds = attempt.rounds.map(r => ({
        round: attempt.rounds.indexOf(r) + 1,
        question: r.question,
        category: r.category,
        unit: r.unit,
        estimate: r.estimate,
        actualAnswer: r.actualAnswer,
        bet: r.bet,
        percentageError: r.percentageError,
        multiplier: r.multiplier,
        xpEarned: r.xpEarned
    }));

    const view = {
        gameDate: attempt.gameDate,
        currentRound: attempt.currentRound,
        totalRounds: TOTAL_ROUNDS,
        status: attempt.status,
        remainingChips: attempt.remainingChips,
        totalXp: attempt.totalXp,
        completedRounds,
        timerSeconds: TIMER_SECONDS
    };

    if (attempt.status === "active" && currentQuestion) {
        const maxBet = maxBetForRound(attempt.remainingChips, attempt.currentRound);
        view.question = {
            text: currentQuestion.question,
            category: currentQuestion.category,
            unit: currentQuestion.unit
        };
        view.bet = {
            min: MIN_BET,
            max: maxBet,
            isFinalRound: attempt.currentRound === TOTAL_ROUNDS,
            finalBet: attempt.currentRound === TOTAL_ROUNDS ? attempt.remainingChips : null
        };
    }

    return view;
};

/* ── GET /daily ─────────────────────────────────────────── */

router.use(requireAuth);

router.get("/daily", asyncRoute(async (req, res) => {
    const gameDate = getGameDate();
    const questions = await getOrAssignDailyQuestions(gameDate);

    let attempt = await EstimateItAttempt.findOne({ userId: req.user._id, gameDate });

    if (!attempt) {
        try {
            attempt = await EstimateItAttempt.create({
                userId: req.user._id,
                gameDate,
                totalChips: TOTAL_CHIPS,
                remainingChips: TOTAL_CHIPS
            });
        } catch (error) {
            if (error.code === 11000) {
                attempt = await EstimateItAttempt.findOne({ userId: req.user._id, gameDate });
            } else throw error;
        }
    }

    res.json({ success: true, data: buildView(attempt, questions) });
}));

/* ── POST /daily/submit ─────────────────────────────────── */

router.post("/daily/submit", asyncRoute(async (req, res) => {
    const gameDate = getGameDate();
    const questions = await getOrAssignDailyQuestions(gameDate);

    const attempt = await EstimateItAttempt.findOne({ userId: req.user._id, gameDate });
    if (!attempt) throw createHttpError(404, "Start today's Estimate It game first.");
    if (attempt.status !== "active") throw createHttpError(409, "Today's Estimate It game is already complete.");

    const roundIndex = attempt.currentRound - 1;

    // Prevent duplicate submission for the same round
    if (attempt.rounds.length >= attempt.currentRound) {
        throw createHttpError(409, "This round has already been submitted.");
    }

    // Parse and validate estimate
    const estimate = parseEstimate(req.body.estimate);
    const timedOut = estimate === null;

    // Parse and validate bet
    let bet;
    if (attempt.currentRound === TOTAL_ROUNDS) {
        bet = attempt.remainingChips;
    } else {
        bet = Number(req.body.bet);
        if (!validateBet(bet, attempt.remainingChips, attempt.currentRound)) {
            throw createHttpError(400, "Invalid bet amount.");
        }
    }

    // Calculate scoring
    const currentQuestion = questions[roundIndex];
    const actualAnswer = currentQuestion.answer;
    let percentageError, tier, xpEarned;

    if (timedOut) {
        percentageError = 100;
        tier = { multiplier: 0, label: "WAY OFF", emoji: "💀" };
        xpEarned = 0;
    } else {
        percentageError = calculatePercentageError(estimate, actualAnswer);
        tier = getTier(percentageError);
        xpEarned = calculateXp(bet, tier.multiplier);
    }

    // Record the round
    attempt.rounds.push({
        questionId: currentQuestion._id,
        question: currentQuestion.question,
        actualAnswer,
        category: currentQuestion.category,
        unit: currentQuestion.unit,
        estimate: timedOut ? null : estimate,
        bet,
        percentageError: Math.round(percentageError * 100) / 100,
        multiplier: tier.multiplier,
        xpEarned,
        submittedAt: new Date()
    });

    attempt.remainingChips -= bet;
    attempt.totalXp += xpEarned;

    // Check if game is complete
    if (attempt.currentRound === TOTAL_ROUNDS) {
        attempt.status = "completed";
        attempt.completedAt = new Date();
        await attempt.save();

        // Award XP atomically (same pattern as tic-tac-toe)
        const { awardEstimateItXp } = require("../services/xp");
        const totalUserXp = await awardEstimateItXp({
            attemptId: attempt._id,
            userId: req.user._id,
            xpAmount: attempt.totalXp
        });

        const view = buildView(attempt, questions);
        view.roundResult = {
            estimate: timedOut ? null : estimate,
            actualAnswer,
            percentageError: Math.round(percentageError * 100) / 100,
            multiplier: tier.multiplier,
            label: tier.label,
            emoji: tier.emoji,
            xpEarned,
            bet,
            timedOut
        };
        if (totalUserXp !== null) view.totalUserXp = totalUserXp;
        return res.json({ success: true, data: view });
    }

    // Advance to next round
    attempt.currentRound += 1;
    await attempt.save();

    const view = buildView(attempt, questions);
    view.roundResult = {
        estimate: timedOut ? null : estimate,
        actualAnswer,
        percentageError: Math.round(percentageError * 100) / 100,
        multiplier: tier.multiplier,
        label: tier.label,
        emoji: tier.emoji,
        xpEarned,
        bet,
        timedOut
    };

    res.json({ success: true, data: view });
}));

/* ── GET /daily/result ──────────────────────────────────── */

router.get("/daily/result", asyncRoute(async (req, res) => {
    const gameDate = req.query.date || getGameDate();
    const attempt = await EstimateItAttempt.findOne({ userId: req.user._id, gameDate });
    if (!attempt) throw createHttpError(404, "No Estimate It game found for this date.");

    const questions = await getOrAssignDailyQuestions(gameDate);
    res.json({ success: true, data: buildView(attempt, questions) });
}));

module.exports = router;

