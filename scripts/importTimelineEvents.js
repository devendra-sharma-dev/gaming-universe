"use strict";

/* Usage: node scripts/importTimelineEvents.js [path/to/events.jsonl] */
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const mongoose = require("mongoose");
const TimelineEvent = require("../backend/models/TimelineEvent");

const file = path.resolve(process.cwd(), process.argv[2] || "data/timeline_events_15000.jsonl");

async function readEvents() {
    const events = [];
    const lines = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
    let lineNumber = 0;

    for await (const line of lines) {
        lineNumber += 1;
        if (!line.trim()) continue;
        let event;
        try {
            event = JSON.parse(line);
        } catch (error) {
            throw new Error(`Invalid JSON on line ${lineNumber}: ${error.message}`);
        }
        if (!event || typeof event !== "object" || Array.isArray(event) || !event.title || !event.date) {
            throw new Error(`Line ${lineNumber} must contain an event with title and date.`);
        }
        if (Number.isNaN(new Date(event.date).getTime())) throw new Error(`Line ${lineNumber} has an invalid date.`);
        events.push({ ...event, date: new Date(event.date) });
    }
    return events;
}

async function importEvents() {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI must be configured in .env.");
    if (!fs.existsSync(file)) throw new Error(`Dataset not found: ${file}`);

    const events = await readEvents();
    if (!events.length) throw new Error("Dataset contains no events.");

    await mongoose.connect(process.env.MONGODB_URI);
    try {
        // Bypass Mongoose enum validation so the source labels are preserved exactly.
        const result = await TimelineEvent.collection.bulkWrite(
            events.map((event) => ({
                updateOne: {
                    filter: { title: event.title, date: event.date },
                    update: { $setOnInsert: event },
                    upsert: true
                }
            })),
            { ordered: false }
        );
        console.log(`Timeline import complete: ${events.length} processed, ${result.upsertedCount} inserted, ${result.matchedCount} already present.`);
    } finally {
        await mongoose.disconnect();
    }
}

importEvents().catch((error) => {
    console.error(`Import failed: ${error.message}`);
    process.exitCode = 1;
});
