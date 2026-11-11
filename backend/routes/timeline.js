const express = require("express");
const TimelineAttempt = require("../models/TimelineAttempt");
const TimelineEvent = require("../models/TimelineEvent");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");
const createHttpError = require("../utils/httpError");
const { EVENTS_PER_ROUND, ROUNDS_PER_DAY, getGameDate, getOrCreateDailyGame } = require("../services/timelineDaily");

const router = express.Router();
const asyncRoute = (handler) => (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
const publicEvent = (event) => ({ id: String(event._id), title: event.title, description: event.description, category: event.category });
const eventId = (item) => String(item?._id || item);

const hydrateRounds = async (game) => {
    const first = game.rounds?.[0]?.[0];
    if (first && typeof first === "object" && first.title) {
        return game.rounds;
    }
    const events = await TimelineEvent.find({ _id: { $in: game.rounds.flat(Infinity).map(eventId) } }).lean();
    const byId = new Map(events.map((event) => [String(event._id), event]));
    return game.rounds.map((round) => round.flat(Infinity).map((id) => byId.get(eventId(id))).filter(Boolean));
};

router.use(requireAuth);

router.get("/daily", asyncRoute(async (request, response) => {
    const gameDate = getGameDate();
    const [game, attempts] = await Promise.all([
        getOrCreateDailyGame(gameDate),
        TimelineAttempt.find({ userId: request.user._id, gameDate }).lean()
    ]);
    const attemptsByRound = new Map(attempts.map((attempt) => [attempt.round, attempt]));
    const rounds = await hydrateRounds(game);
    response.json({
        success: true,
        data: {
            gameDate,
            roundsTotal: ROUNDS_PER_DAY,
            eventsPerRound: EVENTS_PER_ROUND,
            rounds: rounds.map((events, round) => ({
                round,
                completed: attemptsByRound.has(round),
                score: attemptsByRound.get(round)?.xpEarned || 0,
                events: events.map(publicEvent)
            })),
            totalScore: attempts.reduce((sum, attempt) => sum + attempt.xpEarned, 0)
        }
    });
}));

router.post("/daily/rounds/:round", asyncRoute(async (request, response) => {
    const round = Number(request.params.round);
    const submittedIds = request.body.eventIds;
    if (!Number.isInteger(round) || round < 0 || round >= ROUNDS_PER_DAY) throw createHttpError(400, "Choose a valid round.");
    if (!Array.isArray(submittedIds) || submittedIds.length !== EVENTS_PER_ROUND || new Set(submittedIds).size !== EVENTS_PER_ROUND) {
        throw createHttpError(400, "Submit exactly four unique timeline events.");
    }

    const gameDate = getGameDate();
    const game = await getOrCreateDailyGame(gameDate);
    const roundItems = game.rounds[round];
    const correctIds = roundItems.map(eventId);
    if (submittedIds.some((id) => !correctIds.includes(id))) throw createHttpError(400, "That event does not belong to this round.");
    const correctPositions = submittedIds.reduce((sum, id, index) => sum + (id === correctIds[index] ? 1 : 0), 0);
    const xpEarned = correctPositions * 10;

    try {
        await TimelineAttempt.create({ userId: request.user._id, gameDate, round, correctPositions, xpEarned, submittedOrder: submittedIds });
    } catch (error) {
        if (error.code === 11000) throw createHttpError(409, "You have already completed this round.");
        throw error;
    }

    const [user, completedRounds] = await Promise.all([
        User.findByIdAndUpdate(request.user._id, { $inc: { xp: xpEarned } }, { new: true }).select("xp").lean(),
        TimelineAttempt.countDocuments({ userId: request.user._id, gameDate })
    ]);

    let solution = roundItems;
    if (!(solution[0] && typeof solution[0] === "object" && solution[0].date)) {
        const events = await TimelineEvent.find({ _id: { $in: correctIds } }).lean();
        const eventsById = new Map(events.map((event) => [String(event._id), event]));
        solution = correctIds.map((id) => eventsById.get(id)).filter(Boolean);
    }

    response.json({
        success: true,
        data: {
            correctPositions,
            xpEarned,
            totalXp: user.xp,
            completedRounds,
            dailyComplete: completedRounds === ROUNDS_PER_DAY,
            solution: solution.map((event) => ({
                ...publicEvent(event),
                date: new Date(event.date).toISOString().slice(0, 10)
            }))
        }
    });
}));

module.exports = router;
