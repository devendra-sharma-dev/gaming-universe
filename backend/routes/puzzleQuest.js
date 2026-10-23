"use strict";

const express = require("express");
const mongoose = require("mongoose");
const PuzzleQuestProgress = require("../models/PuzzleQuestProgress");
const User = require("../models/User");
const createHttpError = require("../utils/httpError");
const { LEVEL_XP } = require("../games/puzzleQuest/catalog");

const router = express.Router();
const asyncRoute = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

/**
 * GET /api/v1/puzzle-quest/progress
 * Returns user progress if authenticated; guest defaults otherwise.
 */
router.get(
    "/progress",
    asyncRoute(async (req, res) => {
        const userId = req.session?.userId || null;

        if (!userId || mongoose.connection.readyState !== 1) {
            return res.json({
                success: true,
                data: {
                    completedLevels: [],
                    bestTimes: {},
                    bestMoves: {},
                    resumeLevel: 1,
                    isGuest: true
                }
            });
        }

        const progress = await PuzzleQuestProgress.findOne({ userId });

        if (!progress) {
            return res.json({
                success: true,
                data: {
                    completedLevels: [],
                    bestTimes: {},
                    bestMoves: {},
                    resumeLevel: 1,
                    isGuest: false
                }
            });
        }

        // Convert Map fields to plain objects for JSON response
        const bestTimes = {};
        if (progress.bestTimes) {
            for (const [key, value] of progress.bestTimes.entries()) {
                bestTimes[key] = value;
            }
        }

        const bestMoves = {};
        if (progress.bestMoves) {
            for (const [key, value] of progress.bestMoves.entries()) {
                bestMoves[key] = value;
            }
        }

        const bestStars = {};
        if (progress.bestStars) {
            for (const [key, value] of progress.bestStars.entries()) {
                bestStars[key] = value;
            }
        }

        return res.json({
            success: true,
            data: {
                completedLevels: progress.completedLevels || [],
                bestTimes,
                bestMoves,
                bestStars,
                resumeLevel: progress.resumeLevel || 1,
                xpEarned: progress.xpEarned || 0,
                isGuest: false
            }
        });
    })
);

/**
 * POST /api/v1/puzzle-quest/progress
 * Saves level completion for authenticated users. Guests are acknowledged without persisting.
 */
router.post(
    "/progress",
    asyncRoute(async (req, res) => {
        const userId = req.session?.userId || null;
        const progressionLevel = Number(req.body.progressionLevel);
        const timeTaken = Number(req.body.timeTaken) || 0;
        const moves = typeof req.body.moves === "number" ? req.body.moves : null;

        if (!Number.isInteger(progressionLevel) || progressionLevel < 1 || progressionLevel > 50) {
            throw createHttpError(400, "Valid progressionLevel between 1 and 50 is required.");
        }

        // Guests: No database persistence, session only
        if (!userId || mongoose.connection.readyState !== 1) {
            const guestXp = LEVEL_XP[progressionLevel] || 50;
            return res.json({
                success: true,
                data: {
                    saved: false,
                    isGuest: true,
                    progressionLevel,
                    nextLevel: Math.min(progressionLevel + 1, 50),
                    xpAwarded: guestXp,
                    message: "Guest progress is in-memory only."
                }
            });
        }

        let progress = await PuzzleQuestProgress.findOne({ userId });
        if (!progress) {
            progress = new PuzzleQuestProgress({
                userId,
                completedLevels: [],
                bestTimes: new Map(),
                bestMoves: new Map(),
                resumeLevel: 1,
                xpEarned: 0
            });
        }

        // Validate level unlocking: level 1 is always unlocked.
        // Higher levels require level - 1 to be completed or already completed.
        const isUnlocked = progressionLevel === 1 ||
            progress.completedLevels.includes(progressionLevel) ||
            progress.completedLevels.includes(progressionLevel - 1);

        if (!isUnlocked) {
            return res.status(403).json({
                success: false,
                error: `Level ${progressionLevel} is locked. Complete Level ${progressionLevel - 1} first.`
            });
        }

        const levelKey = String(progressionLevel);
        const isNewCompletion = !progress.completedLevels.includes(progressionLevel);

        if (isNewCompletion) {
            progress.completedLevels.push(progressionLevel);
            progress.completedLevels.sort((a, b) => a - b);
        }

        // Update best time
        const currentBestTime = progress.bestTimes.get(levelKey);
        if (timeTaken > 0 && (!currentBestTime || timeTaken < currentBestTime)) {
            progress.bestTimes.set(levelKey, timeTaken);
        }

        const stars = typeof req.body.stars === "number" ? Math.max(1, Math.min(3, Math.round(req.body.stars))) : null;

        // Update best moves
        if (moves !== null) {
            const currentBestMoves = progress.bestMoves.get(levelKey);
            if (!currentBestMoves || moves < currentBestMoves) {
                progress.bestMoves.set(levelKey, moves);
            }
        }

        // Update best stars
        if (stars !== null) {
            if (!progress.bestStars) progress.bestStars = new Map();
            const currentBestStars = progress.bestStars.get(levelKey) || 0;
            if (stars > currentBestStars) {
                progress.bestStars.set(levelKey, stars);
            }
        }

        // Calculate next resume level: the lowest uncompleted level, or 50 if all completed
        let nextResume = 1;
        while (progress.completedLevels.includes(nextResume) && nextResume < 50) {
            nextResume += 1;
        }
        progress.resumeLevel = nextResume;

        let xpAwarded = 0;
        if (isNewCompletion) {
            xpAwarded = LEVEL_XP[progressionLevel] || 50;
            progress.xpEarned += xpAwarded;
            await User.findByIdAndUpdate(userId, { $inc: { xp: xpAwarded } });
        }

        await progress.save();

        const bestTimes = {};
        for (const [key, value] of progress.bestTimes.entries()) {
            bestTimes[key] = value;
        }

        const bestMoves = {};
        for (const [key, value] of progress.bestMoves.entries()) {
            bestMoves[key] = value;
        }

        return res.json({
            success: true,
            data: {
                saved: true,
                isGuest: false,
                completedLevels: progress.completedLevels,
                bestTimes,
                bestMoves,
                resumeLevel: progress.resumeLevel,
                xpAwarded,
                xpEarned: progress.xpEarned,
                nextLevel: Math.min(progressionLevel + 1, 50)
            }
        });
    })
);

module.exports = router;

