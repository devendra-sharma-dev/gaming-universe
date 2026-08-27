"use strict";

/* Usage: node scripts/import-timeline-dataset.js data/timeline-events.json */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const TimelineEvent = require("../backend/models/TimelineEvent");

const file = path.resolve(process.cwd(), process.argv[2] || "data/timeline-events.json");
const records = JSON.parse(fs.readFileSync(file, "utf8"));
const run = async () => {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI must be configured in .env.");
    await mongoose.connect(process.env.MONGODB_URI);
    await TimelineEvent.bulkWrite(records.map((record) => ({
        updateOne: {
            filter: { title: record.title, date: new Date(record.date) },
            update: { $setOnInsert: { ...record, date: new Date(record.date), usedInDailyGame: false, usedInGameDate: null } },
            upsert: true
        }
    })), { ordered: false });
    console.log(`Timeline import finished: ${records.length} source records processed.`);
    await mongoose.disconnect();
};
run().catch(async (error) => { console.error(error.message); await mongoose.disconnect(); process.exitCode = 1; });
