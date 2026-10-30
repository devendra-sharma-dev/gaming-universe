"use strict";

const allowedOrigins = new Set([
    process.env.FRONTEND_ORIGIN,
    ...(process.env.VERCEL ? [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL,
        process.env.VERCEL_PROJECT_PRODUCTION_URL].filter(Boolean).map(host => `https://${host}`) : []),
    ...(process.env.NODE_ENV !== "production" ? ["http://localhost:3000", "http://127.0.0.1:3000", "http://[::]:3000"] : [])
].filter(Boolean));

const isAllowedOrigin = (origin) => {
    if (!origin) return true;
    if (allowedOrigins.has(origin)) return true;
    try {
        const parsed = new URL(origin);
        if (parsed.hostname.endsWith(".vercel.app")) return true;
        if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") return true;
    } catch {}
    return false;
};

module.exports = { allowedOrigins, isAllowedOrigin };
