const fs = require("fs");
const path = require("path");

const fallback = new Set(["street", "strong", "restart", "station", "answer", "inside", "orange", "out", "sound", "earth", "eat", "return", "action", "fiction", "fart"]);

let words = fallback;
const configuredPath = process.env.WORDNIK_GAMESET_PATH || path.resolve(__dirname, "../../Dictionary.txt");
if (configuredPath) {
    try {
        const file = path.resolve(configuredPath);
        const content = fs.readFileSync(file, "utf8");
        const loaded = content
            .split(/\r?\n/)
            .map((line) => line.trim().toLowerCase())
            .filter((word) => /^[a-z]+$/.test(word));
        if (loaded.length) {
            words = new Set(loaded);
            console.log(`Dictionary file loaded (${words.size} words).`);
        }
    } catch (_error) {
        console.warn("Dictionary file could not be loaded; development dictionary is active.");
    }
} else if (process.env.NODE_ENV !== "production") {
    console.warn("Dictionary file is not configured; development dictionary is active.");
}

const hasWord = (word) => words.has(word);
const sequenceCounts = new Map();
const countWordsContaining = (sequence) => {
    const key = String(sequence).toLowerCase();
    if (sequenceCounts.has(key)) return sequenceCounts.get(key);
    let count = 0;
    for (const word of words) {
        if (word.includes(key)) count += 1;
    }
    sequenceCounts.set(key, count);
    return count;
};
module.exports = { hasWord, countWordsContaining };
