const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");

const source = fs.readFileSync("frontend/js/session.js", "utf8");
const createPage = (overrides = {}, stored = new Map()) => {
    const requests = [];
    const context = {
        window: { location: { hostname: "localhost", reload() {} } },
        navigator: {},
        // Match browsers that expose getRandomValues but not randomUUID on HTTP.
        crypto: { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) },
        Uint8Array, Headers, setTimeout, clearTimeout,
        sessionStorage: { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) },
        fetch: async (url, options) => { requests.push({ url, options }); return { ok: true }; },
        ...overrides
    };
    vm.runInNewContext(source, context, { filename: "session.js" });
    return { session: context.window.GamingSession, requests };
};

async function run() {
    const storage = new Map();
    const first = createPage({}, storage);
    assert(first.session, "Session helper must initialize without randomUUID");
    assert.equal(first.session.apiOrigin, "http://localhost:5051");
    const lan = createPage({ window: { location: { hostname: "192.168.0.10", protocol: "http:" } } });
    await lan.session.ready;
    assert.equal(lan.session.apiOrigin, "http://192.168.0.10:5051");
    await first.session.fetch("http://localhost:5051/api/v1/users/me");
    const token = first.requests[0].options.headers.get("X-Browser-Session");
    assert.match(token, /^[a-f0-9]{64}$/);
    assert.equal(first.requests[0].options.credentials, "include");
    const socket = await new Promise(resolve => first.session.socketAuth(resolve));
    assert.equal(socket.browserToken, token);
    const reload = createPage({}, storage);
    await reload.session.fetch("/test");
    assert.equal(reload.requests[0].options.headers.get("X-Browser-Session"), token);
    const fresh = createPage();
    await fresh.session.fetch("/test");
    assert.notEqual(fresh.requests[0].options.headers.get("X-Browser-Session"), token);

    for (const overrides of [
        { BroadcastChannel: class { constructor() { throw new Error("Messaging blocked"); } } },
        { navigator: { locks: { request: () => Promise.reject(new Error("Locks blocked")) } } },
        { navigator: { locks: { request() { throw new Error("Locks blocked"); } } } },
        { sessionStorage: { getItem() { throw new Error("Storage blocked"); }, setItem() { throw new Error("Storage blocked"); } } }
    ]) {
        const page = createPage(overrides);
        await page.session.fetch("/test");
        assert.match(page.requests[0].options.headers.get("X-Browser-Session"), /^[a-f0-9]{64}$/);
    }
    console.log("Session compatibility tests passed: HTTP crypto, API/socket token binding, reload, fresh visit, blocked messaging/locks/storage.");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
