"use strict";

/* Usage: node scripts/validate-estimate-it-dataset.js [data/estimate-it-questions.json] */
const fs = require("fs");
const path = require("path");

const file = path.resolve(process.cwd(), process.argv[2] || "data/estimate-it-questions.json");

if (!fs.existsSync(file)) {
    console.error(`File not found: ${file}`);
    process.exit(1);
}

let raw = fs.readFileSync(file, "utf8");
if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);

let records;
try {
    records = JSON.parse(raw);
} catch (e) {
    console.error(`Invalid JSON in ${file}: ${e.message}`);
    process.exit(1);
}

if (!Array.isArray(records)) {
    console.error("Dataset must be a JSON array.");
    process.exit(1);
}

const REQUIRED_COUNT = 4000;
const VALID_CATEGORIES = new Set([
    "Science", "Sports", "Technology", "History", "Geography",
    "Entertainment", "Nature", "Space", "Business", "General Knowledge",
    "Music", "Movies", "World", "Human Body", "Food",
    "Travel", "Engineering", "Internet", "Everyday Life", "Arts & Culture"
]);

let errors = 0;
const seenQuestions = new Set();
const categoryCounts = {};

for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const prefix = `Record #${i + 1}`;

    // Question validation
    if (!r.question || typeof r.question !== "string" || !r.question.trim()) {
        console.error(`${prefix}: missing or empty question`);
        errors++;
    } else {
        const norm = r.question.trim().toLowerCase();
        if (seenQuestions.has(norm)) {
            console.error(`${prefix}: duplicate question "${r.question.slice(0, 50)}..."`);
            errors++;
        }
        seenQuestions.add(norm);
    }

    // Answer validation
    if (r.answer === undefined || r.answer === null || typeof r.answer !== "number" || !Number.isFinite(r.answer)) {
        console.error(`${prefix}: invalid answer (must be a finite number, got ${typeof r.answer}: ${r.answer})`);
        errors++;
    } else if (r.answer < 0) {
        console.error(`${prefix}: negative answer (${r.answer})`);
        errors++;
    }

    // Category validation
    if (!r.category || !VALID_CATEGORIES.has(r.category)) {
        console.error(`${prefix}: invalid category "${r.category}"`);
        errors++;
    } else {
        categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
    }
}

// Count check
if (records.length !== REQUIRED_COUNT) {
    console.error(`Record count mismatch: expected exactly ${REQUIRED_COUNT}, found ${records.length}`);
    errors++;
}

console.log("\nEstimate It Dataset Validation\n");
console.log(`Records checked:   ${records.length}`);
console.log(`Unique questions:  ${seenQuestions.size}`);
console.log(`Total errors:      ${errors}`);
console.log("\nCategory Distribution:");
for (const [cat, count] of Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat.padEnd(20)} ${count}`);
}

if (errors > 0) {
    console.error(`\nValidation FAILED with ${errors} error(s).`);
    process.exit(1);
}

console.log("\nValidation PASSED. All 4,000 records are valid.");

