"use strict";

const rawCountries = require("../../data/mysteryCountries");

// Clean list of recognized countries worldwide
const countries = rawCountries.map((c) => {
    let name = c.name;
    if (c.code === "GB") name = "Great Britain";
    return {
        code: c.code,
        name,
        flag: c.flag
    };
}).sort((a, b) => a.name.localeCompare(b.name));

const countryByCode = new Map(countries.map((c) => [c.code, c]));

// The 16 fixed strong sports nations requested
const STRONG_SPORTS_COUNTRIES = [
    { code: "IN", name: "India", flag: "🇮🇳" },
    { code: "US", name: "United States", flag: "🇺🇸" },
    { code: "JP", name: "Japan", flag: "🇯🇵" },
    { code: "FR", name: "France", flag: "🇫🇷" },
    { code: "GB", name: "Great Britain", flag: "🇬🇧" },
    { code: "CN", name: "China", flag: "🇨🇳" },
    { code: "AU", name: "Australia", flag: "🇦🇺" },
    { code: "DE", name: "Germany", flag: "🇩🇪" },
    { code: "IT", name: "Italy", flag: "🇮🇹" },
    { code: "BR", name: "Brazil", flag: "🇧🇷" },
    { code: "CA", name: "Canada", flag: "🇨🇦" },
    { code: "KR", name: "South Korea", flag: "🇰🇷" },
    { code: "ES", name: "Spain", flag: "🇪🇸" },
    { code: "NL", name: "Netherlands", flag: "🇳🇱" },
    { code: "SE", name: "Sweden", flag: "🇸🇪" },
    { code: "NZ", name: "New Zealand", flag: "🇳🇿" }
];

// Strength ratings for each sport (Archery, Sprint, Table Tennis, Weightlifting, Fencing)
// Values reflect authentic Olympic disciplines
const configuredProfiles = {
    IN: { archery: 86, sprint: 76, tableTennis: 82, weightlifting: 85, fencing: 77 },
    US: { archery: 82, sprint: 93, tableTennis: 75, weightlifting: 84, fencing: 86 },
    JP: { archery: 85, sprint: 81, tableTennis: 91, weightlifting: 78, fencing: 88 },
    FR: { archery: 82, sprint: 83, tableTennis: 81, weightlifting: 76, fencing: 93 },
    GB: { archery: 81, sprint: 87, tableTennis: 77, weightlifting: 79, fencing: 85 },
    CN: { archery: 88, sprint: 79, tableTennis: 96, weightlifting: 94, fencing: 82 },
    AU: { archery: 82, sprint: 85, tableTennis: 77, weightlifting: 78, fencing: 79 },
    DE: { archery: 84, sprint: 83, tableTennis: 89, weightlifting: 83, fencing: 86 },
    IT: { archery: 87, sprint: 85, tableTennis: 75, weightlifting: 81, fencing: 92 },
    BR: { archery: 79, sprint: 81, tableTennis: 85, weightlifting: 78, fencing: 76 },
    CA: { archery: 78, sprint: 86, tableTennis: 76, weightlifting: 81, fencing: 81 },
    KR: { archery: 96, sprint: 76, tableTennis: 88, weightlifting: 80, fencing: 87 },
    ES: { archery: 80, sprint: 81, tableTennis: 76, weightlifting: 80, fencing: 84 },
    NL: { archery: 83, sprint: 84, tableTennis: 75, weightlifting: 76, fencing: 82 },
    SE: { archery: 79, sprint: 79, tableTennis: 91, weightlifting: 79, fencing: 81 },
    NZ: { archery: 78, sprint: 80, tableTennis: 74, weightlifting: 80, fencing: 78 }
};

const DEFAULT_PROFILE = {
    archery: 75,
    sprint: 75,
    tableTennis: 75,
    weightlifting: 75,
    fencing: 75
};

const getCountryByCode = (code) => {
    if (!code) return null;
    return countryByCode.get(String(code).toUpperCase()) || null;
};

const getAllCountries = () => countries;

const searchCountries = (query) => {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return countries;
    return countries.filter((c) => {
        const nameMatch = c.name.toLowerCase().includes(q);
        const codeMatch = c.code.toLowerCase().includes(q);
        const aliasMatch = (c.code === "GB" && "united kingdom".includes(q)) ||
                           (c.code === "KR" && "korea".includes(q));
        return nameMatch || codeMatch || aliasMatch;
    });
};

const getCountryProfile = (code) => {
    const upper = String(code || "").toUpperCase();
    if (configuredProfiles[upper]) {
        return { ...configuredProfiles[upper] };
    }
    // Deterministic pseudo-variation based on country code char codes
    let hash = 0;
    for (let i = 0; i < upper.length; i++) {
        hash = (hash * 31 + upper.charCodeAt(i)) % 1000;
    }
    const offset = (hash % 11) - 5;
    return {
        archery: Math.max(65, Math.min(88, DEFAULT_PROFILE.archery + offset)),
        sprint: Math.max(65, Math.min(88, DEFAULT_PROFILE.sprint + ((hash * 3) % 11 - 5))),
        tableTennis: Math.max(65, Math.min(88, DEFAULT_PROFILE.tableTennis + ((hash * 7) % 11 - 5))),
        weightlifting: Math.max(65, Math.min(88, DEFAULT_PROFILE.weightlifting + ((hash * 13) % 11 - 5))),
        fencing: Math.max(65, Math.min(88, DEFAULT_PROFILE.fencing + ((hash * 17) % 11 - 5)))
    };
};

/**
 * Opponent Selection Rule:
 * 16 fixed strong sports nations:
 * India, United States, Japan, France, Great Britain, China, Australia,
 * Germany, Italy, Brazil, Canada, South Korea, Spain, Netherlands, Sweden, New Zealand.
 *
 * If user selects one of these 16:
 * -> Use the other 15 from this exact list as opponents.
 * If user selects a country outside these 16:
 * -> Remove New Zealand (NZ), and use the remaining 15 strong nations as opponents.
 *
 * Result: Exactly 15 distinct strong opponent countries, exactly 16 total participants.
 */
const selectOpponents = (playerCountryCode, count = 15) => {
    const playerCodeUpper = String(playerCountryCode || "").toUpperCase();
    const isPlayerInStrongList = STRONG_SPORTS_COUNTRIES.some((c) => c.code === playerCodeUpper);

    let opponents;
    if (isPlayerInStrongList) {
        // Player is one of the 16 -> use the other 15
        opponents = STRONG_SPORTS_COUNTRIES.filter((c) => c.code !== playerCodeUpper);
    } else {
        // Player is outside the 16 -> remove New Zealand and use the 15 remaining
        opponents = STRONG_SPORTS_COUNTRIES.filter((c) => c.code !== "NZ");
    }

    if (opponents.length !== count) {
        throw new Error(`Expected exactly ${count} opponents, got ${opponents.length}`);
    }

    return opponents;
};

module.exports = {
    countries,
    countryByCode,
    STRONG_SPORTS_COUNTRIES,
    getAllCountries,
    getCountryByCode,
    searchCountries,
    getCountryProfile,
    selectOpponents,
    DEFAULT_PROFILE
};
