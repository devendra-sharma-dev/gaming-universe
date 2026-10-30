"use strict";

const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const User = require("../models/User");
const { hasWord } = require("./wordnikDictionary");

const TURN_MS = 20000;
const MAX_PLAYERS = 6;
const START_LIVES = 3;

// Load substring pool
let substringPools = {
    2: ["AT", "AN", "IN", "ER", "RE", "ST", "ON", "OU", "EA", "AR"],
    3: ["ING", "ESS", "ATI", "ION", "TER", "NES", "TIO", "ATE", "ENT", "OUS"],
    4: ["TION", "NESS", "ATIO", "ICAL", "ABLE", "OVER", "TING", "ALLY"],
    5: ["ATION", "ENESS", "CALLY", "ICALL", "INTER", "TICAL", "GRAPH"]
};

try {
    const jsonPath = path.resolve(__dirname, "../../data/wordBombSubstrings.json");
    if (fs.existsSync(jsonPath)) {
        const loaded = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
        if (loaded && loaded[2] && loaded[3] && loaded[4] && loaded[5]) {
            substringPools = loaded;
        }
    }
} catch (_e) {}

const chooseSequence = (recent = []) => {
    const roll = Math.random();
    let length = 3;
    if (roll < 0.25) length = 2;
    else if (roll < 0.80) length = 3;
    else if (roll < 0.98) length = 4;
    else length = 5;

    const pool = (substringPools[length] && substringPools[length].length > 0)
        ? substringPools[length]
        : (substringPools[3] || ["ING"]);

    const candidates = pool.filter((seq) => !recent.includes(seq));
    const finalPool = candidates.length > 0 ? candidates : pool;
    return finalPool[Math.floor(Math.random() * finalPool.length)];
};

// In-memory fallback if MongoDB connection is not open
const memoryRooms = new Map();

const getRoomsCollection = () => {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
        return mongoose.connection.collection("realtimeRooms");
    }
    return null;
};

const findRoomByCode = async (code) => {
    const upper = String(code || "").trim().toUpperCase();
    const col = getRoomsCollection();
    if (col) {
        return await col.findOne({ code: upper, game: "word-bomb" });
    }
    return memoryRooms.get(upper) || null;
};

const saveRoom = async (room) => {
    room.updatedAt = new Date();
    const col = getRoomsCollection();
    if (col) {
        await col.replaceOne({ _id: room._id }, room, { upsert: true });
    } else {
        memoryRooms.set(room.code, room);
    }
};

const deleteRoom = async (code) => {
    const upper = String(code || "").trim().toUpperCase();
    const col = getRoomsCollection();
    if (col) {
        await col.deleteOne({ code: upper, game: "word-bomb" });
    } else {
        memoryRooms.delete(upper);
    }
};

const generateCode = async () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    for (let i = 0; i < 10; i++) {
        let code = "";
        for (let j = 0; j < 6; j++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        const existing = await findRoomByCode(code);
        if (!existing) return code;
    }
    return crypto.randomBytes(3).toString("hex").toUpperCase();
};

const publicRoom = (room) => {
    if (!room) return null;
    return {
        matchId: room._id || room.matchId,
        code: room.code,
        mode: room.mode || "multiplayer",
        isPublic: Boolean(room.isPublic),
        status: room.status,
        sequence: room.sequence,
        round: room.round,
        turnPlayerId: room.players[room.turnIndex]?.id || null,
        deadline: room.deadline,
        usedWords: (room.usedWords || []).slice(-50),
        winnerId: room.winnerId,
        hostId: room.hostId || room.players[0]?.id || null,
        hostUsername: room.players.find((p) => p.id === (room.hostId || room.players[0]?.id))?.username || room.players[0]?.username || "HOST",
        players: (room.players || []).map((p) => ({
            id: p.id,
            username: p.username,
            lives: p.lives,
            eliminated: p.eliminated,
            eliminatedOrder: p.eliminatedOrder || 0,
            isGuest: Boolean(p.isGuest),
            alphabetProgress: p.alphabetProgress || (p.alphabetUsed ? p.alphabetUsed.length : 0),
            alphabetUsed: Array.from(p.alphabetUsed || []),
            streak: p.streak || 0,
            xpEarned: p.xpEarned || 0,
            xpSaved: Boolean(p.xpSaved),
            totalXp: p.totalXp ?? null
        }))
    };
};

