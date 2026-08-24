const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        username: {
            type: String,
            required: true
        },

        symbol: {
            type: String,
            enum: ["X", "O"],
            required: true
        }
    },
    {
        _id: false
    }
);

const ticTacToeMatchSchema = new mongoose.Schema(
    {
        matchId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },

        mode: {
            type: String,
            enum: ["computer", "multiplayer"],
            required: true,
            index: true
        },

        players: {
            type: [playerSchema],
            default: []
        },

        board: {
            type: [String],
            default: () => Array(9).fill(null)
        },

        currentTurn: {
            type: String,
            enum: ["X", "O"],
            default: "X"
        },

        status: {
            type: String,
            enum: ["waiting", "active", "won", "draw", "abandoned"],
            default: "active",
            index: true
        },

        winnerUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        winnerSymbol: {
            type: String,
            enum: ["X", "O", null],
            default: null
        },

        winningCells: {
            type: [Number],
            default: []
        },

        xpAwarded: {
            type: Boolean,
            default: false,
            index: true
        },

        xpAwardedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports =
    mongoose.models.TicTacToeMatch ||
    mongoose.model("TicTacToeMatch", ticTacToeMatchSchema);
