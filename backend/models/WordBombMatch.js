const mongoose = require("mongoose");

const wordBombMatchSchema = new mongoose.Schema({
    matchId: { type: String, required: true, unique: true, index: true },
    winnerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    xpAwarded: { type: Boolean, default: false },
    xpAwardedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.models.WordBombMatch || mongoose.model("WordBombMatch", wordBombMatchSchema);
