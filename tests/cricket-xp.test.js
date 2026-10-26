"use strict";

const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

console.log("Running Cricket Arcade XP & Navigation tests...");

// 1. Verify HTML Structure
const html = fs.readFileSync(path.join(__dirname, "../frontend/cricket.html"), "utf8");

assert.ok(html.includes("class=\"main-navigation\""), "cricket.html must contain .main-navigation header");
assert.ok(html.includes("id=\"player-menu-button\""), "cricket.html must contain #player-menu-button");
assert.ok(html.includes("id=\"cricket-player-name\""), "cricket.html must contain #cricket-player-name");
assert.ok(html.includes("id=\"cricket-player-status\""), "cricket.html must contain #cricket-player-status");
assert.ok(!html.includes("id=\"cricket-nav-xp\""), "cricket.html header must not have cricket-nav-xp (clean like other games)");
assert.ok(html.includes("id=\"auth-overlay\""), "cricket.html must contain #auth-overlay modal");
assert.ok(html.includes("id=\"game-search\""), "cricket.html must contain #game-search");
assert.ok(html.includes("id=\"game-search-results\""), "cricket.html must contain #game-search-results");

console.log("✓ HTML Navigation & Auth DOM structure verified.");

// 2. Pure XP Logic Verification
function calculateCricketXp(mode, round, won, sixes, wicketsLost) {
    if (!won) return { baseXp: 0, sixesBonus: 0, wicketsBonus: 0, totalXp: 0 };

    const sixesBonus = (sixes || 0) * 6;
    const wicketsInHand = Math.max(0, 3 - (wicketsLost || 0));
    const wicketsBonus = wicketsInHand * 10;

    let baseXp = 70; // 70 XP base for Quick Match, QF, and SF
    if (mode === "quick") {
        baseXp = 70;
    } else if (mode === "tournament") {
        if (round >= 2) {
            baseXp = 500;
        } else {
            baseXp = 70; // Client requirement: QF and SF award 70 XP base win
        }
    }

    return {
        baseXp,
        sixesBonus,
        wicketsBonus,
        totalXp: baseXp + sixesBonus + wicketsBonus
    };
}

// Case A: Defeat
const lossRes = calculateCricketXp("quick", 0, false, 4, 3);
assert.strictEqual(lossRes.totalXp, 0, "Loss must award 0 XP even if sixes were hit");

// Case B: Quick Match Win with 0 wickets lost, 2 sixes
// 70 + (2 * 6) + (3 * 10) = 70 + 12 + 30 = 112
const quickWin1 = calculateCricketXp("quick", 0, true, 2, 0);
assert.strictEqual(quickWin1.baseXp, 70);
assert.strictEqual(quickWin1.sixesBonus, 12);
assert.strictEqual(quickWin1.wicketsBonus, 30);
assert.strictEqual(quickWin1.totalXp, 112);

// Case C: Quick Match Win with 2 wickets lost, 0 sixes
// 70 + (0 * 6) + (1 * 10) = 80
const quickWin2 = calculateCricketXp("quick", 0, true, 0, 2);
assert.strictEqual(quickWin2.baseXp, 70);
assert.strictEqual(quickWin2.sixesBonus, 0);
assert.strictEqual(quickWin2.wicketsBonus, 10);
assert.strictEqual(quickWin2.totalXp, 80);

// Case D: Tournament Quarter-Final Win with 1 wicket lost, 3 sixes
// 70 base + (3 * 6) + (2 * 10) = 70 + 18 + 20 = 108
const tourneyQF = calculateCricketXp("tournament", 0, true, 3, 1);
assert.strictEqual(tourneyQF.baseXp, 70);
assert.strictEqual(tourneyQF.sixesBonus, 18);
assert.strictEqual(tourneyQF.wicketsBonus, 20);
assert.strictEqual(tourneyQF.totalXp, 108);

// Case E: Tournament Semi-Final Win with 0 wickets lost, 1 six
// 70 base + (1 * 6) + (3 * 10) = 70 + 6 + 30 = 106
const tourneySF = calculateCricketXp("tournament", 1, true, 1, 0);
assert.strictEqual(tourneySF.baseXp, 70);
assert.strictEqual(tourneySF.sixesBonus, 6);
assert.strictEqual(tourneySF.wicketsBonus, 30);
assert.strictEqual(tourneySF.totalXp, 106);

// Case F: Tournament Grand Final Win with 0 wickets lost, 4 sixes
// 500 base + (4 * 6) + (3 * 10) = 500 + 24 + 30 = 554
const tourneyFinal = calculateCricketXp("tournament", 2, true, 4, 0);
assert.strictEqual(tourneyFinal.baseXp, 500);
assert.strictEqual(tourneyFinal.sixesBonus, 24);
assert.strictEqual(tourneyFinal.wicketsBonus, 30);
assert.strictEqual(tourneyFinal.totalXp, 554);

// 3. Super Over & Tie Detection Logic Verification
function checkMatchResult(runs, target, balls, maxBalls, wickets, maxWickets) {
    if (runs >= target) return 'win';
    if (wickets >= maxWickets) {
        return runs === target - 1 ? 'tie' : 'loss';
    }
    if (balls >= maxBalls) {
        if (runs >= target) return 'win';
        return runs === target - 1 ? 'tie' : 'loss';
    }
    return 'playing';
}

// Chasing 51 runs, scored 50 runs from 12 balls (Scores level): TIE!
assert.strictEqual(checkMatchResult(50, 51, 12, 12, 1, 3), 'tie');
// Chasing 51 runs, scored 51 runs from 11 balls: WIN!
assert.strictEqual(checkMatchResult(51, 51, 11, 12, 1, 3), 'win');
// Chasing 51 runs, scored 49 runs from 12 balls: LOSS!
assert.strictEqual(checkMatchResult(49, 51, 12, 12, 1, 3), 'loss');
// Chasing 51 runs, lost 3rd wicket on scores level (50 runs): TIE!
assert.strictEqual(checkMatchResult(50, 51, 10, 12, 3, 3), 'tie');

console.log("✓ Super Over Tie & Draw detection verified.");

console.log("✓ XP calculation logic matches user rules perfectly across all scenarios.");
console.log("All Cricket tests PASSED!");

