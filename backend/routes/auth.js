const express = require("express");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const createHttpError = require("../utils/httpError");
const { issueOtp, verifyOtp, normalizeEmail, validateEmail } = require("../services/otp");
const { requestTokenHash, matchesBrowserSession } = require("../services/browserSession");

const router = express.Router();
const MongoRateLimitStore = require("../services/rateLimitStore");
const limiter = (limit) => rateLimit({ windowMs: 15 * 60 * 1000, limit,
    ...(process.env.VERCEL ? { store: new MongoRateLimitStore(`auth-${limit}`) } : {}),
    standardHeaders: "draft-7", legacyHeaders: false,
    message: { success: false, error: { message: "Too many attempts. Please try again later." } } });
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const saveSession = (req) => new Promise((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
const regenerate = (req) => new Promise((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
const establishSession = async (req, userId, browserTokenHash) => {
    await regenerate(req);
    req.session.userId = String(userId);
    req.session.browserTokenHash = browserTokenHash;
    await saveSession(req);
};
const usernameValue = (value) => {
    const username = String(value || "").trim();
    if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) throw createHttpError(400, "Use 3–20 letters, numbers, or underscores.");
    return username;
};

router.post("/otp/send", limiter(10), asyncRoute(async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const browserTokenHash = requestTokenHash(req);
    await issueOtp({ email, browserTokenHash });
    res.json({ success: true, data: { sent: true, email, retryAfter: 60 } });
}));

router.post("/otp/verify", limiter(30), asyncRoute(async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const browserTokenHash = requestTokenHash(req);
    await verifyOtp({ email, otp: req.body.otp, browserTokenHash });
    const user = await User.findOne({ email });
    if (user) {
        await establishSession(req, user._id, browserTokenHash);
        return res.json({ success: true, data: { user, needsUsername: false } });
    }
    await regenerate(req);
    req.session.browserTokenHash = browserTokenHash;
    req.session.otpVerification = { email, verifiedAt: Date.now() };
    await saveSession(req);
    res.json({ success: true, data: { needsUsername: true } });
}));

router.get("/username/check", limiter(120), asyncRoute(async (req, res) => {
    const username = usernameValue(req.query.username);
    const exists = await User.exists({ usernameNormalized: username.toLowerCase() });
    res.json({ success: true, data: { username, available: !exists } });
}));

router.post("/register", limiter(30), asyncRoute(async (req, res) => {
    const browserTokenHash = requestTokenHash(req);
    const verification = req.session?.otpVerification;
    if (!matchesBrowserSession(req.session, req.get("X-Browser-Session")) || !verification ||
        Date.now() - verification.verifiedAt > 15 * 60 * 1000) {
        throw createHttpError(400, "Verify your email code before choosing a username.");
    }
    const email = normalizeEmail(verification.email);
    validateEmail(email);
    const username = usernameValue(req.body.username);
    // Never trust XP, email, or verification flags from the registration payload.
    let user = await User.findOne({ email });
    let created = false;
    if (!user) {
        try {
            user = await User.create({ email, emailVerified: true, username, usernameNormalized: username.toLowerCase() });
            created = true;
        } catch (error) {
            if (error.code !== 11000) throw error;
            user = await User.findOne({ email });
            if (!user) throw createHttpError(409, "That username is already taken. Please choose another.");
        }
    }
    await establishSession(req, user._id, browserTokenHash);
    res.status(created ? 201 : 200).json({ success: true, data: { user, needsUsername: false } });
}));

router.post("/logout", asyncRoute(async (req, res) => {
    if (matchesBrowserSession(req.session, req.get("X-Browser-Session"))) {
        await new Promise((resolve, reject) => req.session.destroy(error => error ? reject(error) : resolve()));
        res.clearCookie("gaming_universe.sid", { path: "/", httpOnly: true,
            sameSite: process.env.NODE_ENV === "production" && !process.env.VERCEL ? "none" : "lax", secure: process.env.NODE_ENV === "production" });
    }
    res.json({ success: true, data: { loggedOut: true } });
}));

module.exports = router;
