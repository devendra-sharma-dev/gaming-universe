const express = require("express");

const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/me", requireAuth, (request, response) => {
    response.json({
        success: true,
        data: {
            id: request.user._id,
            username: request.user.username,
            email: request.user.email,
            xp: request.user.xp,
            favorites: request.user.favorites,
            wordBombHighScore: request.user.wordBombHighScore || 0
        }
    });
});

/**
 * GET /api/v1/users/leaderboard
 * Fetches top 20 users ranked by XP descending across the entire database.
 * If user is logged in (session/auth header), calculates their exact global rank
 * and XP across all users and returns `currentUser`.
 */
router.get("/leaderboard", async (request, response, next) => {
    try {
        // Top 20 users across whole database
        const topUsers = await User.find({ username: { $exists: true, $ne: null } })
            .select("username xp")
            .sort({ xp: -1, _id: 1 })
            .limit(20)
            .lean();

        const leaderboard = topUsers.map((user, index) => ({
            rank: index + 1,
            id: user._id.toString(),
            username: user.username,
            xp: user.xp || 0
        }));

        let currentUser = null;
        const currentUserId = request.session?.userId;

        if (currentUserId) {
            const loggedInUser = await User.findById(currentUserId).select("username xp").lean();
            if (loggedInUser && loggedInUser.username) {
                const userXp = loggedInUser.xp || 0;

                // Rank across whole database:
                // Count how many users have higher XP than current user,
                // or same XP with an earlier _id (tiebreaker matching sort order)
                const higherRankCount = await User.countDocuments({
                    username: { $exists: true, $ne: null },
                    $or: [
                        { xp: { $gt: userXp } },
                        { xp: userXp, _id: { $lt: loggedInUser._id } }
                    ]
                });

                const userRank = higherRankCount + 1;
                const inTop20 = leaderboard.some(u => u.id === loggedInUser._id.toString());

                currentUser = {
                    id: loggedInUser._id.toString(),
                    username: loggedInUser.username,
                    xp: userXp,
                    rank: userRank,
                    inTop20
                };
            }
        }

        return response.json({
            success: true,
            data: {
                leaderboard,
                currentUser
            }
        });
    } catch (error) {
        return next(error);
    }
});

module.exports = router;
