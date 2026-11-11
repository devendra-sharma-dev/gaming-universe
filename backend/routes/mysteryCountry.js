const express = require("express");
const Attempt = require("../models/MysteryCountryAttempt");
const User = require("../models/User");
const countries = require("../data/mysteryCountries");
const { getGuessCountries } = require("../services/countryCatalog");
const { requireAuth } = require("../middleware/auth");
const err = require("../utils/httpError");
const { countryForDate, distanceKm, direction, heat, xpFor } = require("../games/mysteryCountry/logic");

const router = express.Router();
const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const today = () => new Date().toISOString().slice(0, 10);

const clue = (c, r) => (
    r === 2
        ? { round: r, title: "Country Silhouette", mapFeature: c.name }
        : r === 3
            ? { round: r, title: "Cities", mapFeature: c.name, cities: c.cities.map(([name, lat, lng]) => ({ name, lat, lng })) }
            : r === 4
                ? { round: r, title: "Borders & Stats", mapFeature: c.name, neighbors: c.neighbors, stats: c.stats }
                : r === 5
                    ? { round: r, title: "Flag & Final Clues", mapFeature: c.name, flagCode: c.code, clues: c.clues }
                    : { round: 1, title: "Distance & Direction" }
);

const view = (a, t, all) => {
    const payload = {
        gameDate: a.gameDate,
        currentRound: a.currentRound,
        status: a.status,
        solvedRound: a.solvedRound,
        xpEarned: a.xpEarned,
        guesses: a.guesses,
        attemptsRemaining: Math.max(0, 5 - a.guesses.filter((g) => g.round === 1).length),
        clue: a.status === "active"
            ? clue(t, a.currentRound)
            : { ...clue(t, 5), answer: { name: t.name, flagCode: t.code, mapFeature: t.name } }
    };
    if (all) payload.countries = all;
    return payload;
};

router.use(requireAuth);

router.get("/daily", asyncRoute(async (req, res) => {
    const gameDate = today();
    const t = countryForDate(countries, gameDate);
    const all = await getGuessCountries();
    let a = await Attempt.findOne({ userId: req.user._id, gameDate }).lean();
    if (!a) {
        try {
            a = await Attempt.create({ userId: req.user._id, gameDate, countryCode: t.code });
        } catch (e) {
            if (e.code === 11000) a = await Attempt.findOne({ userId: req.user._id, gameDate }).lean();
            else throw e;
        }
    }
    res.json({ success: true, data: view(a, t, all) });
}));

router.post("/daily/guess", asyncRoute(async (req, res) => {
    const code = String(req.body.countryCode || "").toUpperCase();
    const gameDate = today();
    const t = countryForDate(countries, gameDate);
    const all = await getGuessCountries();
    const guess = all.find((c) => c.code === code);
    if (!guess) throw err(400, "Choose a valid country.");

    const a = await Attempt.findOne({ userId: req.user._id, gameDate }).lean();
    if (!a || a.status !== "active") throw err(409, "Today’s Mystery Country is already complete.");
    if (a.guesses.some((g) => g.countryCode === code)) throw err(409, "You already guessed that country.");

    const correct = code === t.code;
    const entry = { countryCode: code, round: a.currentRound };
    if (a.currentRound === 1 && !correct) {
        entry.distance = distanceKm(guess, t);
        entry.direction = direction(guess, t);
    }

    const round1Count = a.guesses.filter((g) => g.round === 1).length + (a.currentRound === 1 ? 1 : 0);

    if (correct) {
        const xpEarned = xpFor(a.currentRound, round1Count);
        const updated = await Attempt.findOneAndUpdate(
            { _id: a._id, status: "active", xpAwarded: false },
            {
                $push: { guesses: entry },
                $set: {
                    status: "solved",
                    solvedRound: a.currentRound,
                    xpEarned,
                    completedAt: new Date(),
                    xpAwarded: true
                }
            },
            { new: true }
        ).lean();
        if (!updated) throw err(409, "Today’s XP has already been awarded.");

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $inc: { xp: xpEarned } },
            { new: true }
        ).select("xp").lean();

        return res.json({
            success: true,
            data: { ...view(updated, t), outcome: { correct: true, totalXp: user.xp } }
        });
    }

    if (a.currentRound === 1 && round1Count < 5) {
        const updated = await Attempt.findOneAndUpdate(
            { _id: a._id, status: "active" },
            { $push: { guesses: entry } },
            { new: true }
        ).lean();
        if (!updated) throw err(409, "Today’s Mystery Country is already complete.");
        return res.json({
            success: true,
            data: {
                ...view(updated, t),
                outcome: { correct: false, feedback: { distance: entry.distance, direction: entry.direction, ...heat(entry.distance) } }
            }
        });
    }

    const nextSet = a.currentRound === 5
        ? { status: "failed", completedAt: new Date() }
        : { currentRound: a.currentRound + 1 };

    const updated = await Attempt.findOneAndUpdate(
        { _id: a._id, status: "active" },
        { $push: { guesses: entry }, $set: nextSet },
        { new: true }
    ).lean();
    if (!updated) throw err(409, "Today’s Mystery Country is already complete.");

    res.json({
        success: true,
        data: { ...view(updated, t), outcome: { correct: false, advanced: updated.status === "active" } }
    });
}));

module.exports = router;
