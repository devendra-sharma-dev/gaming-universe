"use strict";

const crypto = require("crypto");
const {
    getCountryByCode,
    getCountryProfile,
    selectOpponents
} = require("./countries");

const EVENTS = [
    {
        id: "archery",
        name: "Archery",
        number: 1,
        focus: "Precision & Aim",
        description: "5 precision shots at a moving concentric target."
    },
    {
        id: "sprint",
        name: "100m Sprint",
        number: 2,
        focus: "Reaction & Rhythm",
        description: "React to the start signal and keep a steady stride cadence to the finish line."
    },
    {
        id: "tableTennis",
        name: "Table Tennis",
        number: 3,
        focus: "Reflexes & Rally Consistency",
        description: "Return rapid drives inside the optimal timing window to sustain rallies."
    },
    {
        id: "weightlifting",
        name: "Weightlifting",
        number: 4,
        focus: "Timing & Power",
        description: "Nine progressive levels from 140kg to 220kg with 2 chances per level. Fewer failed attempts break ties."
    },
    {
        id: "fencing",
        name: "Fencing",
        number: 5,
        focus: "Decisions & Response Speed",
        description: "10 swift tactical exchanges. Read the attack and counter appropriately."
    }
];

const WEIGHTLIFTING_LEVELS = [140, 150, 160, 170, 180, 190, 200, 210, 220];

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

/**
 * Normalizes raw event metrics into a score between 0 and 100.
 * @param {string} eventId
 * @param {object} metrics
 * @returns {number} normalized score [0, 100]
 */
const normalizeScore = (eventId, metrics = {}) => {
    if (!metrics) return 0;

    switch (eventId) {
        case "archery": {
            // Raw score up to 50 pts (5 shots * 10 max), or legacy 500
            const raw = Number(metrics.rawScore) || 0;
            if (raw > 50) {
                return clamp(Math.round((raw / 500) * 100), 0, 100);
            }
            return clamp(Math.round((raw / 50) * 100), 0, 100);
        }

        case "sprint": {
            // Raw finish time in seconds (e.g. 9.50s to 15.00s) + rhythm accuracy
            const finishTime = Number(metrics.finishTime);
            const rhythmAccuracy = clamp(Number(metrics.rhythmAccuracy) || 0, 0, 100);
            if (Number.isFinite(finishTime) && finishTime > 0) {
                // 9.50s or faster -> 100 pts; 14.50s or slower -> 40 pts
                const timeScore = clamp(100 - ((finishTime - 9.50) / (14.50 - 9.50)) * 60, 20, 100);
                const combined = Math.round(timeScore * 0.75 + rhythmAccuracy * 0.25);
                return clamp(combined, 0, 100);
            }
            // Fallback if only stride score provided
            const rawStride = Number(metrics.rawScore) || 0;
            return clamp(Math.round(rawStride), 0, 100);
        }

        case "tableTennis": {
            if (metrics.knockoutRank !== undefined) {
                const kRank = Number(metrics.knockoutRank);
                if (kRank === 1) return 100;
                if (kRank === 2) return 92;
                if (kRank === 3) return 86;
                if (kRank === 4) return 80;
                if (kRank <= 8) return clamp(75 - (kRank - 5) * 2, 68, 75);
                return clamp(55 - (kRank - 9) * 2, 40, 55);
            }

            // Successful returns, longest rally, timing accuracy
            const returns = Math.max(0, Number(metrics.successfulReturns) || 0);
            const maxRally = Math.max(0, Number(metrics.maxRally) || 0);
            const accuracy = clamp(Number(metrics.accuracy) || 0, 0, 100);

            // e.g. 15 returns is outstanding (approx 60 pts), rally adds up to 25 pts, accuracy up to 15 pts
            const returnPts = Math.min(60, returns * 4);
            const rallyPts = Math.min(25, maxRally * 2.5);
            const accPts = (accuracy / 100) * 15;
            const combined = Math.round(returnPts + rallyPts + accPts);
            return clamp(combined, 0, 100);
        }

        case "weightlifting": {
            // Best successful weight across 9 levels (140kg - 220kg) + fail tie-break adjustment
            const bestWeight = Math.max(0, Number(metrics.bestLiftKg) || 0);
            const totalFails = Math.max(0, Number(metrics.totalFails) || 0);
            const precisionBonus = clamp(Number(metrics.precisionBonus) || 0, 0, 10);
            if (bestWeight === 0) return 0;

            let baseScore = 0;
            if (bestWeight >= 220) {
                baseScore = 90;
            } else if (bestWeight >= 140) {
                baseScore = 60 + ((bestWeight - 140) / (220 - 140)) * 30;
            } else {
                baseScore = (bestWeight / 140) * 55;
            }
            const failPenalty = Math.min(8, totalFails * 0.5);
            return clamp(Math.round(baseScore + precisionBonus - failPenalty), 0, 100);
        }

        case "fencing": {
            // 10 exchanges: correct decisions count + reaction speed
            const correctCount = clamp(Number(metrics.correctCount) || 0, 0, 10);
            const avgReactionMs = Number(metrics.avgReactionMs) || 1200; // e.g. 300ms to 1200ms
            // Correct decisions account for 75% of score
            const decisionPts = correctCount * 7.5;
            // Reaction speed account for up to 25% if correct > 0
            const speedFactor = clamp((1200 - avgReactionMs) / (1200 - 350), 0, 1);
            const speedPts = correctCount > 0 ? speedFactor * 25 : 0;
            return clamp(Math.round(decisionPts + speedPts), 0, 100);
        }

        default:
            return clamp(Math.round(Number(metrics.rawScore) || 0), 0, 100);
    }
};

