"use strict";
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const { createSharedGames, publicRoom, PRESENCE_MS } = require("../backend/realtime/sharedGames");
const User = require("../backend/models/User");

async function run() {
    const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    try {
        await mongoose.connect(mongo.getUri());
        await User.init();
        let clock = Date.now();
        const first = createSharedGames({ now: () => clock });
        const second = createSharedGames({ now: () => clock });
        await first.init();
        const MongoRateLimitStore = require("../backend/services/rateLimitStore");
        const limitA = new MongoRateLimitStore("test"), limitB = new MongoRateLimitStore("test");
        limitA.init({ windowMs: 60000 }); limitB.init({ windowMs: 60000 });
        const hits = await Promise.all(Array.from({ length: 8 }, (_, i) => (i % 2 ? limitA : limitB).increment("127.0.0.1")));
        assert.equal(Math.max(...hits.map(hit => hit.totalHits)), 8);
        await mongoose.connection.collection("authRateLimits").updateOne({ _id: limitA.key("127.0.0.1") }, { $set: { resetTime: new Date(0) } });
        assert.equal((await limitB.increment("127.0.0.1")).totalHits, 1);
        console.log("PASS shared request limits and atomic window reset");
        const actor = async name => {
            const user = await User.create({ email: `${name}@example.com`, username: name, usernameNormalized: name.toLowerCase(), xp: 0 });
            return { key: name, id: String(user._id), userId: String(user._id), username: name, isGuest: false };
        };
        const a = await actor("Alpha"), b = await actor("Bravo"), c = await actor("Charlie");
        for (const player of [a, b, c]) await first.touch(player);
        await first.act(a, "tic-tac-toe:queue");
        await Promise.all([second.act(b, "tic-tac-toe:queue"), first.act(c, "tic-tac-toe:queue")]);
        let room = (await second.read(a)).room;
        assert.equal(room.players.length, 2);
        const opponent = room.players.find(p => p.key !== a.key);
        const other = opponent.key === b.key ? c : b;
        assert.equal((await first.read(other)).queued, "tic-tac-toe");
        await assert.rejects(second.act(other, "tic-tac-toe:move", { matchId: room._id, cell: 0 }), /Match not found/);
        const duplicate = await Promise.allSettled([
            first.act(a, "tic-tac-toe:move", { matchId: room._id, cell: 0 }),
            second.act(a, "tic-tac-toe:move", { matchId: room._id, cell: 1 })
        ]);
        assert.equal(duplicate.filter(r => r.status === "fulfilled").length, 1);
        room = (await second.read(a)).room;
        assert.equal(room.board.filter(Boolean).length, 1);
        const firstCell = room.board.indexOf("X");
        await second.act(opponent, "tic-tac-toe:move", { matchId: room._id, cell: 3 });
        await first.act(a, "tic-tac-toe:move", { matchId: room._id, cell: firstCell === 0 ? 1 : 0 });
        await second.act(opponent, "tic-tac-toe:move", { matchId: room._id, cell: 4 });
        await Promise.allSettled([
            first.act(a, "tic-tac-toe:move", { matchId: room._id, cell: 2 }),
            second.act(a, "tic-tac-toe:move", { matchId: room._id, cell: 2 })
        ]);
        assert.equal((await User.findById(a.id)).xp, 30);
        assert.equal((await second.read(a)).room.status, "won");
        assert.equal((await second.read(a)).room.events.filter(e => e.name === "tic-tac-toe:xp-awarded").length, 1);
        console.log("PASS cross-instance matchmaking, concurrent moves, membership and atomic XP");

        await first.act(a, "word-bomb:create-room");
        room = (await second.read(a)).room;
        await second.act(b, "word-bomb:join-room", { code: room.code });
        await assert.rejects(second.act(b, "word-bomb:start-room"), /host/);
        await first.act(a, "word-bomb:start-room");
        await assert.rejects(first.act(a, "word-bomb:start-room"), /host/);
        room = (await second.read(a)).room;
        const oldDeadline = room.deadline;
        clock += 15000;
        await first.touch(a); await second.touch(b);
        const freshInstance = createSharedGames({ now: () => clock });
        assert.equal((await freshInstance.read(a)).room._id, room._id);
        clock = oldDeadline + 1;
        await first.touch(a); await second.touch(b);
        await Promise.all([first.read(a), second.read(b)]);
        room = (await freshInstance.read(a)).room;
        assert.equal(room.players[0].lives, 2);
        assert.equal(room.round, 2);
        assert.equal(room.events.filter(e => e.name === "word-bomb:penalty").length, 1);
        const state = publicRoom(room);
        assert(!JSON.stringify(state).includes('"key"'));
        console.log("PASS room recovery on a fresh instance, deadline race, private state filtering");

        clock += PRESENCE_MS + 1;
        await first.touch(a);
        await Promise.all([first.read(a), freshInstance.read(a)]);
        room = (await first.read(a)).room;
        assert.equal(room.status, "finished");
        assert.equal((await User.findById(a.id)).xp, 60);
        assert.equal(room.events.filter(e => e.name === "word-bomb:finished").length, 1);
        const guest = { key: "guest", id: "guest:guest", username: "Guest123", isGuest: true, userId: null };
        await first.touch(guest); await second.touch(b);
        await first.act(guest, "word-bomb:create-room");
        const guestRoom = (await first.read(guest)).room;
        await second.act(b, "word-bomb:join-room", { code: guestRoom.code });
        await first.act(guest, "word-bomb:start-room");
        await second.act(b, "word-bomb:leave");
        const finished = (await first.read(guest)).room.events.find(e => e.name === "word-bomb:finished");
        assert.equal(finished.data.xpSaved, false);
        assert.equal(finished.data.xpEarned, 30);
        assert.equal(await User.countDocuments(), 3);
        console.log("PASS disconnect grace, single winner reward and guest XP isolation");
    } finally {
        await mongoose.disconnect();
        await mongo.stop();
    }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
