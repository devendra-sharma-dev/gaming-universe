"use strict";

const mongoose = require("mongoose");

const puzzleQuestProgressSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true
        },
        completedLevels: {
            type: [Number],
            default: []
        },
        bestTimes: {
            type: Map,
            of: Number,
            default: () => new Map()
        },
        bestMoves: {
            type: Map,
            of: Number,
            default: () => new Map()
        },
        bestStars: {
            type: Map,
            of: Number,
            default: () => new Map()
        },
        resumeLevel: {
            type: Number,
            default: 1,
            min: 1,
            max: 50
        },
        xpEarned: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true
    }
);

module.exports =
    mongoose.models.PuzzleQuestProgress ||
    mongoose.model("PuzzleQuestProgress", puzzleQuestProgressSchema);

