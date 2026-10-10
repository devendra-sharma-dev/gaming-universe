"use strict";

const mongoose = require("mongoose");

const countryParticipantSchema = new mongoose.Schema({
    code: { type: String, required: true },
    name: { type: String, required: true },
    flag: { type: String, required: true }
}, { _id: false });

const eventRankingSchema = new mongoose.Schema({
    rank: { type: Number, required: true },
    code: { type: String, required: true },
    name: { type: String, required: true },
    flag: { type: String, required: true },
    normalizedScore: { type: Number, required: true },
    rawScore: { type: Number, default: 0 },
    medal: { type: String, enum: ["gold", "silver", "bronze", null], default: null },
    isPlayer: { type: Boolean, default: false }
}, { _id: false });

const eventResultSchema = new mongoose.Schema({
    eventId: { type: String, required: true },
    playerRawScore: { type: Number, default: 0 },
    playerNormalizedScore: { type: Number, required: true },
    playerRank: { type: Number, required: true },
    playerMedal: { type: String, enum: ["gold", "silver", "bronze", null], default: null },
    rankings: { type: [eventRankingSchema], default: [] }
}, { _id: false });

const standingEntrySchema = new mongoose.Schema({
    rank: { type: Number, required: true },
    code: { type: String, required: true },
    name: { type: String, required: true },
    flag: { type: String, required: true },
    gold: { type: Number, default: 0 },
    silver: { type: Number, default: 0 },
    bronze: { type: Number, default: 0 },
    totalMedals: { type: Number, default: 0 },
    totalPoints: { type: Number, default: 0 },
    isPlayer: { type: Boolean, default: false }
}, { _id: false });

const miniOlympicsCompetitionSchema = new mongoose.Schema({
    competitionId: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    playerCountry: { type: countryParticipantSchema, required: true },
    opponents: { type: [countryParticipantSchema], required: true },
    eventResults: { type: [eventResultSchema], default: [] },
    finalMedalTable: { type: [standingEntrySchema], default: [] },
    winnerCountry: { type: countryParticipantSchema, default: null },
    totalMedalsAwarded: { type: Number, default: 15 },
    xpEarned: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "completed"], default: "active" },
    completedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.models.MiniOlympicsCompetition ||
    mongoose.model("MiniOlympicsCompetition", miniOlympicsCompetitionSchema);

