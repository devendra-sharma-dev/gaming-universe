const assert = require("node:assert/strict");
const { once } = require("node:events");
const http = require("node:http");
const express = require("express");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { chromium } = require("@playwright/test");
const crypto = require("node:crypto");

// All database records are temporary. No real SMTP connection or .env credentials are used.
async function run() {
    const mail = new Map();
    let rejectMail = false;
    require("nodemailer").createTransport = () => ({
        sendMail: async ({ to, text }) => {
            if (rejectMail) throw Object.assign(new Error("Sensitive provider response must never be exposed"), { code: "EAUTH", responseCode: 535 });
            mail.set(to, text.match(/\b\d{6}\b/)[0]);
            return { accepted: [to] };
        },
        close() {}
    });
    const mongo = await MongoMemoryServer.create();
    const frontend = http.createServer(express().use(express.static("frontend")));
    frontend.listen(0, "127.0.0.1");
    await once(frontend, "listening");
    const frontOrigin = `http://127.0.0.1:${frontend.address().port}`;
    const reservation = http.createServer().listen(0, "127.0.0.1");
    await once(reservation, "listening");
    const port = reservation.address().port;
    await new Promise(resolve => reservation.close(resolve));
    Object.assign(process.env, { MONGODB_URI: mongo.getUri(), PORT: String(port), NODE_ENV: "test",
        SESSION_SECRET: crypto.randomBytes(32).toString("hex"), FRONTEND_ORIGIN: frontOrigin,
        SMTP_HOST: "smtp.invalid", SMTP_USER: "test", SMTP_PASS: "test", SMTP_FROM: "test@example.com" });
    const MongoStore = require("connect-mongo").default || require("connect-mongo");
    const originalCreate = MongoStore.create;
    let store;
    MongoStore.create = function (...args) { store = originalCreate.apply(this, args); return store; };
    const started = await require("../backend/server")();
    const apiOrigin = `http://127.0.0.1:${port}`;
    let browser;
    try {
        if (!started) throw new Error("Test API failed to start");
        const User = require("../backend/models/User");
        const Otp = require("../backend/models/OtpCode");
        await User.create({ email: "reserved@example.com", username: "TakenName", usernameNormalized: "takenname", xp: 0 });
        browser = await chromium.launch({ channel: process.env.TEST_BROWSER_CHANNEL || "msedge", headless: true });
        const contexts = [];
        const newContext = async () => {
            const context = await browser.newContext();
            await context.addInitScript(origin => {
                window.GAMING_UNIVERSE_API_ORIGIN = origin;
                // Reproduce local HTTP browsers where randomUUID is unavailable.
                Object.defineProperty(crypto, "randomUUID", { value: undefined });
            }, apiOrigin);
            contexts.push(context);
            return context;
        };
        const errors = [];
        const newPage = async (context, path = "/index.html") => {
            const page = await context.newPage();
            page.on("pageerror", error => errors.push(error.message));
            await page.goto(frontOrigin + path);
            await page.evaluate(() => window.GamingSession.ready);
            return page;
        };
        const api = (page, path, body) => page.evaluate(async ({ path, body, origin }) => {
            const response = await window.GamingSession.fetch(origin + "/api/v1" + path, {
                method: body === undefined ? "GET" : "POST", headers: { "Content-Type": "application/json" },
                body: body === undefined ? undefined : JSON.stringify(body)
            });
            return { status: response.status, body: await response.json() };
        }, { path, body, origin: apiOrigin });
        const expectText = async (page, selector, expected) => {
            await page.waitForFunction(({ selector, expected }) => document.querySelector(selector)?.textContent.includes(expected), { selector, expected });
        };
        const emailStep = async (page, email) => {
            await page.locator(".navigation-player").click();
            await page.locator('[name="email"]').fill(email);
            await page.locator('.auth-form [type="submit"]').click();
            await page.locator('[name="otp"]').waitFor();
        };
        const verifyStep = async (page, email) => {
            await page.locator('[name="otp"]').fill(mail.get(email));
            await page.locator('.auth-form [type="submit"]').click();
        };

        const context = await newContext();
        let page = await newPage(context);
        assert.equal((await api(page, "/users/me")).status, 401);
        assert.equal((await api(page, "/auth/register", { email: "fake@example.com", username: "Fake", xp: 9999 })).status, 400);
        await emailStep(page, "  NewPlayer@Example.com  ");
        assert(mail.has("newplayer@example.com"));
        assert.equal((await api(page, "/auth/otp/send", { email: "NEWPLAYER@example.com" })).status, 429);
        const otp = mail.get("newplayer@example.com");
        await verifyStep(page, "newplayer@example.com");
        await page.locator('[name="username"]').waitFor();
        await page.locator('[name="username"]').fill("TAKENNAME");
        await expectText(page, "#username-status", "already taken");
        assert(await page.locator('.auth-form [type="submit"]').isDisabled());
        await page.locator('[name="username"]').fill("NewPlayer");
        await expectText(page, "#username-status", "available");
        await page.locator('.auth-form [type="submit"]').click();
        await expectText(page, ".player-name", "@NewPlayer");
        assert.equal((await api(page, "/auth/otp/verify", { email: "newplayer@example.com", otp })).status, 400);
        const account = await User.findOne({ email: "newplayer@example.com" });
        assert.equal(account.xp, 0);
        assert.equal(await User.countDocuments({ email: "newplayer@example.com" }), 1);
        assert.equal((await api(page, "/games/tic-tac-toe/computer/matches", {})).status, 201);
        console.log("PASS email verification, live case-insensitive username validation, account creation, OTP reuse, protected game access");

        const otherTab = await newPage(context, "/word-bomb.html");
        assert.equal((await api(otherTab, "/users/me")).body.data.username, "NewPlayer");
        await otherTab.evaluate(() => window.GamingSession.loadSocketClient());
        const socketIdentity = await otherTab.evaluate(origin => new Promise(resolve => {
            const socket = window.io(origin, { forceNew: true, withCredentials: true, auth: window.GamingSession.socketAuth });
            socket.on("word-bomb:identity", value => { socket.disconnect(); resolve(value); });
        }), apiOrigin);
        assert.equal(socketIdentity.isGuest, false);
        assert.equal(socketIdentity.id, String(account._id));
        assert.equal(await otherTab.evaluate(async origin => (await fetch(origin + "/api/v1/users/me", { credentials: "include" })).status, apiOrigin), 401);
        await page.close();
        await otherTab.reload();
        assert.equal((await api(otherTab, "/users/me")).status, 200);
        await otherTab.goto(frontOrigin + "/game.html");
        assert.equal((await api(otherTab, "/users/me")).status, 200);
        assert((await context.cookies()).some(cookie => cookie.name === "gaming_universe.sid" && cookie.expires === -1));
        await otherTab.close();
        page = await newPage(context);
        assert.equal((await api(page, "/users/me")).status, 401);
        console.log("PASS shared tabs, refresh, navigation, session cookie, closing all tabs then reopening");

        await User.updateOne({ _id: account._id }, { $set: { xp: 145 } });
        await Otp.updateOne({ email: account.email }, { $set: { lastSentAt: new Date(0) } });
        await emailStep(page, "NEWPLAYER@example.com");
        await verifyStep(page, "newplayer@example.com");
        await expectText(page, ".player-name", "@NewPlayer");
        assert.equal((await api(page, "/users/me")).body.data.xp, 145);
        assert.equal(await User.countDocuments({ email: account.email }), 1);
        const loggedInTab = await newPage(context);
        await page.locator(".navigation-player").click();
        await page.locator("[data-auth-logout]").click();
        await expectText(loggedInTab, ".player-name", "GUEST");
        assert.equal((await api(loggedInTab, "/users/me")).status, 401);
        console.log("PASS returning email signs into existing account, original XP loaded, logout synchronizes tabs");

        rejectMail = true;
        const deliveryFailure = await api(page, "/auth/otp/send", { email: "delivery@example.com" });
        assert.equal(deliveryFailure.status, 502);
        assert.equal(deliveryFailure.body.error.message, "We could not send your code. Please try again shortly.");
        assert.equal(await Otp.countDocuments({ email: "delivery@example.com" }), 0);
        rejectMail = false;
        assert.equal((await api(page, "/auth/otp/send", { email: "limits@example.com" })).status, 200);
        const wrongCode = mail.get("limits@example.com") === "111111" ? "222222" : "111111";
        for (let index = 0; index < 5; index++) assert.equal((await api(page, "/auth/otp/verify", { email: "limits@example.com", otp: wrongCode })).status, 400);
        assert.equal((await api(page, "/auth/otp/verify", { email: "limits@example.com", otp: mail.get("limits@example.com") })).status, 400);
        console.log("PASS mail failures do not claim success; five-attempt OTP limit enforced");

        await api(page, "/auth/otp/send", { email: "race@example.com" });
        await api(page, "/auth/otp/verify", { email: "race@example.com", otp: mail.get("race@example.com") });
        const registrations = await Promise.all([
            api(page, "/auth/register", { username: "RacePlayer", email: "spoof@example.com", xp: 99999 }),
            api(page, "/auth/register", { username: "RacePlayer", email: "spoof@example.com", xp: 99999 })
        ]);
        assert(registrations.every(result => result.status === 200 || result.status === 201));
        assert.equal(await User.countDocuments({ email: "race@example.com" }), 1);
        assert.equal((await User.findOne({ email: "race@example.com" })).xp, 0);
        assert.equal(await User.countDocuments({ email: "spoof@example.com" }), 0);
        await api(page, "/auth/otp/send", { email: "collision@example.com" });
        await api(page, "/auth/otp/verify", { email: "collision@example.com", otp: mail.get("collision@example.com") });
        assert.equal((await api(page, "/auth/register", { username: "rAcEpLaYeR" })).status, 409);
        await api(page, "/auth/otp/send", { email: "expired@example.com" });
        await Otp.updateOne({ email: "expired@example.com" }, { $set: { expiresAt: new Date(0) } });
        assert.equal((await api(page, "/auth/otp/verify", { email: "expired@example.com", otp: mail.get("expired@example.com") })).status, 400);
        console.log("PASS concurrent signup, database username uniqueness, forged email/XP rejection, OTP expiry, socket session binding");

        const guestContext = await newContext();
        const rivalContext = await newContext();
        const guest = await newPage(guestContext, "/word-bomb.html");
        const rival = await newPage(rivalContext, "/word-bomb.html");
        await guest.locator("#word-bomb-create").click();
        await expectText(guest, "#word-bomb-turn", "ROOM");
        const code = (await guest.locator("#word-bomb-turn").textContent()).match(/ROOM ([A-F0-9]{6})/)[1];
        await rival.locator("#word-bomb-code").fill(code);
        await rival.locator("#word-bomb-join").click();
        await guest.locator("#word-bomb-start").waitFor({ state: "visible" });
        await guest.locator("#word-bomb-start").click();
        await expectText(guest, "#word-bomb-message", "Find a word");
        await rival.close();
        await expectText(guest, "#word-bomb-feed", "not saved");
        await expectText(guest, "#word-bomb-identity", "30 XP");
        assert.equal((await User.findById(account._id)).xp, 145);
        await guest.goto(frontOrigin + "/index.html");
        await Otp.updateOne({ email: account.email }, { $set: { lastSentAt: new Date(0) } });
        await emailStep(guest, account.email);
        await verifyStep(guest, account.email);
        await expectText(guest, ".player-name", "@NewPlayer");
        assert.equal((await api(guest, "/users/me")).body.data.xp, 145);
        console.log("PASS guest multiplayer remains playable, guest XP calculated but not stored or merged at login");
        assert.deepEqual(errors, [], "Browser JavaScript errors");
        for (const context of contexts) await context.close();
    } finally {
        await browser?.close();
        if (started) await new Promise(resolve => started.io.close(resolve));
        await new Promise(resolve => frontend.close(resolve));
        await store?.close();
        await mongoose.disconnect();
        await mongo.stop();
    }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
