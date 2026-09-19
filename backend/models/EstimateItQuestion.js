const mongoose = require("mongoose");

const estimateItQuestionSchema = new mongoose.Schema({
    question: { type: String, required: true, trim: true },
    answer: { type: Number, required: true },
    category: {
        type: String, required: true,
        enum: ["Science", "Sports", "Technology", "History", "Geography",
            "Entertainment", "Nature", "Space", "Business", "General Knowledge",
            "Music", "Movies", "World", "Human Body", "Food",
            "Travel", "Engineering", "Internet", "Everyday Life", "Arts & Culture"]
    },
    unit: { type: String, default: null, trim: true },
    usedInDailyGame: { type: Boolean, default: false, index: true },
    usedInGameDate: { type: String, default: null, index: true }
}, { timestamps: true });

estimateItQuestionSchema.index({ question: 1 }, { unique: true });
estimateItQuestionSchema.index({ usedInDailyGame: 1, category: 1 });

module.exports = mongoose.models.EstimateItQuestion || mongoose.model("EstimateItQuestion", estimateItQuestionSchema);

