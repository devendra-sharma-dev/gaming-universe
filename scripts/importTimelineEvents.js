"use strict";

/* Usage: node scripts/importTimelineEvents.js [path/to/events.jsonl] */
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const mongoose = require("mongoose");
const TimelineEvent = require("../backend/models/TimelineEvent");

const file = path.resolve(process.cwd(), process.argv[2] || "data/timeline_events_15000.jsonl");
const BATCH_SIZE = 1000;

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

    console.log(`Reading events from ${file}...`);
    const events = await readEvents();
    if (!events.length) throw new Error("Dataset contains no events.");
    console.log(`Loaded ${events.length} valid events from file.`);

    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB successfully.");

    let totalUpserted = 0;
    let totalMatched = 0;
    let totalModified = 0;

    const totalBatches = Math.ceil(events.length / BATCH_SIZE);
    const startTime = Date.now();

    try {
        // Bypass Mongoose enum validation so the source labels are preserved exactly.
        const result = await TimelineEvent.collection.bulkWrite(
            events.map((event) => ({
        for (let b = 0; b < totalBatches; b++) {
            const start = b * BATCH_SIZE;
            const end = Math.min(start + BATCH_SIZE, events.length);
            const batch = events.slice(start, end);
            const now = new Date();

            const operations = batch.map((event) => ({
                updateOne: {
                    filter: { title: event.title, date: event.date },
                    update: { $setOnInsert: event },
                    update: {
                        $set: {
                            title: event.title,
                            description: event.description,
                            date: event.date,
                            category: event.category,
                            popularity: event.popularity,
                            usedInDailyGame: Boolean(event.usedInDailyGame),
                            usedInGameDate: event.usedInGameDate || null,
                            updatedAt: now
                        },
                        $setOnInsert: {
                            createdAt: now
                        }
                    },
                    upsert: true
                }
            })),
            { ordered: false }
        );
        console.log(`Timeline import complete: ${events.length} processed, ${result.upsertedCount} inserted, ${result.matchedCount} already present.`);
            }));

            const result = await TimelineEvent.collection.bulkWrite(operations, { ordered: false });
            totalUpserted += result.upsertedCount || 0;
            totalMatched += result.matchedCount || 0;
            totalModified += result.modifiedCount || 0;

            const progress = (((b + 1) / totalBatches) * 100).toFixed(1);
            console.log(`[Batch ${b + 1}/${totalBatches}] Processed ${end}/${events.length} events (${progress}%)...`);
        }

        const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n--- Import Summary ---`);
        console.log(`Total events processed: ${events.length}`);
        console.log(`Newly inserted (upserted): ${totalUpserted}`);
        console.log(`Existing matched: ${totalMatched}`);
        console.log(`Existing modified: ${totalModified}`);
        console.log(`Time elapsed: ${elapsedSeconds}s`);

        const finalCount = await TimelineEvent.collection.countDocuments();
        console.log(`Total documents now in 'timelineevents' collection: ${finalCount}`);

    } finally {
        await mongoose.disconnect();
        console.log("MongoDB disconnected.");
    }
}

importEvents().catch((error) => {
    console.error(`Import failed: ${error.message}`);
    process.exitCode = 1;
});
