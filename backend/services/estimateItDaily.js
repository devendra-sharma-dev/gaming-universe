/* Estimate It — Daily question assignment service */

const EstimateItQuestion = require("../models/EstimateItQuestion");
const { TOTAL_ROUNDS, seededIndices } = require("../games/estimateIt/logic");

const getGameDate = (now = new Date()) => now.toISOString().slice(0, 10);

/**
 * Returns 5 questions for the given date. If not yet assigned,
 * atomically picks 5 unused questions using a deterministic seed
 * and marks them with `usedInGameDate`. Race-safe: if two players
 * hit simultaneously, the second call sees the already-assigned set.
 */
const getOrAssignDailyQuestions = async (gameDate = getGameDate()) => {
    // Check if already assigned for this date
    const existing = await EstimateItQuestion.find({ usedInGameDate: gameDate })
        .sort({ _id: 1 })
        .select("question answer category unit")
        .lean();

    if (existing.length === TOTAL_ROUNDS) return existing;

    // Get unused question pool (only _id for index selection)
    const pool = await EstimateItQuestion.find({ usedInDailyGame: false })
        .sort({ _id: 1 })
        .select("_id")
        .lean();

    if (pool.length < TOTAL_ROUNDS) {
        throw new Error(`Not enough unused Estimate It questions. Need ${TOTAL_ROUNDS}, have ${pool.length}.`);
    }

    // Deterministic selection using date-based seed
    const indices = seededIndices(gameDate, pool.length, TOTAL_ROUNDS);
    const selectedIds = indices.map(i => pool[i]._id);

    // Atomically mark questions — only update if still unused (race-safe)
    await EstimateItQuestion.bulkWrite(selectedIds.map(id => ({
        updateOne: {
            filter: { _id: id, usedInDailyGame: false },
            update: { $set: { usedInDailyGame: true, usedInGameDate: gameDate } }
        }
    })));

    // Re-fetch the assigned questions (handles partial race conditions)
    const assigned = await EstimateItQuestion.find({ usedInGameDate: gameDate })
        .sort({ _id: 1 })
        .select("question answer category unit")
        .lean();

    if (assigned.length < TOTAL_ROUNDS) {
        throw new Error(`Estimate It daily assignment failed for ${gameDate}. Only ${assigned.length} questions assigned.`);
    }

    return assigned.slice(0, TOTAL_ROUNDS);
};

module.exports = { getGameDate, getOrAssignDailyQuestions };

