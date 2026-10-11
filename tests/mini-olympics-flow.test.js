"use strict";

require("dotenv").config();
const assert = require("assert");
const http = require("http");
const { app } = require("../backend/app");

console.log("Running Mini Olympics API flow integration test...\n");

(async () => {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}/api/v1/mini-olympics`;

    try {
        // 1. Test Country Catalog
        console.log("1. GET /api/v1/mini-olympics/countries");
        const countriesRes = await fetch(`${baseUrl}/countries`);
        assert.strictEqual(countriesRes.status, 200);
        const countriesData = await countriesRes.json();
        assert(countriesData.success);
        assert(countriesData.data.total >= 195, `Expected >= 195 countries, got ${countriesData.data.total}`);

        // Search test
        const searchRes = await fetch(`${baseUrl}/countries?q=brazil`);
        const searchData = await searchRes.json();
        assert(searchData.data.countries.some((c) => c.code === "BR"));

        // 2. Test Invalid Country Selection
        console.log("2. POST /api/v1/mini-olympics/competition/start (Invalid code)");
        const invalidRes = await fetch(`${baseUrl}/competition/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ countryCode: "INVALID_99" })
        });
        assert.strictEqual(invalidRes.status, 400);

        // 3. Start Valid Competition with France (FR)
        console.log("3. POST /api/v1/mini-olympics/competition/start (FR)");
        const startRes = await fetch(`${baseUrl}/competition/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ countryCode: "FR" })
        });
        assert.strictEqual(startRes.status, 201);
        const startData = await startRes.json();
        const comp = startData.data;

        assert(comp.competitionId);
        assert.strictEqual(comp.playerCountry.code, "FR");
        assert.strictEqual(comp.opponents.length, 15);
        assert(!comp.opponents.some((o) => o.code === "FR"), "Opponents must exclude selected country FR");
        assert.strictEqual(comp.participants.length, 16);
        assert.strictEqual(comp.standings.length, 16);

        // 4. Submit Event 1: Archery
        console.log("4. POST /api/v1/mini-olympics/competition/event-result (Event 1: Archery)");
        const archeryRes = await fetch(`${baseUrl}/competition/event-result`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                competitionId: comp.competitionId,
                eventId: "archery",
                metrics: { rawScore: 460 },
                rawScore: 460
            })
        });
        assert.strictEqual(archeryRes.status, 200);
        const archeryData = await archeryRes.json();
        assert.strictEqual(archeryData.data.eventId, "archery");
        assert.strictEqual(archeryData.data.currentEventIndex, 1);
        assert.strictEqual(archeryData.data.eventRanked.rankings.length, 16);
        // Verify exactly 3 medals allocated
        const archeryGolds = archeryData.data.eventRanked.rankings.filter((r) => r.medal === "gold");
        const archerySilvers = archeryData.data.eventRanked.rankings.filter((r) => r.medal === "silver");
        const archeryBronzes = archeryData.data.eventRanked.rankings.filter((r) => r.medal === "bronze");
        assert.strictEqual(archeryGolds.length, 1);
        assert.strictEqual(archerySilvers.length, 1);
        assert.strictEqual(archeryBronzes.length, 1);

        // 5. Test Duplicate Submission Protection
        console.log("5. Duplicate submission check (Archery)");
        const dupRes = await fetch(`${baseUrl}/competition/event-result`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                competitionId: comp.competitionId,
                eventId: "archery",
                metrics: { rawScore: 400 }
            })
        });
        assert.strictEqual(dupRes.status, 400, "Should reject out of sequence / duplicate event");

        // 6. Test Out of Sequence Event Protection
        console.log("6. Out of sequence check (Skipping sprint to fencing)");
        const oosRes = await fetch(`${baseUrl}/competition/event-result`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                competitionId: comp.competitionId,
                eventId: "fencing",
                metrics: { correctCount: 8 }
            })
        });
        assert.strictEqual(oosRes.status, 400);

        // 7. Submit Event 2: Sprint
        console.log("7. POST /api/v1/mini-olympics/competition/event-result (Event 2: Sprint)");
        const sprintRes = await fetch(`${baseUrl}/competition/event-result`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                competitionId: comp.competitionId,
                eventId: "sprint",
                metrics: { finishTime: 9.75, rhythmAccuracy: 92 }
            })
        });
        assert.strictEqual(sprintRes.status, 200);

        // 8. Submit Event 3: Table Tennis
        console.log("8. POST /api/v1/mini-olympics/competition/event-result (Event 3: Table Tennis)");
        const ttRes = await fetch(`${baseUrl}/competition/event-result`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                competitionId: comp.competitionId,
                eventId: "tableTennis",
                metrics: { successfulReturns: 15, maxRally: 8, accuracy: 90 }
            })
        });
        assert.strictEqual(ttRes.status, 200);

        // 9. Submit Event 4: Weightlifting
        console.log("9. POST /api/v1/mini-olympics/competition/event-result (Event 4: Weightlifting)");
        const wlRes = await fetch(`${baseUrl}/competition/event-result`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                competitionId: comp.competitionId,
                eventId: "weightlifting",
                metrics: { bestLiftKg: 220, precisionBonus: 10 }
            })
        });
        assert.strictEqual(wlRes.status, 200);

        // 10. Submit Event 5: Fencing (Final event)
        console.log("10. POST /api/v1/mini-olympics/competition/event-result (Event 5: Fencing)");
        const fencingRes = await fetch(`${baseUrl}/competition/event-result`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                competitionId: comp.competitionId,
                eventId: "fencing",
                metrics: { correctCount: 9, avgReactionMs: 390 }
            })
        });
        assert.strictEqual(fencingRes.status, 200);
        const fencingData = await fencingRes.json();
        assert.strictEqual(fencingData.data.isCompleted, true);
        assert(fencingData.data.winnerCountry);
        assert(Number.isInteger(fencingData.data.playerFinalRank));

        // 11. Finalize and Complete Competition
        console.log("11. POST /api/v1/mini-olympics/competition/complete");
        const completeRes = await fetch(`${baseUrl}/competition/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ competitionId: comp.competitionId })
        });
        assert.strictEqual(completeRes.status, 200);
        const completeData = await completeRes.json();
        assert.strictEqual(completeData.data.status, "completed");
        assert.strictEqual(completeData.data.finalMedalTable.length, 16);

        // Verify total medals awarded = exactly 15
        const totalMedals = completeData.data.finalMedalTable.reduce(
            (sum, c) => sum + c.totalMedals,
            0
        );
        assert.strictEqual(totalMedals, 15, `Expected 15 medals across all 5 events, got ${totalMedals}`);

        console.log("\nFull 5-event Mini Olympics API flow PASSED! 🏅");
        process.exit(0);
    } finally {
        server.close();
    }
})().catch((err) => {
    console.error("Test failure:", err);
    process.exit(1);
});
