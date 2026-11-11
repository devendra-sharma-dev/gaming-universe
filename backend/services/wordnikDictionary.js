const fs = require("fs");
const path = require("path");

const fallback = new Set(["street", "strong", "restart", "station", "answer", "inside", "orange", "out", "sound", "earth", "eat", "return", "action", "fiction", "fart"]);

const getDictionaryFilePath = () => {
    const configuredPath = process.env.WORDNIK_GAMESET_PATH || path.resolve(__dirname, "../../Dictionary.txt");
    return configuredPath ? path.resolve(configuredPath) : null;
};

let words = null;
const sequenceCounts = new Map();

const ensureWordsLoaded = () => {
    if (words) return words;
    words = fallback;
    const file = getDictionaryFilePath();
    if (file) {
        try {
            const content = fs.readFileSync(file, "utf8");
            const loaded = new Set();
            let start = 0;
            const len = content.length;
            while (start < len) {
                let end = content.indexOf("\n", start);
                if (end === -1) end = len;
                const word = content.slice(start, end).trim().toLowerCase();
                if (word && /^[a-z]+$/.test(word)) {
                    loaded.add(word);
                }
                start = end + 1;
            }
            if (loaded.size > 0) {
                words = loaded;
                console.log(`Dictionary file loaded (${words.size} words).`);
            }
        } catch (_error) {
            console.warn("Dictionary file could not be loaded; development dictionary is active.");
        }
    } else if (process.env.NODE_ENV !== "production") {
        console.warn("Dictionary file is not configured; development dictionary is active.");
    }
    return words;
};

const hasWord = (word) => ensureWordsLoaded().has(word);

const countWordsContaining = (sequence) => {
    const key = String(sequence).toLowerCase();
    if (sequenceCounts.has(key)) return sequenceCounts.get(key);
    const dict = ensureWordsLoaded();
    let count = 0;
    for (const word of dict) {
        if (word.includes(key)) count += 1;
    }
    sequenceCounts.set(key, count);
    return count;
};

module.exports = { hasWord, countWordsContaining, getDictionaryFilePath };
