"use strict";

/* Estimate It — Unit Tests
   Tests pure game logic: percentage error, multipliers, XP,
   chip validation, round protection, suffix parsing, daily determinism.
   Run with: node tests/estimate-it.test.js */

const assert = require("node:assert/strict");
const {
    calculatePercentageError, getTier, calculateXp,
    validateBet, maxBetForRound, parseEstimate,
    seededIndices, fnv1a,
    TOTAL_ROUNDS, TOTAL_CHIPS, MIN_BET, MAX_BET
} = require("../backend/games/estimateIt/logic");

console.log("Running Estimate It unit tests...\n");

// ── 1. Percentage Error Calculation ─────────────────────────
{
    console.log("Testing percentage error calculation...");

    assert.equal(calculatePercentageError(980, 1000), 2);
    assert.equal(calculatePercentageError(1020, 1000), 2);
    assert.equal(calculatePercentageError(500, 1000), 50);
    assert.equal(calculatePercentageError(1500, 1000), 50);
    assert.equal(calculatePercentageError(1000, 1000), 0);
    assert.equal(calculatePercentageError(0, 1000), 100);
    assert.equal(calculatePercentageError(2000, 1000), 100);

    // Extreme values
    assert.equal(calculatePercentageError(1e9, 2e9), 50);
    assert.equal(calculatePercentageError(0, 0), 0);

    console.log("  ✓ Percentage error calculation passed");
}

// ── 2. XP Multiplier Boundaries ─────────────────────────────
{
    console.log("Testing multiplier boundaries...");

    // <2% → 5× (BULLSEYE)
    assert.equal(getTier(0).multiplier, 5);
    assert.equal(getTier(1.0).multiplier, 5);
    assert.equal(getTier(1.99).multiplier, 5);
    assert.equal(getTier(0).label, "BULLSEYE");

    // 2–5% → 3× (EXCELLENT)
    assert.equal(getTier(2.0).multiplier, 3);
    assert.equal(getTier(3.5).multiplier, 3);
    assert.equal(getTier(4.99).multiplier, 3);
    assert.equal(getTier(2.0).label, "EXCELLENT");

    // 5–20% → 2× (GOOD GUESS)
    assert.equal(getTier(5.0).multiplier, 2);
    assert.equal(getTier(10.0).multiplier, 2);
    assert.equal(getTier(19.99).multiplier, 2);
    assert.equal(getTier(5.0).label, "GOOD GUESS");

    // 20–50% → 1× (IN THE BALLPARK)
    assert.equal(getTier(20.0).multiplier, 1);
    assert.equal(getTier(35.0).multiplier, 1);
    assert.equal(getTier(49.99).multiplier, 1);
    assert.equal(getTier(50.0).multiplier, 1);
    assert.equal(getTier(20.0).label, "IN THE BALLPARK");

    // >50% → 0× (WAY OFF)
    assert.equal(getTier(50.01).multiplier, 0);
    assert.equal(getTier(75.0).multiplier, 0);
    assert.equal(getTier(100.0).multiplier, 0);
    assert.equal(getTier(500.0).multiplier, 0);
    assert.equal(getTier(50.01).label, "WAY OFF");

    console.log("  ✓ Multiplier boundaries passed");
}

// ── 3. XP Calculation ───────────────────────────────────────
{
    console.log("Testing XP calculation...");

    // 100 chips = 10 base XP
    // bet=300, multiplier=5 → 10 * 3 * 5 = 150 XP
    assert.equal(calculateXp(300, 5), 150);

    // bet=250, multiplier=2 → 10 * 2.5 * 2 = 50 XP
    assert.equal(calculateXp(250, 2), 50);

    // bet=100, multiplier=3 → 10 * 1 * 3 = 30 XP
    assert.equal(calculateXp(100, 3), 30);

    // bet=400, multiplier=0 → 0 XP
    assert.equal(calculateXp(400, 0), 0);

    // bet=150, multiplier=1 → 10 * 1.5 * 1 = 15 XP
    assert.equal(calculateXp(150, 1), 15);

    // bet=400, multiplier=5 → 10 * 4 * 5 = 200 XP
    assert.equal(calculateXp(400, 5), 200);

    console.log("  ✓ XP calculation passed");
}

// ── 4. Chip Bet Validation ──────────────────────────────────
{
    console.log("Testing chip validation...");

    // Valid bets in round 1 (1000 chips remaining)
    // Max bet is min(400, 1000 - 4*100) = min(400, 600) = 400
    for (const validBet of [100, 150, 200, 250, 300, 350, 400]) {
        assert.equal(validateBet(validBet, 1000, 1), true, `Bet ${validBet} should be valid`);
    }

    // Invalid bets (not increment of 50, out of range, etc.)
    assert.equal(validateBet(50, 1000, 1), false, "50 is below minimum");
    assert.equal(validateBet(125, 1000, 1), false, "125 is not multiple of 50");
    assert.equal(validateBet(175, 1000, 1), false, "175 is not multiple of 50");
    assert.equal(validateBet(425, 1000, 1), false, "425 exceeds max");
    assert.equal(validateBet(450, 1000, 1), false, "450 exceeds max");
    assert.equal(validateBet(0, 1000, 1), false, "0 is invalid");
    assert.equal(validateBet(-100, 1000, 1), false, "Negative is invalid");
    assert.equal(validateBet("200", 1000, 1), false, "String is invalid");
    assert.equal(validateBet(NaN, 1000, 1), false, "NaN is invalid");

    console.log("  ✓ Chip validation passed");
}

