"use strict";

const assert = require("assert");
const {
    countries,
    getAllCountries,
    getCountryByCode,
    searchCountries,
    getCountryProfile,
    selectOpponents
} = require("../backend/games/miniOlympics/countries");

const {
    EVENTS,
    WEIGHTLIFTING_LEVELS,
    normalizeScore,
    simulateOpponentScores,
    rankEvent,
    initializeStandings,
    updateStandingsWithEvent,
    createCompetition,
    compareStandings
} = require("../backend/games/miniOlympics/engine");

console.log("Running Mini Olympics test suite...\n");

// 1. Worldwide Country Dataset Tests
console.log("1. Testing Worldwide Country Dataset...");
assert(Array.isArray(countries), "countries should be an array");
assert(countries.length >= 195, `Expected >= 195 countries worldwide, got ${countries.length}`);
const codeSet = new Set();
for (const country of countries) {
    assert(country.code && typeof country.code === "string" && country.code.length === 2, `Invalid ISO code for ${JSON.stringify(country)}`);
    assert(country.name && typeof country.name === "string" && country.name.length > 1, `Invalid name for ${country.code}`);
    assert(country.flag && typeof country.flag === "string", `Missing flag for ${country.code}`);
    assert(!codeSet.has(country.code), `Duplicate country code found: ${country.code}`);
    codeSet.add(country.code);
}
assert(getCountryByCode("US") !== null, "Should find US");
assert(getCountryByCode("in") !== null, "Should find IN with lower-case query");
assert(getCountryByCode("AR") !== null, "Should find AR");
assert.strictEqual(getCountryByCode("NON_EXISTENT"), null, "Non-existent code should return null");
console.log(`  ✓ Successfully verified ${countries.length} worldwide countries.`);

// 2. Search Functionality Tests
console.log("2. Testing Country Search...");
const searchArg = searchCountries("arg");
assert(searchArg.some((c) => c.name === "Argentina"), "Search 'arg' should include Argentina");
const searchInd = searchCountries("India");
assert(searchInd.some((c) => c.code === "IN"), "Search 'India' should return IN");
const searchEmpty = searchCountries("");
assert.strictEqual(searchEmpty.length, countries.length, "Empty search should return all countries");
console.log("  ✓ Search functionality passed.");

// 3. Selection Rules & Opponent Exclusion Tests
console.log("3. Testing 16 Strong Sports Nations Selection & Exclusion...");
// When selecting an internal strong nation (e.g. India)
const inOpponents = selectOpponents("IN", 15);
assert.strictEqual(inOpponents.length, 15, "Should have 15 opponents");
assert(!inOpponents.some((o) => o.code === "IN"), "Opponents must NOT contain India");
assert(inOpponents.some((o) => o.code === "NZ"), "Internal selection should include New Zealand");

// When selecting an external nation (e.g. Argentina)
const arOpponents = selectOpponents("AR", 15);
assert.strictEqual(arOpponents.length, 15, "Should have 15 opponents");
assert(!arOpponents.some((o) => o.code === "AR"), "Opponents must NOT contain Argentina");
assert(!arOpponents.some((o) => o.code === "NZ"), "External selection must remove New Zealand");
assert(arOpponents.some((o) => o.code === "IN"), "Must include India in strong opponents");
assert(arOpponents.some((o) => o.code === "US"), "Must include United States in strong opponents");

console.log("  ✓ Opponent selection and 16 strong sports nations rule passed.");

// 4. Exactly 16 Participants Guarantee
console.log("4. Testing 16-Participant Competition Setup...");
const comp = createCompetition("AR");
assert.strictEqual(comp.participants.length, 16, "Must have exactly 16 participants");
assert.strictEqual(comp.opponents.length, 15, "Must have exactly 15 opponents");
assert.strictEqual(comp.playerCountry.code, "AR", "Player country must be AR");
assert(!comp.opponents.some((o) => o.code === "AR"), "Opponents must exclude AR");
const compCodes = new Set(comp.participants.map((p) => p.code));
assert.strictEqual(compCodes.size, 16, "All 16 participant codes must be unique");
console.log("  ✓ Exactly 16 unique participants confirmed.");

// 5. Score Normalization Tests (0 - 100)
console.log("5. Testing Score Normalization for all 5 events...");
// Archery: max 50 (or legacy 500)
assert.strictEqual(normalizeScore("archery", { rawScore: 50 }), 100);
assert.strictEqual(normalizeScore("archery", { rawScore: 25 }), 50);
assert.strictEqual(normalizeScore("archery", { rawScore: 500 }), 100);
assert.strictEqual(normalizeScore("archery", { rawScore: 250 }), 50);
assert.strictEqual(normalizeScore("archery", { rawScore: 0 }), 0);
assert.strictEqual(normalizeScore("archery", { rawScore: 600 }), 100, "Clamp to 100");

