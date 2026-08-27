const mongoose = require("mongoose");

const timelineAttemptSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    gameDate: { type: String, required: true },
    round: { type: Number, required: true, min: 0, max: 4 },
    correctPositions: { type: Number, required: true, min: 0, max: 4 },
    xpEarned: { type: Number, required: true, min: 0, max: 40 },
    submittedOrder: [{ type: mongoose.Schema.Types.ObjectId, ref: "TimelineEvent" }]
}, { timestamps: true });

timelineAttemptSchema.index({ userId: 1, gameDate: 1, round: 1 }, { unique: true });

module.exports = mongoose.models.TimelineAttempt || mongoose.model("TimelineAttempt", timelineAttemptSchema);
