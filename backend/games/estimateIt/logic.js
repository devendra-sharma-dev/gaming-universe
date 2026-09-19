/* Estimate It — Pure game logic (no DB dependency, easy to test) */

const TOTAL_ROUNDS = 5;
const TOTAL_CHIPS = 1000;
const MIN_BET = 100;
const MAX_BET = 400;
const BET_INCREMENT = 50;
const TIMER_SECONDS = 60;

/* ── Scoring thresholds ─────────────────────────────────── */

const TIERS = [
    { max: 2,  multiplier: 5, label: "BULLSEYE",        emoji: "🎯" },
    { max: 5,  multiplier: 3, label: "EXCELLENT",       emoji: "🔥" },
    { max: 20, multiplier: 2, label: "GOOD GUESS",      emoji: "👍" },
    { max: 50, multiplier: 1, label: "IN THE BALLPARK", emoji: "🙂" }
];
const WAY_OFF = { multiplier: 0, label: "WAY OFF", emoji: "💀" };

const getTier = (percentageError) => {
    for (const tier of TIERS) {
        if (percentageError < tier.max) return tier;
    }
    if (percentageError <= 50) return TIERS[TIERS.length - 1];
    return WAY_OFF;
};

/* ── Percentage error ───────────────────────────────────── */

const calculatePercentageError = (estimate, actual) => {
    if (actual === 0) return estimate === 0 ? 0 : 100;
    return Math.abs(estimate - actual) / Math.abs(actual) * 100;
};

/* ── XP from bet + multiplier ───────────────────────────── */

const calculateXp = (bet, multiplier) =>
    Math.round((bet / 100) * 10 * multiplier);

/* ── Bet validation ─────────────────────────────────────── */

const maxBetForRound = (remainingChips, currentRound) => {
    if (currentRound === TOTAL_ROUNDS) return remainingChips;
    const roundsLeft = TOTAL_ROUNDS - currentRound;
    const reserveForRemaining = roundsLeft * MIN_BET;
    return Math.min(MAX_BET, remainingChips - reserveForRemaining);
};

const validateBet = (bet, remainingChips, currentRound) => {
    if (currentRound === TOTAL_ROUNDS) {
        return bet === remainingChips;
    }
    if (!Number.isInteger(bet)) return false;
    if (bet < MIN_BET) return false;
    if (bet % BET_INCREMENT !== 0) return false;
    const allowed = maxBetForRound(remainingChips, currentRound);
    return bet >= MIN_BET && bet <= allowed;
};

/* ── Parse user estimate input ──────────────────────────── */

const parseEstimate = (input) => {
    if (input == null) return null;
    let str = String(input).trim();
    if (!str) return null;

    // Strip commas
    str = str.replace(/,/g, "");

    // Handle suffixes: K, M, B, T (case-insensitive)
    const suffixMatch = str.match(/^([0-9]*\.?[0-9]+)\s*([KkMmBbTt])$/);
    if (suffixMatch) {
        const num = parseFloat(suffixMatch[1]);
        const suffix = suffixMatch[2].toUpperCase();
        const multipliers = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 };
        const result = num * (multipliers[suffix] || 1);
        if (!Number.isFinite(result) || result < 0) return null;
        return result;
    }

    const parsed = parseFloat(str);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return parsed;
};

/* ── Deterministic daily question selection ──────────────── */
/* Uses FNV-1a hash (same as mystery country) to create
   a deterministic seed from a date string, then uses that
   seed to pick 5 indices from the available question pool. */

const fnv1a = (str) => {
    let hash = 2166136261;
    for (const char of str) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    return hash >>> 0;
};

const seededIndices = (date, poolSize, count) => {
    const seed = fnv1a(`estimate-it:${date}`);
    const indices = [];
    const used = new Set();
    let attempt = 0;
    while (indices.length < count && attempt < count * 100) {
        const hash = fnv1a(`${seed}:${attempt}`);
        const idx = hash % poolSize;
        if (!used.has(idx)) {
            used.add(idx);
            indices.push(idx);
        }
        attempt++;
    }
    return indices;
};

module.exports = {
    TOTAL_ROUNDS, TOTAL_CHIPS, MIN_BET, MAX_BET, BET_INCREMENT, TIMER_SECONDS,
    TIERS, WAY_OFF, getTier,
    calculatePercentageError, calculateXp,
    maxBetForRound, validateBet,
    parseEstimate,
    fnv1a, seededIndices
};

