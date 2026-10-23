"use strict";

/**
 * PUZZLE QUEST PROGRESS SERVICE
 * Handles guest in-memory state vs authenticated MongoDB profile sync.
 * Guests do NOT persist across browser reload/fresh visit.
 */

window.PuzzleQuestProgress = (() => {
    let state = {
        isGuest: true,
        completedLevels: [],
        bestTimes: {},
        bestMoves: {},
        bestStars: {},
        resumeLevel: 1,
        xpEarned: 0
    };

    /**
     * Load progress on startup.
     */
    async function load() {
        try {
            if (window.GamingSession) {
                await window.GamingSession.ready;
                const res = await window.GamingSession.fetch(
                    `${window.GamingSession.apiOrigin}/api/v1/puzzle-quest/progress`
                );
                if (res.ok) {
                    const json = await res.json();
                    if (json.success && json.data) {
                        state.isGuest = json.data.isGuest;
                        state.completedLevels = json.data.completedLevels || [];
                        state.bestTimes = json.data.bestTimes || {};
                        state.bestMoves = json.data.bestMoves || {};
                        state.bestStars = json.data.bestStars || {};
                        state.resumeLevel = json.data.resumeLevel || 1;
                        state.xpEarned = json.data.xpEarned || 0;
                        return state;
                    }
                }
            }
        } catch (_err) {
            // Fallback to guest in-memory default
        }
        return state;
    }

    /**
     * Determine if a level is unlocked.
     * Level 1 is always unlocked.
     * Level N is unlocked if level N - 1 is completed.
     * Completed levels are always replayable.
     */
    function isLevelUnlocked(progressionLevel) {
        const mode = window.PUZZLE_QUEST_CONFIG?.UNLOCK_MODE || "sequential";
        if (mode === "all") {
            return true; // All levels unlocked if explicitly configured
        }
        if (progressionLevel <= 1) return true;
        if (state.completedLevels.includes(progressionLevel)) return true;
        return state.completedLevels.includes(progressionLevel - 1);
    }

    /**
     * Check if a level is completed.
     */
    function isLevelCompleted(progressionLevel) {
        return state.completedLevels.includes(progressionLevel);
    }

    /**
     * Save level completion.
     */
    async function recordCompletion(progressionLevel, timeTaken, moves = null, stars = null) {
        // Update in-memory state immediately
        const isNewCompletion = !state.completedLevels.includes(progressionLevel);
        if (isNewCompletion) {
            state.completedLevels.push(progressionLevel);
            state.completedLevels.sort((a, b) => a - b);
            const xpForLvl = window.LEVEL_XP ? window.LEVEL_XP[progressionLevel] : 50;
            state.xpEarned = (state.xpEarned || 0) + xpForLvl;
        }

        const lvlKey = String(progressionLevel);
        if (timeTaken > 0 && (!state.bestTimes[lvlKey] || timeTaken < state.bestTimes[lvlKey])) {
            state.bestTimes[lvlKey] = timeTaken;
        }

        if (moves !== null && (!state.bestMoves[lvlKey] || moves < state.bestMoves[lvlKey])) {
            state.bestMoves[lvlKey] = moves;
        }

        if (stars !== null && (!state.bestStars[lvlKey] || stars > state.bestStars[lvlKey])) {
            state.bestStars[lvlKey] = stars;
        }

        // Compute resume level (lowest uncompleted level)
        let nextResume = 1;
        while (state.completedLevels.includes(nextResume) && nextResume < 50) {
            nextResume += 1;
        }
        state.resumeLevel = nextResume;

        // If signed in, sync with backend API
        if (!state.isGuest && window.GamingSession) {
            try {
                const res = await window.GamingSession.fetch(
                    `${window.GamingSession.apiOrigin}/api/v1/puzzle-quest/progress`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            progressionLevel,
                            timeTaken,
                            moves,
                            stars
                        })
                    }
                );
                if (res.ok) {
                    const json = await res.json();
                    if (json.success && json.data) {
                        state.completedLevels = json.data.completedLevels || state.completedLevels;
                        state.resumeLevel = json.data.resumeLevel || state.resumeLevel;
                        if (typeof json.data.xpEarned === "number") {
                            state.xpEarned = json.data.xpEarned;
                        }
                    }
                }
            } catch (_err) {
                // Ignore network error; in-memory update already done
            }
        }

        return state;
    }

    function getState() {
        return { ...state };
    }

    return {
        init: load,
        load,
        isLevelUnlocked,
        isLevelCompleted,
        recordCompletion,
        completeLevel: recordCompletion,
        getState,
        getProgress: getState
    };
})();