/**
 * Deterministic or controlled random number generator for opponent variations.
 * Box-Muller transform for normal distribution.
 */
const normalRandom = (randomFn = Math.random) => {
    let u = 0;
    let v = 0;
    while (u === 0) u = randomFn();
    while (v === 0) v = randomFn();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};

/**
 * Formats the realistic sport metric (points, seconds, returns, kg, hits)
 * for the event scoreboard display.
 */
const formatEventMetric = (eventId, normalizedScore, metrics = {}) => {
    switch (eventId) {
        case "archery": {
            if (metrics.rawScore !== undefined) {
                const raw = Number(metrics.rawScore);
                const pts = raw > 50 ? Math.round(raw / 10) : raw;
                return `${pts} / 50 pts`;
            }
            const pts = clamp(Math.round((normalizedScore / 100) * 50), 0, 50);
            return `${pts} / 50 pts`;
        }
        case "sprint": {
            if (metrics.finishTime !== undefined) {
                return `${Number(metrics.finishTime).toFixed(2)} s`;
            }
            const sec = 14.50 - ((normalizedScore - 20) / 80) * (14.50 - 9.50);
            return `${clamp(sec, 9.50, 14.50).toFixed(2)} s`;
        }
        case "tableTennis": {
            if (metrics.stageName) {
                return metrics.stageName;
            }
            if (metrics.tournamentFinish) {
                return metrics.tournamentFinish;
            }
            if (metrics.knockoutRank !== undefined) {
                const kr = Number(metrics.knockoutRank);
                if (kr === 1) return "🥇 Gold Champion";
                if (kr === 2) return "🥈 Silver Finalist";
                if (kr === 3) return "🥉 Bronze Winner";
                if (kr === 4) return "4th Place (Semi-Finals)";
                if (kr <= 8) return "Quarter-Finalist";
                return "Round of 16";
            }
            if (metrics.successfulReturns !== undefined) {
                return `${metrics.successfulReturns} returns`;
            }
            const ret = Math.max(2, Math.round((normalizedScore / 100) * 16));
            return `${ret} returns`;
        }
        case "weightlifting": {
            const bestKg = metrics.bestLiftKg !== undefined ? Number(metrics.bestLiftKg) : Math.round(normalizedScore >= 60 ? 140 + ((normalizedScore - 60) / 40) * 80 : 0);
            const fails = metrics.totalFails !== undefined ? Number(metrics.totalFails) : null;
            if (fails !== null && fails !== undefined) {
                return `${bestKg} kg (${fails} ${fails === 1 ? "fail" : "fails"})`;
            }
            return `${bestKg} kg`;
        }
        case "fencing": {
            if (metrics.correctCount !== undefined) {
                return `${metrics.correctCount} / 10 hits`;
            }
            const hits = Math.min(10, Math.max(1, Math.round((normalizedScore / 100) * 10)));
            return `${hits} / 10 hits`;
        }
        default:
            return `${normalizedScore} pts`;
    }
};

