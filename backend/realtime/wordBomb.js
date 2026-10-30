const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const User = require("../models/User");
const WordBombMatch = require("../models/WordBombMatch");
const { hasWord, countWordsContaining } = require("../services/wordnikDictionary");

const TURN_MS = 20000;
const MAX_PLAYERS = 6;
const START_LIVES = 3;
const WIN_XP = 30;

// Substrings shortlist with >= 1000 words in Dictionary.txt
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
} catch (e) {
    console.warn("Could not load wordBombSubstrings.json, using defaults.", e);
}

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

// Ratio: length 2 -> 25%, length 3 -> 55%, length 4 -> 18%, length 5 -> 2%
const chooseSequence = (room = null) => {
    const roll = Math.random();
    let length;
    if (roll < 0.25) {
        length = 2; // 25%
    } else if (roll < 0.80) {
        length = 3; // 55%
    } else if (roll < 0.98) {
        length = 4; // 18%
    } else {
        length = 5; // 2%
    }

    const pool = (substringPools[length] && substringPools[length].length > 0)
        ? substringPools[length]
        : (substringPools[3] || ["ING"]);

    const recent = room?.recentSequences || [];
    const candidates = pool.filter((seq) => !recent.includes(seq));
    const finalPool = candidates.length > 0 ? candidates : pool;
    const chosen = finalPool[Math.floor(Math.random() * finalPool.length)];

    if (room) {
        if (!room.recentSequences) room.recentSequences = [];
        room.recentSequences.push(chosen);
        if (room.recentSequences.length > 30) {
            room.recentSequences.shift();
        }
    }

    return chosen;
};

const getActivePublicLobbies = () => {
    const list = [];
    for (const room of rooms.values()) {
        if (room.mode !== "solo" && room.isPublic && room.status === "lobby" && room.players.length > 0) {
            list.push({
                code: room.code,
                hostUsername: room.players.find((p) => p.id === room.hostId)?.username || room.players[0]?.username || "HOST",
                playerCount: room.players.length,
                maxPlayers: MAX_PLAYERS,
                isFull: room.players.length >= MAX_PLAYERS
            });
        }
    }
    return list;
};

const broadcastLobbies = (io) => {
    io.emit("word-bomb:lobbies-list", { lobbies: getActivePublicLobbies() });
};

const publicRoom = (room) => ({
    matchId: room.matchId,
    code: room.code,
    mode: room.mode || "multiplayer",
    isPublic: Boolean(room.isPublic),
    status: room.status,
    sequence: room.sequence,
    round: room.round,
    turnPlayerId: room.players[room.turnIndex]?.id || null,
    deadline: room.deadline,
    usedWords: Array.from(room.usedWords).slice(-50),
    winnerId: room.winnerId,
    hostId: room.hostId || room.players[0]?.id || null,
    hostUsername: room.players.find((p) => p.id === (room.hostId || room.players[0]?.id))?.username || "HOST",
    players: room.players.map((p) => ({
        id: p.id,
        username: p.username,
        lives: p.lives,
        eliminated: p.eliminated,
        eliminatedOrder: p.eliminatedOrder || 0,
        isGuest: p.isGuest,
        alphabetProgress: p.alphabetProgress || (p.alphabetUsed ? p.alphabetUsed.size : 0),
        alphabetUsed: Array.from(p.alphabetUsed || []),
        streak: p.streak
    }))
});

const emitRoom = (io, room, event = "word-bomb:state") => io.to(room.room).emit(event, { room: publicRoom(room) });

