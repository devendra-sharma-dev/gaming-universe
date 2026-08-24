const mongoose = require("mongoose");

const User = require("../models/User");
const TicTacToeMatch = require("../models/TicTacToeMatch");

const TIC_TAC_TOE_WIN_XP = 30;

const awardTicTacToeWinXp = async ({ matchId, userId }) => {
    const session = await mongoose.startSession();
    let totalXp = null;

    try {
        await session.withTransaction(async () => {
            const claimedMatch = await TicTacToeMatch.findOneAndUpdate(
                {
                    matchId,
                    status: "won",
                    winnerUserId: userId,
                    xpAwarded: false
                },
                {
                    $set: {
                        xpAwarded: true,
                        xpAwardedAt: new Date()
                    }
                },
                {
                    new: true,
                    session
                }
            );

            if (!claimedMatch) {
                return;
            }

            const updatedUser = await User.findByIdAndUpdate(
                userId,
                {
                    $inc: { xp: TIC_TAC_TOE_WIN_XP }
                },
                {
                    new: true,
                    session
                }
            ).select("xp");

            if (!updatedUser) {
                throw new Error("Winner account no longer exists.");
            }

            totalXp = updatedUser.xp;
        });
    } finally {
        await session.endSession();
    }

    return totalXp;
};

module.exports = {
    TIC_TAC_TOE_WIN_XP,
    awardTicTacToeWinXp
};