/**
 * Simulates scores for the 15 opponents for a given event.
 * Uses country rating + controlled variance.
 */
const simulateOpponentScores = (eventId, opponents, randomFn = Math.random) => {
    return opponents.map((opp) => {
        const profile = getCountryProfile(opp.code);

        if (eventId === "weightlifting") {
            const rating = profile.weightlifting || 75;
            let bestLiftKg = 0;
            let totalFails = 0;
            const attempts = [];
            let eliminated = false;

            // Calibrated Olympic progression:
            // Naturally estimates ~1 country reaching 220kg and ~2 reaching 210kg.
            // 220kg is never cleared on Chance 1 with 0 fails, guaranteeing Gold for a flawless player.
            const baseProb1 = [0.96, 0.92, 0.86, 0.78, 0.68, 0.54, 0.38, 0.22, 0.00];
            const baseProb2 = [0.85, 0.80, 0.75, 0.68, 0.60, 0.48, 0.36, 0.25, 0.46];
            const diffs =     [  42,   48,   54,   60,   66,   72,   78,   84,   85];

            for (let i = 0; i < WEIGHTLIFTING_LEVELS.length; i++) {
                const weight = WEIGHTLIFTING_LEVELS[i];
                if (eliminated) {
                    attempts.push({ weight, status: "—", resultText: "—", fails: 0, cleared: false });
                    continue;
                }

                // Chance 1: 220kg is 0 on 1st attempt so opponents cannot clear 220kg with 0 fails
                const prob1 = i === 8 ? 0 : clamp(baseProb1[i] + (rating - diffs[i]) * 0.015 + normalRandom(randomFn) * 0.03, 0.05, 0.98);
                const roll1 = randomFn();

                if (prob1 > 0 && roll1 <= prob1) {
                    bestLiftKg = weight;
                    attempts.push({ weight, status: "⚪", resultText: "⚪", fails: 0, cleared: true });
                } else {
                    totalFails += 1;
                    // Chance 2:
                    const prob2 = i === 8
                        ? clamp(baseProb2[i] + (rating - diffs[i]) * 0.025 + normalRandom(randomFn) * 0.02, 0.10, 0.65)
                        : clamp(baseProb2[i] + (rating - diffs[i]) * 0.015 + normalRandom(randomFn) * 0.02, 0.10, 0.85);
                    const roll2 = randomFn();
                    if (roll2 <= prob2) {
                        bestLiftKg = weight;
                        attempts.push({ weight, status: "🔴⚪", resultText: "🔴⚪", fails: 1, cleared: true });
                    } else {
                        totalFails += 1;
                        attempts.push({ weight, status: "🔴🔴", resultText: "🔴🔴", fails: 2, cleared: false });
                        eliminated = true;
                    }
                }
            }

            const simulatedScore = normalizeScore("weightlifting", { bestLiftKg, totalFails });
            const metricDisplay = formatEventMetric("weightlifting", simulatedScore, { bestLiftKg, totalFails });

            return {
                code: opp.code,
                name: opp.name,
                flag: opp.flag,
                normalizedScore: simulatedScore,
                rawScore: bestLiftKg,
                bestLiftKg,
                totalFails,
                attempts,
                metricDisplay,
                isPlayer: false
            };
        }

        if (eventId === "archery") {
            const rating = profile.archery || 75;
            const delta = Math.round(normalRandom(randomFn) * 5.5);
            const clampedDelta = clamp(delta, -14, 14);
            const simulatedScore = clamp(rating + clampedDelta, 42, 98);
            const rawScore = clamp(Math.round((simulatedScore / 100) * 50), 20, 50);
            const metricDisplay = `${rawScore} / 50 pts`;

            return {
                code: opp.code,
                name: opp.name,
                flag: opp.flag,
                normalizedScore: simulatedScore,
                rawScore,
                metricDisplay,
                isPlayer: false
            };
        }

        if (eventId === "sprint") {
            const rating = profile.sprint || 75;
            const delta = normalRandom(randomFn) * 4.5;
            const simulatedScore = clamp(Math.round(rating + delta), 42, 98);
            const sec = 14.50 - ((simulatedScore - 20) / 80) * (14.50 - 9.50);
            const finishTime = Number(clamp(sec, 9.50, 14.50).toFixed(2));
            const metricDisplay = `${finishTime.toFixed(2)} s`;

            return {
                code: opp.code,
                name: opp.name,
                flag: opp.flag,
                normalizedScore: simulatedScore,
                rawScore: finishTime,
                finishTime,
                metricDisplay,
                isPlayer: false
            };
        }

        const baseRating = profile[eventId] || 75;
        const delta = Math.round(normalRandom(randomFn) * 5.5);
        const clampedDelta = clamp(delta, -14, 14);
        const simulatedScore = clamp(baseRating + clampedDelta, 42, 98);
        const metricDisplay = formatEventMetric(eventId, simulatedScore);

        return {
            code: opp.code,
            name: opp.name,
            flag: opp.flag,
            normalizedScore: simulatedScore,
            rawScore: simulatedScore,
            metricDisplay,
            isPlayer: false
        };
    });
};

