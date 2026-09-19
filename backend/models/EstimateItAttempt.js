const mongoose = require("mongoose");

const roundSchema = new mongoose.Schema({
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "EstimateItQuestion", required: true },
    question: { type: String, required: true },
    actualAnswer: { type: Number, required: true },
    category: { type: String, default: null },
    unit: { type: String, default: null },
    estimate: { type: Number, default: null },
    bet: { type: Number, default: null },
    percentageError: { type: Number, default: null },
    multiplier: { type: Number, default: null },
    xpEarned: { type: Number, default: 0 },
    submittedAt: { type: Date, default: null }
}, { _id: false });

const estimateItAttemptSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    gameDate: { type: String, required: true },
    rounds: { type: [roundSchema], default: [] },
    currentRound: { type: Number, default: 1, min: 1, max: 5 },
    status: { type: String, enum: ["active", "completed"], default: "active" },
    totalChips: { type: Number, default: 1000 },
    remainingChips: { type: Number, default: 1000 },
    totalXp: { type: Number, default: 0 },
    xpAwarded: { type: Boolean, default: false },
    completedAt: { type: Date, default: null }
}, { timestamps: true });

estimateItAttemptSchema.index({ userId: 1, gameDate: 1 }, { unique: true });

module.exports = mongoose.models.EstimateItAttempt || mongoose.model("EstimateItAttempt", estimateItAttemptSchema);