// Sprint: finish time (e.g. 9.58s) & rhythm
const sprintGood = normalizeScore("sprint", { finishTime: 9.60, rhythmAccuracy: 95 });
const sprintSlow = normalizeScore("sprint", { finishTime: 14.00, rhythmAccuracy: 40 });
assert(sprintGood > sprintSlow, `Good sprint (${sprintGood}) should beat slow sprint (${sprintSlow})`);
assert(sprintGood >= 90, "Near WR sprint should have high score");

// Table Tennis: returns & rally
const ttGood = normalizeScore("tableTennis", { successfulReturns: 14, maxRally: 8, accuracy: 90 });
const ttPoor = normalizeScore("tableTennis", { successfulReturns: 2, maxRally: 1, accuracy: 30 });
assert(ttGood > ttPoor, "Good table tennis should score higher than poor");
assert(ttGood <= 100 && ttPoor >= 0, "Scores should be bounded 0-100");

// Weightlifting: best lift kg
const wlHeavy = normalizeScore("weightlifting", { bestLiftKg: 240, precisionBonus: 10 });
const wlZero = normalizeScore("weightlifting", { bestLiftKg: 0, precisionBonus: 0 });
assert.strictEqual(wlHeavy, 100, "Max lift + bonus should be 100");
assert.strictEqual(wlZero, 0, "Zero lift should be 0");

// Fencing: correct decisions & reaction time
const fencingGood = normalizeScore("fencing", { correctCount: 10, avgReactionMs: 380 });
const fencingBad = normalizeScore("fencing", { correctCount: 2, avgReactionMs: 1100 });
assert(fencingGood > fencingBad, "Good fencing should score higher than poor fencing");
assert(fencingGood >= 95, "Flawless fencing should be near 100");
console.log("  ✓ Score normalization tests passed.");

// 6. Opponent Score Generation Tests
console.log("6. Testing Opponent Score Generation...");
const simScores = simulateOpponentScores("archery", comp.opponents);
assert.strictEqual(simScores.length, 15, "Should generate exactly 15 scores");
for (const s of simScores) {
    assert(s.normalizedScore >= 0 && s.normalizedScore <= 100, `Score ${s.normalizedScore} out of bounds`);
    assert(s.rawScore >= 0 && s.rawScore <= 50, `Archery rawScore ${s.rawScore} must be <= 50 pts`);
    assert(s.metricDisplay.endsWith("/ 50 pts"), `Metric display must end with '/ 50 pts', got ${s.metricDisplay}`);
    assert.strictEqual(s.isPlayer, false);
}
console.log("  ✓ Opponent score generation passed.");

// 7. Event Ranking & Medal Allocation Tests
console.log("7. Testing Event Ranking & Medal Allocation...");
const playerResult = {
    code: "AR",
    name: "Argentina",
    flag: "🇦🇷",
    normalizedScore: 99,
    rawScore: 495
};
const ranked = rankEvent("archery", playerResult, simScores);
assert.strictEqual(ranked.rankings.length, 16, "Rankings must include all 16 countries");
assert.strictEqual(ranked.rankings[0].medal, "gold", "Rank 1 must receive gold");
assert.strictEqual(ranked.rankings[1].medal, "silver", "Rank 2 must receive silver");
assert.strictEqual(ranked.rankings[2].medal, "bronze", "Rank 3 must receive bronze");
for (let i = 3; i < 16; i++) {
    assert.strictEqual(ranked.rankings[i].medal, null, `Rank ${i + 1} must NOT receive a medal`);
}
assert.strictEqual(ranked.playerRank, 1, "Player with score 99 should finish 1st");
assert.strictEqual(ranked.playerMedal, "gold");

// Test deterministic tie-breaking
const tieOpponents = [
    { code: "BR", name: "Brazil", flag: "🇧🇷", normalizedScore: 80, rawScore: 80 },
    { code: "CL", name: "Chile", flag: "🇨🇱", normalizedScore: 80, rawScore: 80 }
];
const tiePlayer = { code: "AR", name: "Argentina", flag: "🇦🇷", normalizedScore: 80, rawScore: 80 };
const remaining13 = comp.opponents.slice(2).map((o) => ({
    code: o.code,
    name: o.name,
    flag: o.flag,
    normalizedScore: 50,
    rawScore: 50
}));
const tiedRanked = rankEvent("archery", tiePlayer, [...tieOpponents, ...remaining13]);
// Tied scores with same raw score should be ordered alphabetically by code: AR, BR, CL
assert.strictEqual(tiedRanked.rankings[0].code, "AR");
assert.strictEqual(tiedRanked.rankings[1].code, "BR");
assert.strictEqual(tiedRanked.rankings[2].code, "CL");
console.log("  ✓ Event ranking, medal allocation, and tie-breaking passed.");

