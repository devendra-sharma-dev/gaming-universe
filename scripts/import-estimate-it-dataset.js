"use strict";

/* Usage: node scripts/import-estimate-it-dataset.js [data/estimate-it-questions.json] */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const EstimateItQuestion = require("../backend/models/EstimateItQuestion");

const args = process.argv.slice(2).filter(arg => !arg.startsWith("--"));
const file = path.resolve(process.cwd(), args[0] || "data/estimate-it-questions.json");

const run = async () => {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI must be configured in .env.");

    // Validate dataset before touching the DB
    let raw = fs.readFileSync(file, "utf8");
    if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
    const records = JSON.parse(raw);

    if (!Array.isArray(records) || records.length !== 4000) {
        throw new Error(`Dataset must contain exactly 4,000 records. Found ${records?.length}.`);
    }

    // Check for duplicates
    const seen = new Set();
    for (const r of records) {
        const key = r.question.trim().toLowerCase();
        if (seen.has(key)) throw new Error(`Duplicate question found: "${r.question}"`);
        seen.add(key);
        if (typeof r.answer !== "number" || !Number.isFinite(r.answer)) {
            throw new Error(`Invalid answer for: "${r.question}"`);
        }
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");

    if (process.argv.includes("--clean") || process.argv.includes("--reset")) {
        const deleted = await EstimateItQuestion.deleteMany({});
        console.log(`Cleaned up old EstimateItQuestion collection (${deleted.deletedCount} removed).`);
        const EstimateItAttempt = require("../backend/models/EstimateItAttempt");
        await EstimateItAttempt.deleteMany({});
        console.log("Reset EstimateItAttempt collection for clean daily start.");
    }

    // Idempotent bulk upsert using $setOnInsert (same pattern as import-timeline-dataset.js)
    // This preserves usedInDailyGame and usedInGameDate on existing records!
    const operations = records.map((record) => ({
        updateOne: {
            filter: { question: record.question.trim() },
            update: {
                $setOnInsert: {
                    question: record.question.trim(),
                    answer: record.answer,
                    category: record.category,
                    unit: record.unit || null,
                    usedInDailyGame: false,
                    usedInGameDate: null
                }
            },
            upsert: true
        }
    }));

    const result = await EstimateItQuestion.bulkWrite(operations, { ordered: false });

    const totalCount = await EstimateItQuestion.countDocuments();
    const unusedCount = await EstimateItQuestion.countDocuments({ usedInDailyGame: false });

    console.log(`
Estimate It Dataset Import

Records found:      ${records.length}
Upserted (new):     ${result.upsertedCount}
Matched (existing): ${result.matchedCount}
Total in database:  ${totalCount}
Unused pool size:   ${unusedCount}
Duplicates:         0
Invalid records:    0

Import successful.
`);

    await mongoose.disconnect();
};

run().catch(async (error) => {
    console.error("Import failed:", error.message);
    await mongoose.disconnect();
    process.exitCode = 1;
});