const awardMatchXp = async (room, winner) => {
    if (room.xpAwarded) return;
    room.xpAwarded = true;

    if (room.mode === "solo") {
        const player = room.players[0];
        if (!player) return;
        const words = room.usedWords ? room.usedWords.size : (player.streak || 0);
        // +10 XP every 5 words
        const soloXp = Math.floor(words / 5) * 10;
        player.xpEarned = soloXp;

        if (!player.isGuest && player.userId && soloXp > 0) {
            try {
                const claimed = await WordBombMatch.findOneAndUpdate(
                    { matchId: room.matchId, xpAwarded: false },
                    { $set: { xpAwarded: true, winnerUserId: player.userId, xpEarned: soloXp, xpAwardedAt: new Date() } },
                    { new: true, upsert: true }
                );
                if (claimed) {
                    const updated = await User.findByIdAndUpdate(player.userId, { $inc: { xp: soloXp } }, { new: true }).select("xp");
                    player.totalXp = updated?.xp ?? null;
                    player.xpSaved = Boolean(updated);
                }
            } catch (err) {
                console.error("Solo streak XP award error:", err);
            }
        }
        return;
    }

    // Multiplayer: Give +10 XP to all participants, and +30 XP to winner
    for (const player of room.players) {
        const isWinner = winner && player.id === winner.id;
        const earned = isWinner ? WIN_XP : 10; // 30 XP for winner, 10 XP for participants
        player.xpEarned = earned;

        if (!player.isGuest && player.userId && earned > 0) {
            try {
                const updated = await User.findByIdAndUpdate(player.userId, { $inc: { xp: earned } }, { new: true }).select("xp");
                player.totalXp = updated?.xp ?? null;
                player.xpSaved = Boolean(updated);
            } catch (err) {
                console.error("Multiplayer participant XP award error:", err);
            }
        }
    }
};

const finish = async (io, room, winner = null, reason = "victory") => {
    if (room.status === "finished") return;
    room.status = "finished";
    room.winnerId = winner?.id || null;
    await awardMatchXp(room, winner);
    emitRoom(io, room);
    io.to(room.room).emit("word-bomb:finished", {
        matchId: room.matchId,
        mode: room.mode || "multiplayer",
        reason,
        winner: winner ? { id: winner.id, username: winner.username, isGuest: winner.isGuest, streak: winner.streak || 0 } : null,
        wordsCount: room.usedWords ? room.usedWords.size : 0,
        players: room.players.map((p) => ({
            id: p.id,
            username: p.username,
            lives: p.lives,
            eliminated: p.eliminated,
            eliminatedOrder: p.eliminatedOrder || 0,
            streak: p.streak,
            xpEarned: p.xpEarned || 0,
            xpSaved: Boolean(p.xpSaved),
            totalXp: p.totalXp ?? null
        }))
    });
    if (timers.has(room.matchId)) clearInterval(timers.get(room.matchId));
    timers.delete(room.matchId);
    broadcastLobbies(io);
};

const advance = async (io, room, player, reason) => {
    player.lives -= 1;
    io.to(room.room).emit("word-bomb:penalty", { username: player.username, lives: player.lives, reason });
    if (player.lives <= 0) {
        player.eliminated = true;
        room.eliminatedCount = (room.eliminatedCount || 0) + 1;
        player.eliminatedOrder = room.eliminatedCount;
        io.to(room.room).emit("word-bomb:eliminated", { username: player.username });
    }
    if (room.mode === "solo") {
        if (player.lives <= 0) return finish(io, room, null, "no-lives");
        room.sequence = chooseSequence(room);
        room.round += 1;
        room.deadline = Date.now() + TURN_MS;
        emitRoom(io, room);
        return;
    }
    const alive = activePlayers(room);
    if (alive.length <= 1) return finish(io, room, alive[0] || null, "last-player");
    room.turnIndex = nextActiveIndex(room, room.turnIndex);

    room.sequenceFails = (room.sequenceFails || 0) + 1;
    if (room.sequenceFails >= alive.length) {
        room.sequence = chooseSequence(room);
        room.sequenceFails = 0;
    }

    room.round += 1;
    room.deadline = Date.now() + TURN_MS;
    emitRoom(io, room);
};

