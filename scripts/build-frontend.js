"use strict";

const fs = require("node:fs");
const path = require("node:path");

// Only this public URL is embedded in the static site. Never copy .env.
const configuredOrigin = process.env.PUBLIC_API_ORIGIN;
const url = configuredOrigin ? new URL(configuredOrigin) : null;
if (url && (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash)) {
    throw new Error("PUBLIC_API_ORIGIN must be an HTTPS origin without credentials, a path, query, or fragment.");
}

const root = path.resolve(__dirname, "..");
const output = path.join(root, "dist");
fs.mkdirSync(output, { recursive: true });
fs.cpSync(path.join(root, "frontend"), output, { recursive: true });
const sessionPath = path.join(output, "js", "session.js");
const sessionSource = fs.readFileSync(path.join(root, "frontend", "js", "session.js"), "utf8");
fs.writeFileSync(sessionPath,
    `window.GAMING_UNIVERSE_API_ORIGIN = ${url ? JSON.stringify(url.origin) : "window.location.origin"};\n${sessionSource}`);
console.log("Frontend built in dist with API origin " + (url?.origin || "same origin"));
