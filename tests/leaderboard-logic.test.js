"use strict";

const assert = require("node:assert");

console.log("Running Leaderboard logic tests...");

// Test mock DB users
const mockUsers = [
    { _id: "1", username: "champion", xp: 5000 },
    { _id: "2", username: "runnerUp", xp: 4200 },
    { _id: "3", username: "bronzeKing", xp: 3500 },
    { _id: "4", username: "player4", xp: 2800 },
    { _id: "5", username: "player5", xp: 2500 },
    { _id: "6", username: "midTierUser", xp: 1200 },
    { _id: "7", username: "newUser", xp: 100 }
];

// 1. Sort logic: XP desc, then _id asc
const sorted = [...mockUsers].sort((a, b) => b.xp - a.xp || a._id.localeCompare(b._id));
const top3 = sorted.slice(0, 3);

assert.strictEqual(top3[0].username, "champion");
assert.strictEqual(top3[1].username, "runnerUp");
assert.strictEqual(top3[2].username, "bronzeKing");
console.log("✓ Podium top 3 correctly identified");

// 2. Global rank calculation for a user outside top 3 (e.g. midTierUser)
function calculateUserRank(users, targetUser) {
    const higherCount = users.filter(u => u.xp > targetUser.xp || (u.xp === targetUser.xp && u._id < targetUser._id)).length;
    return higherCount + 1;
}

const midRank = calculateUserRank(mockUsers, mockUsers[5]); // midTierUser
assert.strictEqual(midRank, 6, "midTierUser should be ranked #6");

const topRank = calculateUserRank(mockUsers, mockUsers[0]); // champion
assert.strictEqual(topRank, 1, "champion should be ranked #1");

const newRank = calculateUserRank(mockUsers, mockUsers[6]); // newUser
assert.strictEqual(newRank, 7, "newUser should be ranked #7");
console.log("✓ Global database rank calculation across all users verified");

console.log("All Leaderboard tests PASSED!");

