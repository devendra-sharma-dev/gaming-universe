const crypto = require("crypto");
const User = require("../models/User");
const WordBombMatch = require("../models/WordBombMatch");
const { hasWord, countWordsContaining } = require("../services/wordnikDictionary");

const TURN_MS = 20000;
const MAX_PLAYERS = 10;
const START_LIVES = 3;
const WIN_XP = 30;
const sequences = ["AT", "AN", "IN", "ER", "RE", "ST", "ON", "OU", "EA", "AR", "TION", "ING", "STR", "EAR"];

const waiting = [];
const rooms = new Map();
const timers = new Map();

const normalizeWord = (value) => String(value || "").normalize("NFKC").trim().toLowerCase();
const getPlayer = (room, socketId) => room.players.find((player) => player.socketId === socketId);
const activePlayers = (room) => room.players.filter((player) => !player.eliminated);
const nextActiveIndex = (room, from) => {
    for (let step = 1; step <= room.players.length; step += 1) {
        const index = (from + step) % room.players.length;
        if (!room.players[index].eliminated) return index;
    }
    return from;
};
const chooseSequence = () => {
    const viable = sequences.filter((sequence) => countWordsContaining(sequence) >= 10);
    const pool = viable.length ? viable : sequences;
    return pool[Math.floor(Math.random() * pool.length)];
};
const publicRoom = (room) => ({
    matchId: room.matchId,
    code: room.code,
    mode: room.mode || "multiplayer",
    status: room.status,
    sequence: room.sequence,
    round: room.round,
    turnPlayerId: room.players[room.turnIndex]?.id || null,
    deadline: room.deadline,
    usedWords: Array.from(room.usedWords).slice(-50),
    winnerId: room.winnerId,
    hostId: room.players[0]?.id || null,
    players: room.players.map(({ id, username, lives, eliminated, isGuest, alphabetProgress, streak }) => ({ id, username, lives, eliminated, isGuest, alphabetProgress, streak }))
});

const emitRoom = (io, room, event = "word-bomb:state") => io.to(room.room).emit(event, { room: publicRoom(room) });
const awardWinner = async (room, winner) => {
    if (!winner || winner.isGuest || room.xpAwarded) return null;
    const claimed = await WordBombMatch.findOneAndUpdate(
        { matchId: room.matchId, xpAwarded: false },
        { $set: { xpAwarded: true, winnerUserId: winner.userId, xpAwardedAt: new Date() } },
        { new: true, upsert: true }
    );
    if (!claimed) return null;
    room.xpAwarded = true;
    const updated = await User.findByIdAndUpdate(winner.userId, { $inc: { xp: WIN_XP } }, { new: true }).select("xp");
    return updated?.xp ?? null;
};
const finish = async (io, room, winner = null, reason = "victory") => {
    room.status = "finished";
    room.winnerId = winner?.id || null;
    const totalXp = await awardWinner(room, winner);
    emitRoom(io, room);
    io.to(room.room).emit("word-bomb:finished", { reason, winner: winner ? { id: winner.id, username: winner.username } : null, xpEarned: totalXp === null ? 0 : WIN_XP, totalXp });
    if (timers.has(room.matchId)) clearInterval(timers.get(room.matchId));
    timers.delete(room.matchId);
};
const advance = async (io, room, player, reason) => {
    player.lives -= 1;
    io.to(room.room).emit("word-bomb:penalty", { username: player.username, lives: player.lives, reason });
    if (player.lives <= 0) {
        player.eliminated = true;
        io.to(room.room).emit("word-bomb:eliminated", { username: player.username });
    }
    if (room.mode === "solo") {
        if (player.lives <= 0) return finish(io, room, null, "no-lives");
        room.sequence = chooseSequence();
        room.round += 1;
        room.deadline = Date.now() + TURN_MS;
        emitRoom(io, room);
        return;
    }
    const alive = activePlayers(room);
    if (alive.length <= 1) return finish(io, room, alive[0] || null, "last-player");
    room.turnIndex = nextActiveIndex(room, room.turnIndex);
    room.sequence = chooseSequence();
    room.round += 1;
    room.deadline = Date.now() + TURN_MS;
    emitRoom(io, room);
};
const startRoom = (io, room) => {
    room.status = "active";
    room.sequence = chooseSequence();
    room.round = 1;
    room.turnIndex = 0;
    room.deadline = Date.now() + TURN_MS;
    emitRoom(io, room);
    const timer = setInterval(() => {
        if (room.status !== "active") return;
        if (Date.now() >= room.deadline) {
            const player = room.players[room.turnIndex];
            advance(io, room, player, "time").catch(() => {});
        }
    }, 250);
    timers.set(room.matchId, timer);
};
const addPlayer = (room, socket) => {
    if (room.players.length >= MAX_PLAYERS) return false;
    if (room.players.some((player) => player.id === socket.user.id)) return false;
    const player = { id: socket.user.id, userId: socket.user.isGuest ? null : socket.user.id, socketId: socket.id, username: socket.user.username, lives: START_LIVES, eliminated: false, isGuest: Boolean(socket.user.isGuest), alphabetUsed: new Set(), alphabetProgress: 0, streak: 0 };
    room.players.push(player);
    socket.join(room.room);
    socket.data.wordBombRoomId = room.matchId;
    return true;
};

