"use strict";

// MongoDB is the authority for hosted games. Transactions serialize competing
// moves, matchmaking, deadlines and XP; no room belongs to a function instance.
const crypto = require("node:crypto");
const mongoose = require("mongoose");
const User = require("../models/User");
const { getBoardResult } = require("../games/ticTacToe");
const { hasWord, countWordsContaining } = require("../services/wordnikDictionary");
const TURN_MS = 20000;
const PRESENCE_MS = 20000;
const sequences = ["AT", "AN", "IN", "ER", "RE", "ST", "ON", "OU", "EA", "AR", "TION", "ING", "STR", "EAR"];
const chooseSequence = () => {
    const viable = sequences.filter(value => countWordsContaining(value) >= 10);
    return viable[Math.floor(Math.random() * viable.length)] || "AT";
};
const rejectAction = message => Object.assign(new Error(message), { publicMessage: message });
const terminal = room => !["lobby", "active"].includes(room.status);
const event = (room, name, data, target = null) => {
    room.sequenceNumber += 1;
    room.events.push({ number: room.sequenceNumber, name, data, target });
    room.events = room.events.slice(-50);
};
const publicRoom = room => room.game === "tic-tac-toe" ? {
    matchId: room._id, mode: "multiplayer", board: room.board,
    currentTurn: room.currentTurn, status: room.status, winner: room.winnerSymbol,
    winnerUsername: room.players.find(p => p.symbol === room.winnerSymbol)?.username || null,
    winningCells: room.winningCells,
    players: room.players.map(({ username, symbol }) => ({ username, symbol }))
} : {
    matchId: room._id, code: room.code, mode: room.mode, status: room.status,
    sequence: room.sequence, round: room.round, deadline: room.deadline,
    turnPlayerId: room.players[room.turnIndex]?.id || null, winnerId: room.winnerId,
    hostId: room.players[0]?.id || null, usedWords: room.usedWords.slice(-50),
    players: room.players.map(({ id, username, lives, eliminated, isGuest, alphabetProgress, streak }) =>
        ({ id, username, lives, eliminated, isGuest, alphabetProgress, streak }))
};

