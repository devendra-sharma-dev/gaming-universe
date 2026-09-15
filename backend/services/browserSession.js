const crypto = require("crypto");
const createHttpError = require("../utils/httpError");

const tokenHash = (token) => {
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return null;
    return crypto.createHash("sha256").update(token).digest("hex");
};
const requestTokenHash = (request) => {
    const hash = tokenHash(request.get("X-Browser-Session"));
    if (!hash) throw createHttpError(400, "Refresh this page before signing in.");
    return hash;
};
const matchesBrowserSession = (session, token) => {
    const hash = tokenHash(token);
    return Boolean(hash && session?.browserTokenHash === hash);
};

module.exports = { tokenHash, requestTokenHash, matchesBrowserSession };
