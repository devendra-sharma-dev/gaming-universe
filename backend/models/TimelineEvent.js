const mongoose = require("mongoose");

const timelineEventSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, maxlength: 180 },
    description: { type: String, required: true, trim: true, maxlength: 420 },
    date: { type: Date, required: true, index: true },
    category: {
        type: String,
        required: true,
        enum: ["Science", "Sports", "Technology", "History", "Geography", "Entertainment", "Nature", "Space", "Business", "General Knowledge", "Music", "Movies", "World"],
        enum: [
            "Science", "Sports", "Technology", "History", "Geography", "Entertainment",
            "Nature", "Space", "Business", "General Knowledge", "Music", "Movies", "World",
            "Architecture", "Exploration", "Politics", "Literature", "Military", "Inventions",
            "Medicine & Health", "Culture", "Environment"
            "Medicine & Health", "Culture", "Environment", "Transportation", "Religion & Civilization"
        ],
        index: true
    },
    popularity: { type: String, enum: ["high", "medium", "discovery"], default: "medium", index: true },
    popularity: { type: String, enum: ["high", "medium", "low", "discovery"], default: "medium", index: true },
    usedInDailyGame: { type: Boolean, default: false, index: true },
    usedInGameDate: { type: String, default: null, index: true }
}, { timestamps: true });

timelineEventSchema.index({ usedInDailyGame: 1, category: 1, popularity: 1, date: 1 });

module.exports = mongoose.models.TimelineEvent || mongoose.model("TimelineEvent", timelineEventSchema);