function createSharedGames({ now = Date.now } = {}) {
    const rooms = mongoose.connection.collection("realtimeRooms");
    const players = mongoose.connection.collection("realtimePlayers");
    const init = async () => {
        await rooms.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
        await rooms.createIndex({ code: 1 }, { unique: true, partialFilterExpression: { code: { $type: "string" } } });
        await players.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
        await players.createIndex({ queueGame: 1, queueUntil: 1 });
    };
    const transaction = async operation => {
        const session = await mongoose.startSession();
        try { return await session.withTransaction(() => operation(session)); }
        finally { await session.endSession(); }
    };
    const save = (room, session) => rooms.replaceOne({ _id: room._id }, room, { session });
    const reward = async (room, winner, session) => {
        if (!winner || winner.isGuest || room.xpAwarded) return null;
        const user = await User.findByIdAndUpdate(winner.userId, { $inc: { xp: 30 } }, { new: true, session }).select("xp");
        room.xpAwarded = Boolean(user);
        return user?.xp ?? null;
    };
    const finish = async (room, winner, reason, session) => {
        if (terminal(room)) return;
        room.status = "finished";
        room.winnerId = winner?.id || null;
        const totalXp = await reward(room, winner, session);
        event(room, "word-bomb:finished", {
            matchId: room._id, reason,
            winner: winner ? { id: winner.id, username: winner.username, isGuest: winner.isGuest } : null,
            xpEarned: winner && (winner.isGuest || totalXp !== null) ? 30 : 0,
            xpSaved: totalXp !== null, totalXp
        });
    };
    const nextTurn = room => {
        for (let step = 1; step <= room.players.length; step++) {
            const index = (room.turnIndex + step) % room.players.length;
            if (!room.players[index].eliminated) { room.turnIndex = index; break; }
        }
        room.sequence = chooseSequence();
        room.round += 1;
        room.deadline = now() + TURN_MS;
    };
    const removePlayer = async (room, key, session) => {
        const player = room.players.find(p => p.key === key);
        if (!player || terminal(room) || player.eliminated) return;
        if (room.game === "tic-tac-toe") {
            room.status = "abandoned";
            event(room, "tic-tac-toe:opponent-left", { message: "Your opponent left the match." });
        } else if (room.status === "lobby") {
            room.players = room.players.filter(p => p.key !== key);
            if (!room.players.length) room.status = "finished";
        } else {
            player.eliminated = true;
            player.lives = 0;
            const alive = room.players.filter(p => !p.eliminated);
            if (room.mode === "solo" || alive.length <= 1) await finish(room, room.mode === "solo" ? null : alive[0], "disconnect", session);
            else if (room.players[room.turnIndex]?.key === key) nextTurn(room);
        }
    };
    const settle = async (room, session) => {
        if (terminal(room)) return false;
        let changed = false;
        const present = await players.find({ _id: { $in: room.players.map(p => p.key) }, lastSeen: { $gt: now() - PRESENCE_MS } }, { session }).toArray();
        const live = new Set(present.map(p => p._id));
        for (const player of [...room.players]) {
            if (!player.eliminated && !live.has(player.key)) {
                await removePlayer(room, player.key, session);
                changed = true;
            }
        }
        if (room.game === "word-bomb" && room.status === "active" && room.deadline <= now()) {
            const player = room.players[room.turnIndex];
            player.lives -= 1;
            event(room, "word-bomb:penalty", { username: player.username, lives: player.lives, reason: "time" });
            if (player.lives <= 0) {
                player.eliminated = true;
                event(room, "word-bomb:eliminated", { username: player.username });
            }
            const alive = room.players.filter(p => !p.eliminated);
            if ((room.mode === "solo" && !alive.length) || (room.mode !== "solo" && alive.length <= 1)) {
                await finish(room, room.mode === "solo" ? null : alive[0], "last-player", session);
            } else nextTurn(room);
            changed = true;
        }
        return changed;
    };
    const touch = async actor => {
        await players.updateOne({ _id: actor.key }, {
            $set: { actor, lastSeen: now(), expiresAt: new Date(now() + 86400000) },
            $setOnInsert: { roomId: null, queueGame: null }
        }, { upsert: true });
    };
    const leave = async (actor, session) => {
        const member = await players.findOne({ _id: actor.key }, { session });
        if (member?.roomId) {
            const room = await rooms.findOne({ _id: member.roomId }, { session });
            if (room) { await removePlayer(room, actor.key, session); await save(room, session); }
        }
        await players.updateOne({ _id: actor.key }, { $set: { roomId: null, queueGame: null } }, { session });
    };
    const newPlayer = actor => ({ ...actor, lives: 3, eliminated: false, alphabetUsed: [], alphabetProgress: 0, streak: 0 });
    const makeRoom = (game, mode = "multiplayer", code = null) => ({
        _id: crypto.randomUUID(), game, mode, code, status: "lobby", players: [],
        board: Array(9).fill(null), currentTurn: "X", winnerSymbol: null, winningCells: [],
        sequence: null, round: 0, turnIndex: 0, deadline: null, usedWords: [],
        winnerId: null, xpAwarded: false, sequenceNumber: 0, events: [],
        expiresAt: new Date(now() + 86400000)
    });
    const start = room => {
        room.status = "active";
        room.sequence = chooseSequence(); room.round = 1; room.turnIndex = 0;
        room.deadline = now() + TURN_MS;
    };
    const assign = async (room, actors, session) => {
        for (const actor of actors) {
            const player = newPlayer(actor);
            if (room.game === "tic-tac-toe") player.symbol = room.players.length ? "O" : "X";
            room.players.push(player);
            await players.updateOne({ _id: actor.key }, { $set: { roomId: room._id, queueGame: null } }, { session });
        }
    };
    const act = (actor, name, payload = {}) => transaction(async session => {
        const game = name.startsWith("tic-tac-toe:") ? "tic-tac-toe" : "word-bomb";
        if (game === "tic-tac-toe" && actor.isGuest) throw rejectAction("Sign in to play against another player.");
        const member = await players.findOne({ _id: actor.key }, { session });
        if (!member) throw rejectAction("Reconnect to the game server.");
        if (["tic-tac-toe:cancel", "word-bomb:leave"].includes(name)) { await leave(actor, session); return {}; }
        if (["tic-tac-toe:queue", "word-bomb:quick-play"].includes(name)) {
            // A retry while already queued must not discard another match.
            if (member.queueGame === game && member.queueUntil > now()) return { queued: true, game };
            if (member.roomId) {
                const existing = await rooms.findOne({ _id: member.roomId }, { session });
                if (existing && !terminal(existing)) throw rejectAction("Leave your current match before joining another.");
            }
            const opponent = await players.findOne({
                _id: { $ne: actor.key }, queueGame: game, queueUntil: { $gt: now() },
                lastSeen: { $gt: now() - PRESENCE_MS }, "actor.id": { $ne: actor.id }
            }, { session });
            if (!opponent) {
                await players.updateOne({ _id: actor.key }, { $set: { roomId: null, queueGame: game, queueUntil: now() + (game === "tic-tac-toe" ? 8000 : 300000) } }, { session });
                return { queued: true, game };
            }
            const room = makeRoom(game);
            await assign(room, [opponent.actor, actor], session);
            start(room);
            await rooms.insertOne(room, { session });
            return {};
        }
        if (["word-bomb:create-room", "word-bomb:solo-start", "word-bomb:join-room"].includes(name)) {
            await leave(actor, session);
            let room;
            if (name === "word-bomb:join-room") {
                const code = String(payload.code || "").trim().toUpperCase();
                room = await rooms.findOne({ code, game: "word-bomb", status: "lobby", expiresAt: { $gt: new Date(now()) } }, { session });
                if (!room) throw rejectAction("Room code not found or match already started.");
                if (room.players.length >= 10 || room.players.some(p => p.id === actor.id)) throw rejectAction("This room is full or you already joined.");
                await assign(room, [actor], session);
                await save(room, session);
            } else {
                room = makeRoom(game, name === "word-bomb:solo-start" ? "solo" : "multiplayer",
                    name === "word-bomb:create-room" ? crypto.randomBytes(3).toString("hex").toUpperCase() : null);
                await assign(room, [actor], session);
                if (room.mode === "solo") start(room);
                await rooms.insertOne(room, { session });
            }
            return { created: name === "word-bomb:create-room", solo: room.mode === "solo" };
        }
        const room = member.roomId && await rooms.findOne({ _id: member.roomId, game }, { session });
        const player = room?.players.find(p => p.key === actor.key);
        if (!room || !player) throw rejectAction("Match not found.");
        if (name === "tic-tac-toe:move" && payload.matchId !== room._id) throw rejectAction("Match not found.");
        // Expired turns win over late packets, and are committed even when the
        // submitted action becomes invalid as a result of the timeout.
        if (await settle(room, session)) { await save(room, session); return {}; }
        if (name === "word-bomb:start-room") {
            if (room.players[0]?.key !== actor.key || room.status !== "lobby") throw rejectAction("Only the host can start a waiting room.");
            if (room.players.length < 2) throw rejectAction("Invite at least one more player.");
            start(room);
        } else {
            if (room.status !== "active" || player.eliminated) throw rejectAction("This match is not active.");
            if (name === "tic-tac-toe:move") {
                const cell = payload.cell;
                if (room.currentTurn !== player.symbol) throw rejectAction("It is not your turn.");
                if (!Number.isInteger(cell) || cell < 0 || cell > 8 || room.board[cell]) throw rejectAction("Choose an empty board cell.");
                room.board[cell] = player.symbol;
                const result = getBoardResult(room.board);
                room.status = result.status; room.winnerSymbol = result.winner; room.winningCells = result.winningCells;
                if (result.status === "active") room.currentTurn = player.symbol === "X" ? "O" : "X";
                if (result.status === "won") {
                    const totalXp = await reward(room, player, session);
                    if (totalXp !== null) event(room, "tic-tac-toe:xp-awarded", { xpEarned: 30, totalXp }, player.key);
                }
            } else if (name === "word-bomb:submit") {
                if (room.players[room.turnIndex]?.key !== actor.key) throw rejectAction("Wait for your turn.");
                const word = String(payload.word || "").normalize("NFKC").trim().toLowerCase();
                if (!/^[a-z]{3,64}$/.test(word) || !word.includes(room.sequence.toLowerCase()) || room.usedWords.includes(word) || !hasWord(word)) {
                    return { invalid: true };
                }
                room.usedWords.push(word);
                player.alphabetUsed = [...new Set([...player.alphabetUsed, ...word])];
                player.alphabetProgress = player.alphabetUsed.length; player.streak += 1;
                if (player.alphabetProgress === 26) {
                    player.alphabetUsed = []; player.alphabetProgress = 0; player.lives += 1;
                    event(room, "word-bomb:alphabet-bonus", { username: player.username, lives: player.lives });
                }
                event(room, "word-bomb:valid", { username: player.username, word });
                if (room.usedWords.length >= 5000) await finish(room, null, "word-limit", session);
                else nextTurn(room);
            } else throw rejectAction("Unknown game action.");
        }
        await save(room, session);
        return {};
    });
    const read = actor => transaction(async session => {
        const member = await players.findOne({ _id: actor.key }, { session });
        if (!member) return {};
        if (member.queueGame && member.queueUntil <= now()) {
            await players.updateOne({ _id: actor.key }, { $set: { queueGame: null } }, { session });
            return { timeout: member.queueGame };
        }
        const room = member.roomId && await rooms.findOne({ _id: member.roomId }, { session });
        if (room && room.players.some(p => p.key === actor.key)) {
            if (await settle(room, session)) await save(room, session);
            return { room };
        }
        return { queued: member.queueGame };
    });
    return { init, touch, act, read };
}

module.exports = { createSharedGames, publicRoom, PRESENCE_MS };
