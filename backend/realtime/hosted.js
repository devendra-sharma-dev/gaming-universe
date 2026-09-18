"use strict";

const crypto = require("node:crypto");
const { createSharedGames, publicRoom } = require("./sharedGames");

const actions = ["tic-tac-toe:queue", "tic-tac-toe:cancel", "tic-tac-toe:move",
    "word-bomb:quick-play", "word-bomb:solo-start", "word-bomb:create-room",
    "word-bomb:join-room", "word-bomb:start-room", "word-bomb:submit", "word-bomb:leave"];

function attachHostedGames(io, ready) {
    let games;
    const initialize = async () => {
        games = createSharedGames();
        await games.init();
    };
    io.on("connection", socket => {
        // The page token survives transport reconnects, but is never an account
        // credential. Bind it to both the browser session and authenticated user.
        const { connectionToken, browserToken } = socket.handshake.auth;
        if (!/^[a-f0-9]{64}$/.test(connectionToken || "")) {
            socket.disconnect(true);
            return;
        }
        const key = crypto.createHmac("sha256", process.env.SESSION_SECRET)
            .update(`${browserToken}:${connectionToken}:${socket.user.isGuest ? "guest" : socket.user.id}`).digest("hex");
        const guest = Boolean(socket.user.isGuest);
        const actor = { key, id: guest ? `guest:${key}` : socket.user.id,
            userId: guest ? null : socket.user.id,
            username: guest ? `Guest${key.slice(0, 8)}` : socket.user.username, isGuest: guest };
        socket.emit("word-bomb:identity", { id: actor.id, isGuest: guest });
        let stopped = false, timer, seenRoom, cursor = 0, fingerprint, heartbeat = 0;
        // Serialize actions and polling for this connection. Different instances
        // coordinate through MongoDB transactions, not through this local chain.
        let pending = Promise.resolve();
        const enqueue = task => {
            pending = pending.then(async () => { if (!stopped) await task(); }).catch(() => {
                if (!stopped) socket.emit("word-bomb:error", { message: "Game service temporarily unavailable. Please retry." });
            });
        };
        const checkSession = () => new Promise(resolve => {
            if (guest) return resolve(true);
            socket.request.session.reload(error => {
                const { matchesBrowserSession } = require("../services/browserSession");
                const session = socket.request.session;
                const valid = !error && String(session?.userId) === actor.userId && matchesBrowserSession(session, browserToken);
                if (!valid) { socket.emit("session:expired"); socket.disconnect(true); }
                resolve(valid);
            });
        });
        const sync = async () => {
            await ready();
            if (Date.now() - heartbeat >= 5000) {
                if (!await checkSession()) return;
                await games.touch(actor);
                heartbeat = Date.now();
            }
            const result = await games.read(actor);
            if (result.timeout === "tic-tac-toe") socket.emit("tic-tac-toe:matchmaking-timeout");
            if (result.timeout === "word-bomb") socket.emit("word-bomb:error", { message: "No player joined. Try live play again." });
            const room = result.room;
            if (!room) { seenRoom = null; fingerprint = null; return; }
            const state = publicRoom(room);
            if (seenRoom !== room._id) {
                seenRoom = room._id; cursor = 0; fingerprint = null;
                if (room.game === "tic-tac-toe") {
                    const player = room.players.find(p => p.key === key);
                    socket.emit("tic-tac-toe:matched", { match: state, ownSymbol: player.symbol,
                        opponentUsername: room.players.find(p => p.key !== key)?.username });
                }
            }
            const nextFingerprint = JSON.stringify(state);
            if (fingerprint !== nextFingerprint) {
                socket.emit(`${room.game}:state`, room.game === "word-bomb" ? { room: state } : { match: state });
                fingerprint = nextFingerprint;
            }
            for (const item of room.events) {
                if (item.number > cursor && (!item.target || item.target === key)) socket.emit(item.name, item.data);
            }
            cursor = room.sequenceNumber;
        };
        for (const name of actions) socket.on(name, (payload = {}) => enqueue(async () => {
            try {
                await ready();
                if (!await checkSession()) return;
                await games.touch(actor);
                const result = await games.act(actor, name, payload && typeof payload === "object" ? payload : {});
                if (result.queued) socket.emit(result.game === "tic-tac-toe" ? "tic-tac-toe:queue-status" : "word-bomb:queue", { status: "searching", timeoutMs: 8000 });
                if (result.invalid) socket.emit("word-bomb:invalid", { message: "That word is not accepted for this sequence." });
                if (result.created || result.solo) {
                    const { room } = await games.read(actor);
                    if (room) socket.emit(result.created ? "word-bomb:room-created" : "word-bomb:solo-started", { room: publicRoom(room) });
                }
                await sync();
            } catch (error) {
                // Database errors can contain connection information; expose only
                // validation errors constructed by the game engine.
                socket.emit(`${name.split(":")[0]}:error`, { message: error.publicMessage || "Game action failed. Please retry." });
            }
        }));
        const poll = () => {
            enqueue(sync);
            pending.finally(() => { if (!stopped) timer = setTimeout(poll, 1000); });
        };
        poll();
        socket.on("disconnect", () => {
            stopped = true;
            clearTimeout(timer);
            // Keep presence for 20 seconds so a new function can resume the room.
            // Remaining players settle expired presence through the same engine.
        });
    });
    return initialize;
}

module.exports = { attachHostedGames };