// 7b. Weightlifting 9 Levels & Tie-Breaker Tests (3 Fails vs 4 Fails at 180kg)
console.log("7b. Testing Weightlifting 9 Levels, Attempts Tracking & Tie-Breaker Rule...");
assert.strictEqual(WEIGHTLIFTING_LEVELS.length, 9, "Weightlifting must have exactly 9 levels");
assert.deepStrictEqual(WEIGHTLIFTING_LEVELS, [140, 150, 160, 170, 180, 190, 200, 210, 220], "Levels must be 140kg to 220kg with 10kg increments");

// Verify opponent simulation for weightlifting tracks attempts array and fails
const wlSimOpponents = simulateOpponentScores("weightlifting", comp.opponents);
assert.strictEqual(wlSimOpponents.length, 15);
for (const opp of wlSimOpponents) {
    assert(Array.isArray(opp.attempts), "Opponent must have attempts array");
    assert.strictEqual(opp.attempts.length, 9, "Opponent must have 9 level attempts");
    assert(typeof opp.bestLiftKg === "number", "Opponent must have bestLiftKg");
    assert(typeof opp.totalFails === "number", "Opponent must have totalFails");
}

// Case 1: India (3 fails at 180kg) vs US (4 fails at 180kg) -> India must be ranked higher
const wlPlayerIndia = {
    code: "IN",
    name: "India",
    flag: "🇮🇳",
    bestLiftKg: 180,
    totalFails: 3,
    normalizedScore: 78,
    rawScore: 180
};
const wlOpponentUS = {
    code: "US",
    name: "United States",
    flag: "🇺🇸",
    bestLiftKg: 180,
    totalFails: 4,
    normalizedScore: 78,
    rawScore: 180
};
const wlRemaining14 = comp.opponents.slice(1).map((o) => ({
    code: o.code,
    name: o.name,
    flag: o.flag,
    bestLiftKg: 160,
    totalFails: 2,
    normalizedScore: 70,
    rawScore: 160
}));

const wlRanked1 = rankEvent("weightlifting", wlPlayerIndia, [wlOpponentUS, ...wlRemaining14]);
assert.strictEqual(wlRanked1.rankings[0].code, "IN", "Country with 3 fails must rank higher than country with 4 fails at 180kg");
assert.strictEqual(wlRanked1.rankings[1].code, "US", "Country with 4 fails must rank 2nd");
assert.strictEqual(wlRanked1.rankings[0].medal, "gold");
assert.strictEqual(wlRanked1.rankings[1].medal, "silver");

// Case 2: Reverse order - Player has 4 fails at 180kg, Opponent has 3 fails at 180kg -> Opponent must win
const wlPlayer4Fails = {
    code: "IN",
    name: "India",
    flag: "🇮🇳",
    bestLiftKg: 180,
    totalFails: 4,
    normalizedScore: 78,
    rawScore: 180
};
const wlOpponent3Fails = {
    code: "US",
    name: "United States",
    flag: "🇺🇸",
    bestLiftKg: 180,
    totalFails: 3,
    normalizedScore: 78,
    rawScore: 180
};
const wlRanked2 = rankEvent("weightlifting", wlPlayer4Fails, [wlOpponent3Fails, ...wlRemaining14]);
assert.strictEqual(wlRanked2.rankings[0].code, "US", "Opponent with 3 fails must beat player with 4 fails at 180kg");
assert.strictEqual(wlRanked2.rankings[1].code, "IN", "Player with 4 fails must be ranked 2nd");