const getActiveLobbies = async () => {
    const col = getRoomsCollection();
    let rooms = [];
    if (col) {
        rooms = await col.find({
            game: "word-bomb",
            status: "lobby",
            mode: "multiplayer",
            isPublic: true,
            expiresAt: { $gt: new Date() }
        }).toArray();
    } else {
        rooms = Array.from(memoryRooms.values()).filter(
            (r) => r.game === "word-bomb" && r.status === "lobby" && r.mode === "multiplayer" && r.isPublic
        );
    }

    return rooms.map((r) => ({
        code: r.code,
        hostUsername: r.players.find((p) => p.id === (r.hostId || r.players[0]?.id))?.username || r.players[0]?.username || "HOST",
        playerCount: (r.players || []).length,
        maxPlayers: MAX_PLAYERS,
        isFull: (r.players || []).length >= MAX_PLAYERS
    }));
};

const awardMatchXp = async (room, winner) => {
    if (room.xpAwarded) return;
    room.xpAwarded = true;

    for (const player of room.players) {
        const isWinner = winner && player.id === winner.id;
        const xp = isWinner ? 30 : 10;
        player.xpEarned = xp;

        if (!player.isGuest && player.userId) {
            try {
                const user = await User.findByIdAndUpdate(
                    player.userId,
                    { $inc: { xp } },
                    { new: true }
                ).select("xp");
                if (user) {
                    player.xpSaved = true;
                    player.totalXp = user.xp;
                }
            } catch (_e) {}
        }
    }
};

const finishMatch = async (room, winner, reason = "last-player") => {
    if (room.status === "finished") return;
    room.status = "finished";
    room.winnerId = winner?.id || null;
    room.finishReason = reason;
    await awardMatchXp(room, winner);
    await saveRoom(room);
};

const settleTimeout = async (room) => {
    if (room.status !== "active" || !room.deadline || Date.now() < room.deadline) {
        return false;
    }

    const player = room.players[room.turnIndex];
    if (!player || player.eliminated) return false;

    player.lives -= 1;
    if (player.lives <= 0) {
        player.eliminated = true;
        room.eliminatedCount = (room.eliminatedCount || 0) + 1;
        player.eliminatedOrder = room.eliminatedCount;
    }

    const alive = room.players.filter((p) => !p.eliminated);
    if (alive.length <= 1) {
        await finishMatch(room, alive[0] || null, "last-player");
        return true;
    }

    // Advance turn
    let nextIdx = (room.turnIndex + 1) % room.players.length;
    while (room.players[nextIdx].eliminated) {
        nextIdx = (nextIdx + 1) % room.players.length;
    }
    room.turnIndex = nextIdx;
    room.round = (room.round || 1) + 1;
    room.sequence = chooseSequence(room.recentSequences || []);
    if (!room.recentSequences) room.recentSequences = [];
    room.recentSequences.push(room.sequence);
    if (room.recentSequences.length > 25) room.recentSequences.shift();
    room.deadline = Date.now() + TURN_MS;
    await saveRoom(room);
    return true;
};

const createRoom = async (actor, isPublic = true) => {
    const code = await generateCode();
    const initialSeq = chooseSequence();
    const room = {
        _id: crypto.randomUUID(),
        code,
        game: "word-bomb",
        mode: "multiplayer",
        isPublic: Boolean(isPublic),
        status: "lobby",
        hostId: actor.id,
        sequence: initialSeq,
        recentSequences: [initialSeq],
        round: 0,
        turnIndex: 0,
        deadline: null,
        usedWords: [],
        winnerId: null,
        xpAwarded: false,
        eliminatedCount: 0,
        players: [{
            id: actor.id,
            userId: actor.isGuest ? null : actor.id,
            username: actor.username,
            lives: START_LIVES,
            eliminated: false,
            eliminatedOrder: 0,
            isGuest: Boolean(actor.isGuest),
            alphabetUsed: [],
            alphabetProgress: 0,
            streak: 0
        }],
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000)
    };

    await saveRoom(room);
    return publicRoom(room);
};

const joinRoom = async (actor, code) => {
    const room = await findRoomByCode(code);
    if (!room) {
        throw new Error("Room code not found.");
    }
    if (room.status !== "lobby") {
        throw new Error("Match already in progress.");
    }
    if (room.players.length >= MAX_PLAYERS) {
        throw Object.assign(new Error("This room is currently full (maximum 6 players reached)."), { isFull: true });
    }

    const existing = room.players.find((p) => p.id === actor.id);
    if (!existing) {
        room.players.push({
            id: actor.id,
            userId: actor.isGuest ? null : actor.id,
            username: actor.username,
            lives: START_LIVES,
            eliminated: false,
            eliminatedOrder: 0,
            isGuest: Boolean(actor.isGuest),
            alphabetUsed: [],
            alphabetProgress: 0,
            streak: 0
        });
        await saveRoom(room);
    }

    return publicRoom(room);
};

const getRoomState = async (code) => {
    const room = await findRoomByCode(code);
    if (!room) return null;
    await settleTimeout(room);
    return publicRoom(room);
};