/**
 * Deterministic tie-breaker for event rankings:
 * Sprint: finishTime ascending (lower time in seconds = faster/better).
 * Weightlifting: bestLiftKg descending -> totalFails ascending (fewer fails = higher rank) -> normalizedScore descending -> code ascending.
 * Other events: normalizedScore descending -> rawScore descending -> code ascending.
 */
const compareEventEntries = (a, b, eventId) => {
    if (eventId === "sprint") {
        const aTime = Number(a.finishTime !== undefined ? a.finishTime : (a.metrics?.finishTime || a.rawScore || 999));
        const bTime = Number(b.finishTime !== undefined ? b.finishTime : (b.metrics?.finishTime || b.rawScore || 999));
        if (Math.abs(aTime - bTime) > 0.001) {
            return aTime - bTime; // Lower time ranks higher!
        }
        if (b.normalizedScore !== a.normalizedScore) {
            return b.normalizedScore - a.normalizedScore;
        }
        return a.code.localeCompare(b.code);
    }

    if (eventId === "tableTennis") {
        const aRank = a.knockoutRank !== undefined ? Number(a.knockoutRank) : (a.metrics?.knockoutRank !== undefined ? Number(a.metrics.knockoutRank) : undefined);
        const bRank = b.knockoutRank !== undefined ? Number(b.knockoutRank) : (b.metrics?.knockoutRank !== undefined ? Number(b.metrics.knockoutRank) : undefined);
        if (aRank !== undefined && bRank !== undefined && aRank !== bRank) {
            return aRank - bRank;
        }
        if (b.normalizedScore !== a.normalizedScore) {
            return b.normalizedScore - a.normalizedScore;
        }
        return a.code.localeCompare(b.code);
    }

    if (eventId === "weightlifting") {
        const aLift = Number(a.bestLiftKg !== undefined ? a.bestLiftKg : a.rawScore || 0);
        const bLift = Number(b.bestLiftKg !== undefined ? b.bestLiftKg : b.rawScore || 0);
        if (bLift !== aLift) {
            return bLift - aLift;
        }
        // Tie-breaker: fewer failed attempts ranks higher!
        const aFails = Number(a.totalFails !== undefined ? a.totalFails : 99);
        const bFails = Number(b.totalFails !== undefined ? b.totalFails : 99);
        if (aFails !== bFails) {
            return aFails - bFails; // e.g. 3 fails comes before 4 fails (3 - 4 = -1)
        }
        if (b.normalizedScore !== a.normalizedScore) {
            return b.normalizedScore - a.normalizedScore;
        }
        return a.code.localeCompare(b.code);
    }

    if (b.normalizedScore !== a.normalizedScore) {
        return b.normalizedScore - a.normalizedScore;
    }
    const aRaw = Number(a.rawScore || a.normalizedScore);
    const bRaw = Number(b.rawScore || b.normalizedScore);
    if (bRaw !== aRaw) {
        return bRaw - aRaw;
    }
    return a.code.localeCompare(b.code);
};