// Case 3: Player reaches 220kg with 0 errors (flawless lifts) -> Seals Gold unconditionally
const wlFlawlessPlayer = {
    code: "IN",
    name: "India",
    flag: "🇮🇳",
    bestLiftKg: 220,
    totalFails: 0,
    normalizedScore: 100,
    rawScore: 220
};
for (let trial = 0; trial < 20; trial++) {
    const trialOpps = simulateOpponentScores("weightlifting", comp.opponents);
    // Verify no opponent ever has 220kg with 0 fails
    const zeroFailOpp = trialOpps.find((o) => o.bestLiftKg === 220 && o.totalFails === 0);
    assert.strictEqual(zeroFailOpp, undefined, "No simulated opponent should ever reach 220kg with 0 fails");
    const trialRanked = rankEvent("weightlifting", wlFlawlessPlayer, trialOpps);
    assert.strictEqual(trialRanked.rankings[0].code, "IN", "Flawless 220kg player must seal Gold in every trial");
    assert.strictEqual(trialRanked.rankings[0].medal, "gold");
}
console.log("  ✓ Flawless 220kg lift (0 errors) guaranteed to seal Gold verified across all simulations.");
console.log("  ✓ Weightlifting 9 levels, opponent simulation, and 3-fails-vs-4-fails tie-breaker confirmed.");

// 7c. Sprint Time Ranking Tests (Lower time wins Gold regardless of score tie)
console.log("7c. Testing Sprint Time Decider Rule (9.63s beats 9.73s even when scores tie at 98)...");
const sprintRunnerIndia = {
    code: "IN",
    name: "India",
    flag: "🇮🇳",
    finishTime: 9.73,
    normalizedScore: 98,
    rawScore: 9.73
};
const sprintRunnerUS = {
    code: "US",
    name: "United States",
    flag: "🇺🇸",
    finishTime: 9.63,
    normalizedScore: 98,
    rawScore: 9.63
};
const sprintOtherOpps = comp.opponents.slice(1).map((o, idx) => ({
    code: o.code,
    name: o.name,
    flag: o.flag,
    finishTime: 10.10 + idx * 0.15,
    normalizedScore: 90 - idx * 2,
    rawScore: 10.10 + idx * 0.15
}));

const sprintRanked = rankEvent("sprint", sprintRunnerIndia, [sprintRunnerUS, ...sprintOtherOpps]);
assert.strictEqual(sprintRanked.rankings[0].code, "US", "US with 9.63s MUST win Gold over India with 9.73s");
assert.strictEqual(sprintRanked.rankings[0].medal, "gold");
assert.strictEqual(sprintRanked.rankings[1].code, "IN", "India with 9.73s MUST get Silver");
assert.strictEqual(sprintRanked.rankings[1].medal, "silver");
console.log("  ✓ Sprint lower time decider verified: 9.63s awarded Gold over 9.73s.");

// 7d. Table Tennis Knockout Tournament Ranking Tests
console.log("7d. Testing Table Tennis Knockout System (Gold, Silver, Bronze Match & 16-Nation Ranking)...");
const ttPlayerGold = {
    code: "IN",
    name: "India",
    flag: "🇮🇳",
    knockoutRank: 1,
    normalizedScore: 100,
    rawScore: 100
};
const ttOppFinalSilver = {
    code: "CN",
    name: "China",
    flag: "🇨🇳",
    knockoutRank: 2,
    normalizedScore: 92,
    rawScore: 92
};
const ttOppBronzeWinner = {
    code: "JP",
    name: "Japan",
    flag: "🇯🇵",
    knockoutRank: 3,
    normalizedScore: 86,
    rawScore: 86
};
const ttOpp4th = {
    code: "DE",
    name: "Germany",
    flag: "🇩🇪",
    knockoutRank: 4,
    normalizedScore: 80,
    rawScore: 80
};
const ttOtherOpps = comp.opponents.slice(3).map((o, idx) => ({
    code: o.code,
    name: o.name,
    flag: o.flag,
    knockoutRank: 5 + idx,
    normalizedScore: idx < 4 ? 72 : 48,
    rawScore: idx < 4 ? 72 : 48
}));

const ttRanked = rankEvent("tableTennis", ttPlayerGold, [ttOppFinalSilver, ttOppBronzeWinner, ttOpp4th, ...ttOtherOpps]);
assert.strictEqual(ttRanked.rankings[0].code, "IN", "Rank 1 must be India (Gold)");
assert.strictEqual(ttRanked.rankings[0].medal, "gold");
assert.strictEqual(ttRanked.rankings[1].code, "CN", "Rank 2 must be China (Silver)");
assert.strictEqual(ttRanked.rankings[1].medal, "silver");
assert.strictEqual(ttRanked.rankings[2].code, "JP", "Rank 3 must be Japan (Bronze)");
assert.strictEqual(ttRanked.rankings[2].medal, "bronze");
assert.strictEqual(ttRanked.rankings[3].code, "DE", "Rank 4 must be Germany (No medal, 4th)");
assert.strictEqual(ttRanked.rankings[3].medal, null);
assert.strictEqual(ttRanked.rankings.length, 16);
console.log("  ✓ Table Tennis knockout bracket medals verified: Gold, Silver, Bronze, and 4th place correctly assigned.");