const startRoom = async (actor, code) => {
    const room = await findRoomByCode(code);
    if (!room) throw new Error("Room not found.");
    if (room.status !== "lobby") throw new Error("Match already active.");

    const isHost = room.hostId === actor.id || room.players[0]?.id === actor.id;
    if (!isHost) throw new Error("Only the host can start the game.");
    if (room.players.length < 2) throw new Error("Need at least 2 players to start a multiplayer match.");

    room.status = "active";
    room.sequence = chooseSequence(room.recentSequences || []);
    room.round = 1;
    room.turnIndex = 0;
    room.deadline = Date.now() + TURN_MS;
    room.eliminatedCount = 0;
    for (const p of room.players) {
        p.eliminated = false;
        p.eliminatedOrder = 0;
        p.lives = START_LIVES;
    }

    await saveRoom(room);
    return publicRoom(room);
};

const submitWord = async (actor, code, rawWord) => {
    const room = await findRoomByCode(code);
    if (!room) throw new Error("Room not found.");
    if (room.status !== "active") throw new Error("Match is not active.");

    await settleTimeout(room);
    if (room.status !== "active") return { valid: false, room: publicRoom(room) };

    const currentTurnPlayer = room.players[room.turnIndex];
    if (!currentTurnPlayer || currentTurnPlayer.id !== actor.id) {
        throw new Error("Wait for your turn.");
    }

    const clean = String(rawWord || "").normalize("NFKC").trim().toLowerCase();
    const seq = String(room.sequence || "").toLowerCase();

    if (!/^[a-z]{3,64}$/.test(clean) || !clean.includes(seq) || (room.usedWords && room.usedWords.includes(clean)) || !hasWord(clean)) {
        return { valid: false, message: "That word is not accepted for this sequence.", room: publicRoom(room) };
    }

    // Word valid
    if (!room.usedWords) room.usedWords = [];
    room.usedWords.push(clean);
    currentTurnPlayer.streak = (currentTurnPlayer.streak || 0) + 1;

    // A-Z tracking
    if (!currentTurnPlayer.alphabetUsed) currentTurnPlayer.alphabetUsed = [];
    for (const char of clean) {
        if (char >= "a" && char <= "z" && !currentTurnPlayer.alphabetUsed.includes(char)) {
            currentTurnPlayer.alphabetUsed.push(char);
        }
    }
    currentTurnPlayer.alphabetProgress = currentTurnPlayer.alphabetUsed.length;
    let gainedExtraLife = false;
    if (currentTurnPlayer.alphabetUsed.length >= 26) {
        currentTurnPlayer.lives += 1;
        currentTurnPlayer.alphabetUsed = [];
        currentTurnPlayer.alphabetProgress = 0;
        gainedExtraLife = true;
    }

    // Next turn
    let nextIdx = (room.turnIndex + 1) % room.players.length;
    while (room.players[nextIdx].eliminated) {
        nextIdx = (nextIdx + 1) % room.players.length;
    }
    room.turnIndex = nextIdx;
    room.round = (room.round || 1) + 1;
    room.sequence = chooseSequence(room.recentSequences || []);
    if (!room.recentSequences) room.recentSequences = [];
    room.recentSequences.push(room.sequence);
    if (room.recentSequences.length > 25) room.recentSequences.shift();
    room.deadline = Date.now() + TURN_MS;

    await saveRoom(room);
    return { valid: true, gainedExtraLife, room: publicRoom(room) };
};

const leaveRoom = async (actor, code) => {
    const room = await findRoomByCode(code);
    if (!room) return;

    if (room.status === "lobby") {
        room.players = room.players.filter((p) => p.id !== actor.id);
        if (room.players.length === 0) {
            await deleteRoom(code);
            return;
        }
        if (room.hostId === actor.id) {
            room.hostId = room.players[0].id;
        }
        await saveRoom(room);
    } else if (room.status === "active") {
        const player = room.players.find((p) => p.id === actor.id);
        if (player) {
            player.eliminated = true;
            player.lives = 0;
        }
        const alive = room.players.filter((p) => !p.eliminated);
        if (alive.length <= 1) {
            await finishMatch(room, alive[0] || null, "abandoned");
        } else if (room.players[room.turnIndex]?.id === actor.id) {
            let nextIdx = (room.turnIndex + 1) % room.players.length;
            while (room.players[nextIdx].eliminated) {
                nextIdx = (nextIdx + 1) % room.players.length;
            }
            room.turnIndex = nextIdx;
            room.sequence = chooseSequence(room.recentSequences || []);
            room.deadline = Date.now() + TURN_MS;
            await saveRoom(room);
        }
    }
};

module.exports = {
    getActiveLobbies,
    createRoom,
    joinRoom,
    getRoomState,
    startRoom,
    submitWord,
    leaveRoom,
    publicRoom
};