/**
 * Ranks all 16 participants in an event and allocates medals.
 * @param {string} eventId
 * @param {object} playerResult { code, name, flag, normalizedScore, rawScore, metrics }
 * @param {Array} simulatedOpponents array of 15 opponent objects with normalizedScore
 */
const rankEvent = (eventId, playerResult, simulatedOpponents) => {
    let playerRawScore = Number(playerResult.rawScore) || Number(playerResult.normalizedScore) || 0;
    if (eventId === "archery" && playerRawScore > 100) {
        playerRawScore = clamp(Math.round(playerRawScore / 10), 0, 50);
    }

    const playerMetrics = playerResult.metrics || { rawScore: playerRawScore };
    const playerMetricDisplay = playerResult.metricDisplay || formatEventMetric(eventId, playerResult.normalizedScore, playerMetrics);

    const playerBestLift = playerResult.bestLiftKg !== undefined ? playerResult.bestLiftKg : (playerMetrics.bestLiftKg !== undefined ? playerMetrics.bestLiftKg : playerResult.rawScore);
    const playerTotalFails = playerResult.totalFails !== undefined ? playerResult.totalFails : (playerMetrics.totalFails !== undefined ? playerMetrics.totalFails : 0);
    const playerAttempts = playerResult.attempts || playerMetrics.attempts || [];
    const playerFinishTime = playerResult.finishTime !== undefined
        ? playerResult.finishTime
        : (playerMetrics.finishTime !== undefined ? playerMetrics.finishTime : (eventId === "sprint" ? playerResult.rawScore : null));

    const allParticipants = [
        {
            code: playerResult.code,
            name: playerResult.name,
            flag: playerResult.flag,
            normalizedScore: clamp(Number(playerResult.normalizedScore) || 0, 0, 100),
            rawScore: playerRawScore,
            bestLiftKg: Number(playerBestLift) || 0,
            totalFails: Number(playerTotalFails) || 0,
            attempts: playerAttempts,
            finishTime: playerFinishTime !== null && playerFinishTime !== undefined ? Number(playerFinishTime) : undefined,
            knockoutRank: playerResult.knockoutRank !== undefined
                ? Number(playerResult.knockoutRank)
                : (playerMetrics.knockoutRank !== undefined ? Number(playerMetrics.knockoutRank) : undefined),
            metricDisplay: playerMetricDisplay,
            isPlayer: true
        },
        ...simulatedOpponents.map((opp) => ({
            code: opp.code,
            name: opp.name,
            flag: opp.flag,
            normalizedScore: clamp(Number(opp.normalizedScore) || 0, 0, 100),
            rawScore: Number(opp.rawScore || opp.normalizedScore) || 0,
            bestLiftKg: Number(opp.bestLiftKg !== undefined ? opp.bestLiftKg : (opp.rawScore || 0)),
            totalFails: Number(opp.totalFails !== undefined ? opp.totalFails : 0),
            attempts: opp.attempts || [],
            finishTime: opp.finishTime !== undefined ? Number(opp.finishTime) : undefined,
            knockoutRank: opp.knockoutRank !== undefined
                ? Number(opp.knockoutRank)
                : (opp.metrics?.knockoutRank !== undefined ? Number(opp.metrics.knockoutRank) : undefined),
            metricDisplay: opp.metricDisplay || formatEventMetric(eventId, opp.normalizedScore, opp),
            isPlayer: false
        }))
    ];

    allParticipants.sort((a, b) => compareEventEntries(a, b, eventId));

    const rankings = allParticipants.map((entry, index) => {
        const rank = index + 1;
        let medal = null;
        if (rank === 1) medal = "gold";
        else if (rank === 2) medal = "silver";
        else if (rank === 3) medal = "bronze";

        return {
            rank,
            code: entry.code,
            name: entry.name,
            flag: entry.flag,
            normalizedScore: entry.normalizedScore,
            rawScore: entry.rawScore,
            bestLiftKg: entry.bestLiftKg,
            totalFails: entry.totalFails,
            attempts: entry.attempts,
            finishTime: entry.finishTime,
            metricDisplay: entry.metricDisplay,
            medal,
            isPlayer: Boolean(entry.isPlayer)
        };
    });

    const playerEntry = rankings.find((r) => r.isPlayer);

    return {
        eventId,
        rankings,
        playerRank: playerEntry ? playerEntry.rank : 16,
        playerMedal: playerEntry ? playerEntry.medal : null,
        topThree: rankings.slice(0, 3)
    };
};