// 8. Cumulative Standings & Olympic Sorting Tests
console.log("8. Testing Cumulative Standings & Olympic Sorting...");
let standings = comp.standings;
assert.strictEqual(standings.length, 16);
standings = updateStandingsWithEvent(standings, ranked);
assert.strictEqual(standings.length, 16);
const leader = standings[0];
assert.strictEqual(leader.code, "AR", "AR should lead medal table after winning Gold");
assert.strictEqual(leader.gold, 1);
assert.strictEqual(leader.silver, 0);
assert.strictEqual(leader.bronze, 0);
assert.strictEqual(leader.totalMedals, 1);

// Test sorting comparator directly: 1 Gold beats 5 Silvers
const countryA = { code: "A", gold: 1, silver: 0, bronze: 0, totalMedals: 1, totalPoints: 100 };
const countryB = { code: "B", gold: 0, silver: 5, bronze: 5, totalMedals: 10, totalPoints: 500 };
assert(compareStandings(countryA, countryB) < 0, "Country with 1 Gold must rank above country with 0 Gold");
console.log("  ✓ Cumulative standings and Olympic sorting passed.");

// 9. Full 5-Event Competition Flow Simulation Test
console.log("9. Testing Full 5-Event Competition Medal Integrity...");
let fullComp = createCompetition("JP");
let totalGoldsAwarded = 0;
let totalSilversAwarded = 0;
let totalBronzesAwarded = 0;

for (let eIdx = 0; eIdx < EVENTS.length; eIdx++) {
    const event = EVENTS[eIdx];
    const pScore = 85 + (eIdx % 3);
    const pRes = {
        code: fullComp.playerCountry.code,
        name: fullComp.playerCountry.name,
        flag: fullComp.playerCountry.flag,
        normalizedScore: pScore,
        rawScore: pScore
    };
    const opponentsSim = simulateOpponentScores(event.id, fullComp.opponents);
    const eventRanked = rankEvent(event.id, pRes, opponentsSim);

    // Track medals
    for (const r of eventRanked.rankings) {
        if (r.medal === "gold") totalGoldsAwarded++;
        if (r.medal === "silver") totalSilversAwarded++;
        if (r.medal === "bronze") totalBronzesAwarded++;
    }

    fullComp.standings = updateStandingsWithEvent(fullComp.standings, eventRanked);
    fullComp.eventResults.push(eventRanked);
}

assert.strictEqual(totalGoldsAwarded, 5, `Expected 5 golds total across 5 events, got ${totalGoldsAwarded}`);
assert.strictEqual(totalSilversAwarded, 5, `Expected 5 silvers total across 5 events, got ${totalSilversAwarded}`);
assert.strictEqual(totalBronzesAwarded, 5, `Expected 5 bronzes total across 5 events, got ${totalBronzesAwarded}`);
assert.strictEqual(totalGoldsAwarded + totalSilversAwarded + totalBronzesAwarded, 15, "Expected exactly 15 medals total");

const finalStandingsMedalSum = fullComp.standings.reduce((sum, c) => sum + c.totalMedals, 0);
assert.strictEqual(finalStandingsMedalSum, 15, "Sum of totalMedals in final standings must be 15");
console.log("  ✓ Full 5-event competition completed with exactly 15 medals awarded.");

// 10. Replay and Lineup Verification
console.log("10. Testing Lineup Adaptation for Different Player Selections...");
const comp1 = createCompetition("FR");
const comp2 = createCompetition("JP");
const comp3 = createCompetition("AR");

assert.strictEqual(comp1.participants.length, 16);
assert(!comp1.opponents.some((o) => o.code === "FR"));
assert(comp1.opponents.some((o) => o.code === "NZ"), "FR competition should include NZ");

assert.strictEqual(comp2.participants.length, 16);
assert(!comp2.opponents.some((o) => o.code === "JP"));
assert(comp2.opponents.some((o) => o.code === "FR"));

assert.strictEqual(comp3.participants.length, 16);
assert(!comp3.opponents.some((o) => o.code === "AR"));
assert(!comp3.opponents.some((o) => o.code === "NZ"), "AR competition must replace NZ with player country");
assert(comp3.opponents.some((o) => o.code === "IN"));

console.log("  ✓ Lineup adaptation for internal and external nations confirmed.");

console.log("\nAll Mini Olympics core tests PASSED successfully! 🏅");