// ── 5. Last-Round Protection ────────────────────────────────
{
    console.log("Testing last-round protection...");

    // Player bets 400 in round 1: remaining = 600
    // Round 2: 3 rounds left after (R3, R4, R5), needs 300 reserved
    // maxBet = min(400, 600 - 300) = 300
    assert.equal(maxBetForRound(600, 2), 300);

    // Player bets 300 in round 2: remaining = 300
    // Round 3: 2 rounds left after (R4, R5), needs 200 reserved
    // maxBet = min(400, 300 - 200) = 100
    assert.equal(maxBetForRound(300, 3), 100);

    // Player must bet 100 in round 3: remaining = 200
    // Round 4: 1 round left after (R5), needs 100 reserved
    // maxBet = min(400, 200 - 100) = 100
    assert.equal(maxBetForRound(200, 4), 100);

    // Round 5: player MUST bet all remaining chips
    assert.equal(maxBetForRound(100, 5), 100);
    assert.equal(validateBet(100, 100, 5), true);
    assert.equal(validateBet(50, 100, 5), false, "Must bet ALL remaining in round 5");
    assert.equal(validateBet(200, 100, 5), false, "Cannot bet more than remaining in round 5");

    // Scenario: Aggressive bets 400 + 400
    // Start: 1000
    // R1 bet 400 → remaining 600
    // R2 max is 300, NOT 400 (because 3 rounds left = 300 reserve)
    assert.equal(validateBet(400, 600, 2), false, "Cannot bet 400 in round 2 with 600 chips");
    assert.equal(validateBet(300, 600, 2), true);

    // Verify player can ALWAYS reach round 5 with at least 100 chips
    // Simulate maximum possible bets:
    let chips = 1000;
    for (let round = 1; round <= 4; round++) {
        const max = maxBetForRound(chips, round);
        assert.ok(max >= 100, `Round ${round} must allow at least min bet`);
        chips -= max;
    }
    assert.ok(chips >= 100, `Round 5 must have at least 100 chips (had ${chips})`);

    console.log("  ✓ Last-round protection passed");
}

// ── 6. Estimate Input Parsing ───────────────────────────────
{
    console.log("Testing estimate input parsing...");

    // Plain numbers
    assert.equal(parseEstimate("1000"), 1000);
    assert.equal(parseEstimate("0"), 0);
    assert.equal(parseEstimate("3.14"), 3.14);

    // Commas
    assert.equal(parseEstimate("1,000"), 1000);
    assert.equal(parseEstimate("1,000,000"), 1000000);
    assert.equal(parseEstimate("2,250,000,000"), 2250000000);

    // Suffixes
    assert.equal(parseEstimate("500k"), 500000);
    assert.equal(parseEstimate("500K"), 500000);
    assert.equal(parseEstimate("2.2M"), 2200000);
    assert.equal(parseEstimate("1.5B"), 1500000000);
    assert.equal(parseEstimate("1.5 b"), 1500000000);
    assert.equal(parseEstimate("1T"), 1e12);

    // Whitespace
    assert.equal(parseEstimate("  42  "), 42);

    // Invalid input
    assert.equal(parseEstimate(""), null);
    assert.equal(parseEstimate("   "), null);
    assert.equal(parseEstimate(null), null);
    assert.equal(parseEstimate(undefined), null);
    assert.equal(parseEstimate("abc"), null);
    assert.equal(parseEstimate("-50"), null);
    assert.equal(parseEstimate("NaN"), null);
    assert.equal(parseEstimate("Infinity"), null);

    console.log("  ✓ Estimate parsing passed");
}

// ── 7. Daily Determinism ────────────────────────────────────
{
    console.log("Testing daily determinism...");

    const poolSize = 4000;
    const date1 = "2026-09-19";
    const date2 = "2026-09-20";

    // Same date always produces the same 5 indices
    const indices1a = seededIndices(date1, poolSize, 5);
    const indices1b = seededIndices(date1, poolSize, 5);
    assert.deepEqual(indices1a, indices1b, "Same date must produce identical indices");

    // Exactly 5 unique indices
    assert.equal(indices1a.length, 5);
    assert.equal(new Set(indices1a).size, 5, "All 5 indices within a day must be unique");

    // All indices in valid range
    for (const idx of indices1a) {
        assert.ok(idx >= 0 && idx < poolSize, `Index ${idx} out of range [0, ${poolSize})`);
    }

    // Different dates produce different sets
    const indices2 = seededIndices(date2, poolSize, 5);
    assert.notDeepEqual(indices1a, indices2, "Different dates should produce different indices");

    // Test across 100 consecutive days: all produce 5 unique indices
    const allSeen = new Set();
    const baseDate = new Date("2026-01-01");
    for (let d = 0; d < 100; d++) {
        const dateStr = new Date(baseDate.getTime() + d * 86400000).toISOString().slice(0, 10);
        const dailyIndices = seededIndices(dateStr, poolSize, 5);
        assert.equal(dailyIndices.length, 5);
        assert.equal(new Set(dailyIndices).size, 5, `Day ${dateStr} has duplicates`);
    }

    console.log("  ✓ Daily determinism passed");
}

console.log("\nAll Estimate It unit tests PASSED! ✓\n");

