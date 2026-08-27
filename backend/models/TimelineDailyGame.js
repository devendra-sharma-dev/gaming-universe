const mongoose = require("mongoose");

const timelineDailyGameSchema = new mongoose.Schema({
    gameDate: { type: String, required: true, unique: true, index: true },
    rounds: [{ type: [{ type: mongoose.Schema.Types.ObjectId, ref: "TimelineEvent" }], required: true }]
}, { timestamps: true });

module.exports = mongoose.models.TimelineDailyGame || mongoose.model("TimelineDailyGame", timelineDailyGameSchema);
