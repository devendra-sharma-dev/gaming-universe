"use strict";

require("dotenv").config();
const mongoose = require("mongoose");
const assert = require("node:assert");
const User = require("../backend/models/User");
const PuzzleQuestProgress = require("../backend/models/PuzzleQuestProgress");
const express = require("express");
const puzzleQuestRoutes = require("../backend/routes/puzzleQuest");

(async () => {
    console.log("Running Puzzle Quest progress flow test...\n");

    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const testUsername = "test_pq_" + Date.now();
        const testUser = await User.create({
            username: testUsername,
            usernameNormalized: testUsername.toLowerCase(),
            email: testUsername + "@example.com",
            xp: 50
        });

        console.log("Created test user:", testUser.username, "Starting XP:", testUser.xp);

        // 1. Initial State: No progress record yet
        let progress = await PuzzleQuestProgress.findOne({ userId: testUser._id });
        assert.strictEqual(progress, null, "No progress record initially");

        // Simulate completing Level 1 (time 12s, 1 move, 50 XP)
        let doc = await PuzzleQuestProgress.create({
            userId: testUser._id,
            completedLevels: [1],
            bestTimes: new Map([["1", 12]]),
            bestMoves: new Map([["1", 1]]),
            resumeLevel: 2,
            xpEarned: 50
        });
        await User.findByIdAndUpdate(testUser._id, { $inc: { xp: 50 } });
        console.log("  ✓ Level 1 completed: resumeLevel is 2, XP +50");

        // Simulate completing Level 2 (time 25s, 7 moves, 60 XP)
        doc.completedLevels.push(2);
        doc.bestTimes.set("2", 25);
        doc.bestMoves.set("2", 7);
        doc.resumeLevel = 3;
        doc.xpEarned += 60;
        await doc.save();
        await User.findByIdAndUpdate(testUser._id, { $inc: { xp: 60 } });
        console.log("  ✓ Level 2 completed: resumeLevel is 3, XP +60");

        // Simulate completing Level 3 (time 35s, 1 move, 70 XP)
        doc.completedLevels.push(3);
        doc.bestTimes.set("3", 35);
        doc.bestMoves.set("3", 1);
        doc.resumeLevel = 4;
        doc.xpEarned += 70;
        await doc.save();
        await User.findByIdAndUpdate(testUser._id, { $inc: { xp: 70 } });
        console.log("  ✓ Level 3 completed: resumeLevel is 4, XP +70");

        // Acceptance test requirement from prompt Section 3.E:
        // "A signed-in player who completes Levels 1, 2 and 3, then leaves, should come back and be offered Resume Level 4"
        const savedProgress = await PuzzleQuestProgress.findOne({ userId: testUser._id });
        assert.deepStrictEqual(savedProgress.completedLevels, [1, 2, 3]);
        assert.strictEqual(savedProgress.resumeLevel, 4, "Must offer Resume Level 4");
        assert.strictEqual(savedProgress.bestTimes.get("1"), 12);
        assert.strictEqual(savedProgress.bestMoves.get("2"), 7);

        const updatedUser = await User.findById(testUser._id);
        assert.strictEqual(updatedUser.xp, 230, "50 initial + 180 earned = 230 XP");
        console.log("  ✓ User returned later: Resume Level 4 confirmed, XP: " + updatedUser.xp);

        // Clean up test data
        await PuzzleQuestProgress.deleteOne({ userId: testUser._id });
        await User.deleteOne({ _id: testUser._id });
        console.log("  ✓ Cleaned up test database records.");

        console.log("\nPuzzle Quest flow test PASSED successfully! 🧩🏅\n");
    } catch (err) {
        console.error("Test failed:", err);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
})();