const attachWordBomb = (io) => {
    io.on("connection", (socket) => {
        socket.on("word-bomb:quick-play", () => {
            if (waiting.includes(socket.id)) return;
            const opponentId = waiting.shift();
            const opponent = opponentId && io.sockets.sockets.get(opponentId);
            if (!opponent || !opponent.connected) {
                waiting.push(socket.id);
                socket.emit("word-bomb:queue", { status: "searching" });
                return;
            }
            const room = { matchId: crypto.randomUUID(), room: `word-bomb:${crypto.randomUUID()}`, code: null, status: "lobby", players: [], sequence: null, round: 0, turnIndex: 0, deadline: null, usedWords: new Set(), winnerId: null, xpAwarded: false };
            rooms.set(room.matchId, room);
            addPlayer(room, opponent); addPlayer(room, socket);
            startRoom(io, room);
        });
        socket.on("word-bomb:solo-start", () => {
            const room = { matchId: `solo:${crypto.randomUUID()}`, room: `word-bomb:solo:${socket.id}`, code: null, status: "active", mode: "solo", players: [], sequence: chooseSequence(), round: 1, turnIndex: 0, deadline: Date.now() + TURN_MS, usedWords: new Set(), winnerId: null, xpAwarded: false };
            rooms.set(room.matchId, room);
            addPlayer(room, socket);
            startRoom(io, room);
            socket.emit("word-bomb:solo-started", { room: publicRoom(room) });
        });
        socket.on("word-bomb:create-room", () => {
            const code = crypto.randomBytes(3).toString("hex").toUpperCase();
            const room = { matchId: crypto.randomUUID(), room: `word-bomb:${crypto.randomUUID()}`, code, status: "lobby", players: [], sequence: null, round: 0, turnIndex: 0, deadline: null, usedWords: new Set(), winnerId: null, xpAwarded: false };
            rooms.set(room.matchId, room); addPlayer(room, socket);
            socket.emit("word-bomb:room-created", { room: publicRoom(room) }); emitRoom(io, room);
        });
        socket.on("word-bomb:join-room", ({ code } = {}) => {
            const room = [...rooms.values()].find((candidate) => candidate.code === String(code || "").trim().toUpperCase() && candidate.status === "lobby");
            if (!room) return socket.emit("word-bomb:error", { message: "Room code not found or match already started." });
            if (!addPlayer(room, socket)) return socket.emit("word-bomb:error", { message: "This room is full or you already joined." });
            emitRoom(io, room);
        });
        socket.on("word-bomb:start-room", () => {
            const room = rooms.get(socket.data.wordBombRoomId);
            if (!room || room.players[0]?.socketId !== socket.id) return socket.emit("word-bomb:error", { message: "Only the room creator can start the match." });
            if (room.players.length < 2) return socket.emit("word-bomb:error", { message: "Invite at least one more player." });
            startRoom(io, room);
        });
        socket.on("word-bomb:submit", async ({ word } = {}) => {
            const room = rooms.get(socket.data.wordBombRoomId); const player = room && getPlayer(room, socket.id);
            if (!room || !player || room.status !== "active") return socket.emit("word-bomb:error", { message: "This match is not active." });
            if (room.players[room.turnIndex]?.id !== player.id) return socket.emit("word-bomb:error", { message: "Wait for your turn." });
            if (Date.now() >= room.deadline) return advance(io, room, player, "time");
            const clean = normalizeWord(word);
            const valid = /^[a-z]+$/.test(clean) && clean.length >= 3 && clean.includes(room.sequence.toLowerCase()) && !room.usedWords.has(clean) && hasWord(clean);
            if (!valid) return socket.emit("word-bomb:invalid", { message: "That word is not accepted for this sequence." });
            room.usedWords.add(clean);
            for (const letter of clean) player.alphabetUsed.add(letter);
            player.alphabetProgress = player.alphabetUsed.size;
            player.streak += 1;
            if (player.alphabetUsed.size === 26) {
                player.alphabetUsed.clear();
                player.alphabetProgress = 0;
                player.lives += 1;
                io.to(room.room).emit("word-bomb:alphabet-bonus", { username: player.username, lives: player.lives });
            }
            io.to(room.room).emit("word-bomb:valid", { username: player.username, word: clean });
            if (room.mode === "solo") {
                room.sequence = chooseSequence(); room.round += 1; room.deadline = Date.now() + TURN_MS; emitRoom(io, room);
            } else {
                room.turnIndex = nextActiveIndex(room, room.turnIndex); room.sequence = chooseSequence(); room.round += 1; room.deadline = Date.now() + TURN_MS; emitRoom(io, room);
            }
        });
        const leave = () => {
            const index = waiting.indexOf(socket.id); if (index >= 0) waiting.splice(index, 1);
            const room = rooms.get(socket.data.wordBombRoomId); if (!room || room.status === "finished") return;
            const player = getPlayer(room, socket.id); if (!player) return;
            player.eliminated = true; player.lives = 0;
            const alive = activePlayers(room);
            if (room.status === "active" && alive.length <= 1) finish(io, room, alive[0] || null, "disconnect").catch(() => {});
            else emitRoom(io, room);
        };
        socket.on("word-bomb:leave", leave);
        socket.on("disconnect", leave);
    });
};

module.exports = { attachWordBomb };
