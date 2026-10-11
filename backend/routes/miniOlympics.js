"use strict";

const express = require("express");
const {
    getAllCountries,
    getCountryByCode,
    searchCountries
} = require("../games/miniOlympics/countries");

const {
    EVENTS,
    normalizeScore,
    simulateOpponentScores,
    rankEvent,
    updateStandingsWithEvent,
    createCompetition
} = require("../games/miniOlympics/engine");

const MiniOlympicsCompetition = require("../models/MiniOlympicsCompetition");
const User = require("../models/User");
const mongoose = require("mongoose");
const createHttpError = require("../utils/httpError");

const router = express.Router();
const activeCompetitions = new Map();

// Helper to wrap async routes
const asyncRoute = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Clean up active competitions older than 2 hours to avoid memory leak
 */
setInterval(() => {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    for (const [id, comp] of activeCompetitions.entries()) {
        if (new Date(comp.createdAt).getTime() < twoHoursAgo) {
            activeCompetitions.delete(id);
        }
    }
}, 30 * 60 * 1000).unref();

/**
 * GET /api/v1/mini-olympics/countries
 * Returns worldwide country list, optionally filtered by search query
 */
router.get("/countries", (req, res) => {
    const query = req.query.q;
    const list = query ? searchCountries(query) : getAllCountries();
    res.json({
        success: true,
        data: {
            countries: list,
            total: list.length
        }
    });
});

/**
 * POST /api/v1/mini-olympics/competition/start
 * Starts a new 16-country competition with the player's selected country
 */
router.post(
    "/competition/start",
    asyncRoute(async (req, res) => {
        const countryCode = String(req.body.countryCode || "").toUpperCase().trim();
        const country = getCountryByCode(countryCode);

        if (!country) {
            throw createHttpError(400, "Please select a valid recognized country.");
        }

        const comp = createCompetition(countryCode);
        activeCompetitions.set(comp.competitionId, comp);

        res.status(201).json({
            success: true,
            data: {
                competitionId: comp.competitionId,
                playerCountry: comp.playerCountry,
                opponents: comp.opponents,
                participants: comp.participants,
                currentEventIndex: comp.currentEventIndex,
                events: comp.events,
                standings: comp.standings,
                totalEvents: comp.totalEvents
            }
        });
    })
);

/**
 * POST /api/v1/mini-olympics/competition/event-result
 * Submits player gameplay metrics for the current event, generates opponent scores,
 * allocates medals, updates cumulative standings, and advances.
 */
