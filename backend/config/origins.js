"use strict";

const allowedOrigins = new Set([
    process.env.FRONTEND_ORIGIN,
    ...(process.env.VERCEL ? [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL,
        process.env.VERCEL_PROJECT_PRODUCTION_URL].filter(Boolean).map(host => `https://${host}`) : []),
    ...(process.env.NODE_ENV !== "production" ? ["http://localhost:3000", "http://127.0.0.1:3000", "http://[::]:3000"] : [])
].filter(Boolean));

module.exports = { allowedOrigins, isAllowedOrigin: origin => !origin || allowedOrigins.has(origin) };