const startRoom = (io, room) => {
    room.status = "active";
    room.sequence = chooseSequence(room);
    room.sequenceFails = 0;
    room.round = 1;
    room.turnIndex = 0;
    room.deadline = Date.now() + TURN_MS;
    room.eliminatedCount = 0;
    for (const p of room.players) {
        p.eliminated = false;
        p.eliminatedOrder = 0;
    }
    emitRoom(io, room);
    if (timers.has(room.matchId)) clearInterval(timers.get(room.matchId));
    const timer = setInterval(() => {
        if (room.status !== "active" || room.advancing) return;
        if (Date.now() >= room.deadline) {
            room.advancing = true;
            const player = room.players[room.turnIndex];
            if (player) {
                advance(io, room, player, "time")
                    .catch(() => {})
                    .finally(() => { room.advancing = false; });
            } else {
                room.advancing = false;
            }
        }
    }, 200);
    timers.set(room.matchId, timer);
    broadcastLobbies(io);
};

const addPlayer = (room, socket) => {
    if (room.players.length >= MAX_PLAYERS) return false;
    if (room.players.some((player) => player.id === socket.user.id)) return false;
    const player = {
        id: socket.user.id,
        userId: socket.user.isGuest ? null : socket.user.id,
        socketId: socket.id,
        username: socket.user.username,
        lives: START_LIVES,
        eliminated: false,
        eliminatedOrder: 0,
        isGuest: Boolean(socket.user.isGuest),
        alphabetUsed: new Set(),
        alphabetProgress: 0,
        streak: 0
    };
    room.players.push(player);
    socket.join(room.room);
    socket.data.wordBombRoomId = room.matchId;
    return true;
};