router.post(
    "/competition/event-result",
    asyncRoute(async (req, res) => {
        const { competitionId, eventId, metrics, rawScore } = req.body;

        if (!competitionId) {
            throw createHttpError(400, "Competition ID is required.");
        }

        const comp = activeCompetitions.get(competitionId);
        if (!comp) {
            throw createHttpError(404, "Active competition not found or expired. Please start a new competition.");
        }

        if (comp.status === "completed") {
            throw createHttpError(409, "Competition is already completed.");
        }

        const expectedEvent = comp.events[comp.currentEventIndex];
        if (!expectedEvent || expectedEvent.id !== eventId) {
            throw createHttpError(
                400,
                `Invalid event sequence. Expected "${expectedEvent?.id}", got "${eventId}".`
            );
        }

        // Check if event was already submitted
        if (comp.eventResults.some((er) => er.eventId === eventId)) {
            throw createHttpError(409, `Results for ${eventId} have already been submitted.`);
        }

        // Calculate verified normalized score on the server
        const payloadMetrics = {
            ...(metrics || {}),
            rawScore: typeof rawScore === "number" ? rawScore : metrics?.rawScore
        };
        const normalizedScore = normalizeScore(eventId, payloadMetrics);

        const playerResult = {
            code: comp.playerCountry.code,
            name: comp.playerCountry.name,
            flag: comp.playerCountry.flag,
            normalizedScore,
            rawScore: Number(payloadMetrics.rawScore) || normalizedScore,
            metrics: payloadMetrics
        };

        // Simulate 15 distinct opponent scores (or accept pre-simulated opponents from event engine)
        let simOpponents;
        if (Array.isArray(req.body.simOpponents) && req.body.simOpponents.length === comp.opponents.length) {
            const validCodes = new Set(comp.opponents.map((o) => o.code));
            const allMatch = req.body.simOpponents.every((o) => validCodes.has(o.code));
            if (allMatch) {
                simOpponents = req.body.simOpponents;
            } else {
                simOpponents = simulateOpponentScores(eventId, comp.opponents);
            }
        } else {
            simOpponents = simulateOpponentScores(eventId, comp.opponents);
        }

        // Rank the 16 countries and allocate medals
        const eventRanked = rankEvent(eventId, playerResult, simOpponents);

        // Update cumulative standings
        comp.standings = updateStandingsWithEvent(comp.standings, eventRanked);
        comp.eventResults.push(eventRanked);
        comp.currentEventIndex += 1;

        const isCompleted = comp.currentEventIndex >= comp.events.length;
        if (isCompleted) {
            comp.status = "completed";
            comp.winnerCountry = comp.standings[0];
            comp.completedAt = new Date();
        }

        res.json({
            success: true,
            data: {
                competitionId: comp.competitionId,
                eventId,
                eventRanked,
                standings: comp.standings,
                currentEventIndex: comp.currentEventIndex,
                isCompleted,
                winnerCountry: comp.winnerCountry || null,
                playerFinalRank: isCompleted
                    ? comp.standings.find((s) => s.code === comp.playerCountry.code)?.rank
                    : null
            }
        });
    })
);

/**
 * POST /api/v1/mini-olympics/competition/complete
 * Optionally saves completed competition to MongoDB if authenticated or desired.
 */
router.post(
    "/competition/complete",
    asyncRoute(async (req, res) => {
        const { competitionId } = req.body;
        if (!competitionId) {
            throw createHttpError(400, "Competition ID is required.");
        }

        const comp = activeCompetitions.get(competitionId);
        if (!comp) {
            throw createHttpError(404, "Active competition not found.");
        }

        if (comp.status !== "completed") {
            throw createHttpError(400, "Competition is not finished yet.");
        }

        const userId = req.session?.userId || null;
        let savedDoc = null;

        const playerStanding = comp.standings.find((s) => s.code === comp.playerCountry.code);
        let xpGain = 30; // 30 base for completing all 5 events
        if (playerStanding) {
            xpGain += (playerStanding.gold || 0) * 30;   // 30 per Gold
            xpGain += (playerStanding.silver || 0) * 20; // 20 per Silver
            xpGain += (playerStanding.bronze || 0) * 10; // 10 per Bronze
        }

        try {
            if (mongoose.connection.readyState === 1) {
                savedDoc = await MiniOlympicsCompetition.findOneAndUpdate(
                    { competitionId },
                    {
                        $setOnInsert: {
                            competitionId: comp.competitionId,
                            userId,
                            playerCountry: comp.playerCountry,
                            opponents: comp.opponents,
                            eventResults: comp.eventResults,
                            finalMedalTable: comp.standings,
                            winnerCountry: comp.winnerCountry,
                            totalMedalsAwarded: 15,
                            xpEarned: xpGain,
                            status: "completed",
                            completedAt: comp.completedAt || new Date()
                        }
                    },
                    { upsert: true, new: true }
                );

                // Award XP to registered user if authenticated
                if (userId) {
                    await User.findByIdAndUpdate(userId, { $inc: { xp: xpGain } });
                }
            }
        } catch (_dbError) {
            // Non-critical if DB is unavailable in test/guest environments
        }

        // Clean up from active memory map
        activeCompetitions.delete(competitionId);

        res.json({
            success: true,
            data: {
                competitionId: comp.competitionId,
                status: "completed",
                winnerCountry: comp.winnerCountry,
                finalMedalTable: comp.standings,
                xpEarned: xpGain
            }
        });
    })
);

module.exports = router;