/**
 * Sorts cumulative standings according to Olympic rules:
 * 1. Gold medals descending
 * 2. Silver medals descending
 * 3. Bronze medals descending
 * 4. Total points descending
 * 5. Deterministic country code ascending
 */
const compareStandings = (a, b) => {
    if (b.gold !== a.gold) return b.gold - a.gold;
    if (b.silver !== a.silver) return b.silver - a.silver;
    if (b.bronze !== a.bronze) return b.bronze - a.bronze;
    if (b.totalMedals !== a.totalMedals) return b.totalMedals - a.totalMedals;
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    return a.code.localeCompare(b.code);
};

/**
 * Initializes empty cumulative standings for the 16 participating countries.
 */
const initializeStandings = (participants, playerCode) => {
    return participants.map((c) => ({
        code: c.code,
        name: c.name,
        flag: c.flag,
        gold: 0,
        silver: 0,
        bronze: 0,
        totalMedals: 0,
        totalPoints: 0,
        isPlayer: c.code === playerCode
    }));
};

/**
 * Updates cumulative standings with results from an event.
 */
const updateStandingsWithEvent = (currentStandings, eventResult) => {
    const standingsMap = new Map(currentStandings.map((s) => [s.code, { ...s }]));

    for (const ranking of eventResult.rankings) {
        const entry = standingsMap.get(ranking.code);
        if (entry) {
            if (ranking.medal === "gold") entry.gold += 1;
            else if (ranking.medal === "silver") entry.silver += 1;
            else if (ranking.medal === "bronze") entry.bronze += 1;
            entry.totalMedals = entry.gold + entry.silver + entry.bronze;
            entry.totalPoints += ranking.normalizedScore;
        }
    }

    const updated = Array.from(standingsMap.values());
    updated.sort(compareStandings);

    return updated.map((entry, idx) => ({
        ...entry,
        rank: idx + 1
    }));
};

/**
 * Creates a new competition session.
 * @param {string} playerCountryCode
 * @param {Function} [randomFn] optional PRNG
 */
const createCompetition = (playerCountryCode, randomFn = Math.random) => {
    const playerCountry = getCountryByCode(playerCountryCode);
    if (!playerCountry) {
        throw new Error(`Country code "${playerCountryCode}" is not recognized.`);
    }

    const opponents = selectOpponents(playerCountry.code, 15, randomFn);
    const participants = [playerCountry, ...opponents];

    // Guarantee exactly 16 unique countries
    const uniqueCodes = new Set(participants.map((p) => p.code));
    if (uniqueCodes.size !== 16) {
        throw new Error("Competition must consist of exactly 16 unique countries.");
    }

    const initialStandings = initializeStandings(participants, playerCountry.code).map((s, idx) => ({
        ...s,
        rank: idx + 1
    }));

    return {
        competitionId: crypto.randomUUID(),
        playerCountry,
        opponents,
        participants,
        currentEventIndex: 0,
        totalEvents: EVENTS.length,
        events: EVENTS,
        eventResults: [],
        standings: initialStandings,
        status: "active",
        createdAt: new Date().toISOString()
    };
};

module.exports = {
    EVENTS,
    WEIGHTLIFTING_LEVELS,
    clamp,
    normalizeScore,
    simulateOpponentScores,
    rankEvent,
    initializeStandings,
    updateStandingsWithEvent,
    createCompetition,
    compareStandings,
    formatEventMetric
};

