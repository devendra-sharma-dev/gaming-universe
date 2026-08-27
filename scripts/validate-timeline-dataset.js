"use strict";

/* Usage: node scripts/validate-timeline-dataset.js data/timeline-events.json */
const fs = require("fs");
const path = require("path");

const categories = ["Science", "Sports", "Technology", "History", "Geography", "Entertainment", "Nature", "Space", "Business", "General Knowledge", "Music", "Movies", "World"];
const popularity = ["high", "medium", "discovery"];
const file = path.resolve(process.cwd(), process.argv[2] || "data/timeline-events.json");
const records = JSON.parse(fs.readFileSync(file, "utf8"));
if (!Array.isArray(records)) throw new Error("Dataset must be a JSON array.");
const seen = new Set();
const counts = Object.fromEntries(categories.map((category) => [category, 0]));
const errors = [];
for (const [index, record] of records.entries()) {
    const label = `row ${index + 1}`;
    if (!record || typeof record !== "object") { errors.push(`${label}: must be an object`); continue; }
    if (typeof record.title !== "string" || record.title.trim().length < 5 || record.title.trim().length > 180) errors.push(`${label}: title must be 5–180 characters`);
    if (typeof record.description !== "string" || record.description.trim().length < 35 || record.description.trim().length > 420) errors.push(`${label}: description must be 35–420 characters`);
    if (!Number.isFinite(Date.parse(record.date))) errors.push(`${label}: date must be an ISO-8601 date`);
    if (!categories.includes(record.category)) errors.push(`${label}: invalid category`); else counts[record.category] += 1;
    if (!popularity.includes(record.popularity)) errors.push(`${label}: popularity must be high, medium, or discovery`);
    const duplicateKey = `${String(record.title).trim().toLowerCase()}|${record.date}`;
    if (seen.has(duplicateKey)) errors.push(`${label}: duplicate title/date`); else seen.add(duplicateKey);
}
const ideal = records.length / categories.length;
for (const category of categories) if (Math.abs(counts[category] - ideal) > Math.ceil(ideal * 0.12)) errors.push(`${category}: ${counts[category]} records is outside the 12% balance tolerance.`);
if (records.length !== 15000) errors.push(`Dataset contains ${records.length}; production dataset must contain exactly 15000 records.`);
if (errors.length) { console.error(`Timeline dataset invalid (${errors.length} issue(s)):`, errors.join("\n")); process.exitCode = 1; } else console.log(`Timeline dataset valid: ${records.length} events, ${categories.length} balanced categories.`);