const attachWordBomb = (io) => {
    io.on("connection", (socket) => {
        socket.emit("word-bomb:identity", { id: socket.user.id, username: socket.user.username, isGuest: socket.user.isGuest });

        // Request list of active public lobbies
        socket.on("word-bomb:get-lobbies", () => {
            socket.emit("word-bomb:lobbies-list", { lobbies: getActivePublicLobbies() });
        });

        // Guest rename in lobby before match starts
        socket.on("word-bomb:rename-guest", ({ username } = {}) => {
            const clean = String(username || "").trim();
            if (!clean || clean.length < 2 || clean.length > 15) {
                return socket.emit("word-bomb:error", { message: "Name must be between 2 and 15 characters." });
            }
            if (!/^[a-zA-Z0-9_ -]+$/.test(clean)) {
                return socket.emit("word-bomb:error", { message: "Name can only contain letters, numbers, spaces, and hyphens." });
            }
            const room = rooms.get(socket.data.wordBombRoomId);
            if (!room) return;
            if (room.status !== "lobby") {
                return socket.emit("word-bomb:error", { message: "Cannot change name once match has started." });
            }
            const player = getPlayer(room, socket.id);
            if (!player || !player.isGuest) {
                return socket.emit("word-bomb:error", { message: "Only guest players can change display name." });
            }
            player.username = clean;
            socket.user.username = clean;
            emitRoom(io, room);
            broadcastLobbies(io);
            socket.emit("word-bomb:name-updated", { username: clean });
        });

        socket.on("word-bomb:quick-play", () => {
            // Join first available public lobby if open
            const publicLobby = [...rooms.values()].find((r) => r.mode !== "solo" && r.isPublic && r.status === "lobby" && r.players.length < MAX_PLAYERS);
            if (publicLobby && addPlayer(publicLobby, socket)) {
                emitRoom(io, publicLobby);
                broadcastLobbies(io);
                return;
            }

            // Otherwise create a new public room and wait for players
            const code = crypto.randomBytes(3).toString("hex").toUpperCase();
            const room = { matchId: crypto.randomUUID(), room: `word-bomb:${crypto.randomUUID()}`, code, status: "lobby", mode: "multiplayer", isPublic: true, hostId: socket.user.id, players: [], sequence: null, round: 0, turnIndex: 0, deadline: null, usedWords: new Set(), recentSequences: [], sequenceFails: 0, winnerId: null, xpAwarded: false };
            rooms.set(room.matchId, room);
            addPlayer(room, socket);
            socket.emit("word-bomb:room-created", { room: publicRoom(room) });
            emitRoom(io, room);
            broadcastLobbies(io);
        });

        socket.on("word-bomb:solo-start", () => {
            const room = { matchId: `solo:${crypto.randomUUID()}`, room: `word-bomb:solo:${socket.id}`, code: null, status: "active", mode: "solo", isPublic: false, hostId: socket.user.id, players: [], sequence: null, round: 1, turnIndex: 0, deadline: Date.now() + TURN_MS, usedWords: new Set(), recentSequences: [], sequenceFails: 0, winnerId: null, xpAwarded: false };
            rooms.set(room.matchId, room);
            addPlayer(room, socket);
            startRoom(io, room);
            socket.emit("word-bomb:solo-started", { room: publicRoom(room) });
        });

        // Toggle public vs private room creation (default: public)
        socket.on("word-bomb:create-room", ({ isPublic = true } = {}) => {
            const code = crypto.randomBytes(3).toString("hex").toUpperCase();
            const room = {
                matchId: crypto.randomUUID(),
                room: `word-bomb:${crypto.randomUUID()}`,
                code,
                status: "lobby",
                mode: "multiplayer",
                isPublic: isPublic !== false,
                hostId: socket.user.id,
                players: [],
                sequence: null,
                round: 0,
                turnIndex: 0,
                deadline: null,
                usedWords: new Set(),
                recentSequences: [],
                sequenceFails: 0,
                winnerId: null,
                xpAwarded: false
            };
            rooms.set(room.matchId, room);
            addPlayer(room, socket);
            socket.emit("word-bomb:room-created", { room: publicRoom(room) });
            emitRoom(io, room);
            broadcastLobbies(io);
        });

        socket.on("word-bomb:join-room", ({ code } = {}) => {
            const targetCode = String(code || "").trim().toUpperCase();
            const room = [...rooms.values()].find((candidate) => candidate.code === targetCode);
            if (!room) return socket.emit("word-bomb:error", { message: "Room code not found.", code: targetCode });
            if (room.status !== "lobby") return socket.emit("word-bomb:error", { message: "Match already in progress. No mid-game joins allowed.", code: targetCode });
            if (room.players.length >= MAX_PLAYERS) {
                return socket.emit("word-bomb:error", { message: "This lobby is full (maximum 6 players reached).", isFull: true, code: targetCode });
            }
            if (!addPlayer(room, socket)) return socket.emit("word-bomb:error", { message: "You have already joined this room.", code: targetCode });
            emitRoom(io, room);
            broadcastLobbies(io);
        });

        // Only host can start match
        socket.on("word-bomb:start-room", () => {
            const room = rooms.get(socket.data.wordBombRoomId);
            if (!room) return socket.emit("word-bomb:error", { message: "Room not found." });
            const hostId = room.hostId || room.players[0]?.id;
            if (hostId !== socket.user.id) {
                return socket.emit("word-bomb:error", { message: "Only the room host can start the match." });
            }
            if (room.players.length < 2) {
                return socket.emit("word-bomb:error", { message: "Invite at least one more player before starting." });
            }
            startRoom(io, room);
            broadcastLobbies(io);
        });

        // Rematch / Restart room: ONLY host can restart room for everyone
        socket.on("word-bomb:rematch", () => {
            const room = rooms.get(socket.data.wordBombRoomId);
            if (!room) return;
            if (room.mode === "solo") {
                room.status = "active";
                room.sequence = chooseSequence(room);
                room.round = 1;
                room.turnIndex = 0;
                room.deadline = Date.now() + TURN_MS;
                room.usedWords = new Set();
                room.sequenceFails = 0;
                room.winnerId = null;
                room.xpAwarded = false;
                const player = room.players[0];
                if (player) {
                    player.lives = START_LIVES;
                    player.eliminated = false;
                    player.streak = 0;
                    player.alphabetUsed.clear();
                    player.alphabetProgress = 0;
                }
                startRoom(io, room);
                socket.emit("word-bomb:solo-started", { room: publicRoom(room) });
                return;
            }

            // Multiplayer: Check if user is host
            const hostId = room.hostId || room.players[0]?.id;
            if (socket.user.id !== hostId) {
                const hostName = room.players.find((p) => p.id === hostId)?.username || "host";
                socket.emit("word-bomb:rematch-waiting", {
                    message: `Waiting for host (@${hostName}) to replay the room...`
                });
                return;
            }

            // Host triggered rematch: Reset room back to lobby for everyone
            if (timers.has(room.matchId)) clearInterval(timers.get(room.matchId));
            timers.delete(room.matchId);
            room.status = "lobby";
            room.sequence = null;
            room.round = 0;
            room.turnIndex = 0;
            room.deadline = null;
            room.usedWords = new Set();
            room.sequenceFails = 0;
            room.winnerId = null;
            room.xpAwarded = false;
            room.eliminatedCount = 0;
            for (const player of room.players) {
                player.lives = START_LIVES;
                player.eliminated = false;
                player.eliminatedOrder = 0;
                player.streak = 0;
                player.alphabetUsed.clear();
                player.alphabetProgress = 0;
            }
            emitRoom(io, room);
            broadcastLobbies(io);
        });

        socket.on("word-bomb:submit", async ({ word } = {}) => {
            const room = rooms.get(socket.data.wordBombRoomId);
            const player = room && getPlayer(room, socket.id);
            if (!room || !player || room.status !== "active") return socket.emit("word-bomb:error", { message: "This match is not active." });
            if (room.players[room.turnIndex]?.id !== player.id) return socket.emit("word-bomb:error", { message: "Wait for your turn." });
            if (Date.now() >= room.deadline) return advance(io, room, player, "time");
            const clean = normalizeWord(word);
            const valid = /^[a-z]+$/.test(clean) && clean.length >= 3 && clean.includes(room.sequence.toLowerCase()) && !room.usedWords.has(clean) && hasWord(clean);
            if (!valid) return socket.emit("word-bomb:invalid", { message: "That word is not accepted for this sequence." });
            room.usedWords.add(clean);
            room.sequenceFails = 0;

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
                room.sequence = chooseSequence(room); room.round += 1; room.deadline = Date.now() + TURN_MS; emitRoom(io, room);
            } else {
                room.turnIndex = nextActiveIndex(room, room.turnIndex); room.sequence = chooseSequence(room); room.round += 1; room.deadline = Date.now() + TURN_MS; emitRoom(io, room);
            }
        });

        const leave = () => {
            const index = waiting.indexOf(socket.id); if (index >= 0) waiting.splice(index, 1);
            const room = rooms.get(socket.data.wordBombRoomId); if (!room) return;
            const playerIndex = room.players.findIndex((p) => p.socketId === socket.id);
            if (playerIndex < 0) return;

            // Immediately decouple socket from the socket.io room channel & room state
            socket.leave(room.room);
            delete socket.data.wordBombRoomId;

            if (room.status === "lobby") {
                const leavingPlayer = room.players[playerIndex];
                room.players.splice(playerIndex, 1);
                if (room.players.length === 0) {
                    rooms.delete(room.matchId);
                } else {
                    if (room.hostId === leavingPlayer.id) {
                        room.hostId = room.players[0].id;
                    }
                    emitRoom(io, room);
                }
                broadcastLobbies(io);
                return;
            }

            // Active or finished match
            const player = room.players[playerIndex];
            player.eliminated = true;
            player.lives = 0;
            room.players.splice(playerIndex, 1);
            const alive = activePlayers(room);
            if (room.status === "active" && alive.length <= 1) {
                finish(io, room, alive[0] || null, "disconnect").catch(() => {});
            } else {
                if (room.hostId === player.id && room.players.length > 0) {
                    room.hostId = room.players[0].id;
                }
                emitRoom(io, room);
            }
            broadcastLobbies(io);
        };
        socket.on("word-bomb:leave", leave);
        socket.on("disconnect", leave);
    });
};

module.exports = { attachWordBomb };
