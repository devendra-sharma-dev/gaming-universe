const crypto = require("crypto");

const TicTacToeMatch = require("../models/TicTacToeMatch");
const { getBoardResult } = require("../games/ticTacToe");
const { awardTicTacToeWinXp, TIC_TAC_TOE_WIN_XP } = require("../services/xp");

const MATCHMAKING_WINDOW_MS = 8000;

const waitingPlayers = [];
const waitingTimers = new Map();
const activeMatches = new Map();
const matchLocks = new Map();

const withMatchLock = (matchId, operation) => {
    const previous = matchLocks.get(matchId) || Promise.resolve();
    const current = previous.catch(() => {}).then(operation);

    matchLocks.set(matchId, current);

    return current.finally(() => {
        if (matchLocks.get(matchId) === current) {
            matchLocks.delete(matchId);
        }
    });
};

const removeFromQueue = (socketId) => {
    const index = waitingPlayers.indexOf(socketId);

    if (index !== -1) {
        waitingPlayers.splice(index, 1);
    }

    const timer = waitingTimers.get(socketId);

    if (timer) {
        clearTimeout(timer);
        waitingTimers.delete(socketId);
    }
};

const getPlayerBySocket = (match, socketId) => {
    if (match.players.X.socketId === socketId) {
        return match.players.X;
    }

    if (match.players.O.socketId === socketId) {
        return match.players.O;
    }

    return null;
};

const publicMatch = (match) => ({
    matchId: match.matchId,
    mode: "multiplayer",
    board: match.board,
    currentTurn: match.currentTurn,
    status: match.status,
    winner: match.winnerSymbol,
    winnerUsername: match.winnerSymbol
        ? match.players[match.winnerSymbol].username
        : null,
    winningCells: match.winningCells,
    players: [match.players.X, match.players.O].map((player) => ({
        username: player.username,
        symbol: player.symbol
    }))
});

const emitState = (io, match) => {
    io.to(match.room).emit("tic-tac-toe:state", {
        match: publicMatch(match)
    });
};

const persistMove = async (match, nextState) => {
    const updated = await TicTacToeMatch.findOneAndUpdate(
        {
            matchId: match.matchId,
            status: "active",
            currentTurn: match.currentTurn
        },
        {
            $set: {
                board: nextState.board,
                currentTurn: nextState.currentTurn,
                status: nextState.status,
                winnerSymbol: nextState.winnerSymbol,
                winnerUserId: nextState.winnerUserId,
                winningCells: nextState.winningCells
            }
        },
        { new: true }
    );

    if (!updated) {
        throw new Error("Match state could not be persisted.");
    }
};

const finishDisconnectedMatch = async (io, match, socketId) => {
    const player = getPlayerBySocket(match, socketId);

    if (!player || match.status !== "active") {
        return;
    }

    match.status = "abandoned";
    match.winningCells = [];
    match.winnerSymbol = null;
    match.winnerUserId = null;

    await TicTacToeMatch.findOneAndUpdate(
        { matchId: match.matchId, status: "active" },
        {
            $set: {
                status: "abandoned",
                winnerSymbol: null,
                winnerUserId: null,
                winningCells: []
            }
        }
    );

    const opponent = match.players[player.symbol === "X" ? "O" : "X"];
    io.to(opponent.socketId).emit("tic-tac-toe:opponent-left", {
        message: "Your opponent left the match."
    });
    emitState(io, match);
    activeMatches.delete(match.matchId);
};

const attachTicTacToe = (io) => {
    io.on("connection", (socket) => {
        socket.on("tic-tac-toe:queue", async () => {
            if (socket.user?.isGuest) {
                socket.emit("tic-tac-toe:error", { message: "Sign in to play against another player." });
                return;
            }
            removeFromQueue(socket.id);

            const existingOpponent = waitingPlayers
                .map((socketId) => io.sockets.sockets.get(socketId))
                .find((candidate) => candidate && candidate.connected);

            if (!existingOpponent) {
                waitingPlayers.push(socket.id);
                socket.emit("tic-tac-toe:queue-status", {
                    status: "searching",
                    timeoutMs: MATCHMAKING_WINDOW_MS
                });

                const timer = setTimeout(() => {
                    removeFromQueue(socket.id);
                    socket.emit("tic-tac-toe:matchmaking-timeout");
                }, MATCHMAKING_WINDOW_MS);

                waitingTimers.set(socket.id, timer);
                return;
            }

            removeFromQueue(existingOpponent.id);

            const matchId = crypto.randomUUID();
            const room = `tic-tac-toe:${matchId}`;
            const first = socket;
            const second = existingOpponent;
            const players = {
                X: {
                    socketId: first.id,
                    userId: first.user.id,
                    username: first.user.username,
                    symbol: "X"
                },
                O: {
                    socketId: second.id,
                    userId: second.user.id,
                    username: second.user.username,
                    symbol: "O"
                }
            };

            const match = {
                matchId,
                room,
                board: Array(9).fill(null),
                currentTurn: "X",
                status: "active",
                winnerSymbol: null,
                winningCells: [],
                players
            };

            try {
                await TicTacToeMatch.create({
                    matchId,
                    mode: "multiplayer",
                    players: [players.X, players.O].map((player) => ({
                        userId: player.userId,
                        username: player.username,
                        symbol: player.symbol
                    })),
                    board: match.board,
                    currentTurn: "X",
                    status: "active"
                });
            } catch (_error) {
                socket.emit("tic-tac-toe:error", {
                    message: "Unable to create a multiplayer match."
                });
                existingOpponent.emit("tic-tac-toe:error", {
                    message: "Unable to create a multiplayer match."
                });
                return;
            }

            activeMatches.set(matchId, match);
            first.join(room);
            second.join(room);

            first.emit("tic-tac-toe:matched", {
                match: publicMatch(match),
                ownSymbol: "X",
                opponentUsername: players.O.username
            });
            second.emit("tic-tac-toe:matched", {
                match: publicMatch(match),
                ownSymbol: "O",
                opponentUsername: players.X.username
            });
        });

        socket.on("tic-tac-toe:cancel", () => {
            removeFromQueue(socket.id);

            for (const match of activeMatches.values()) {
                if (getPlayerBySocket(match, socket.id)) {
                    finishDisconnectedMatch(io, match, socket.id).catch(() => {});
                    break;
                }
            }
        });

        socket.on("tic-tac-toe:move", async (payload = {}) => {
            const match = activeMatches.get(payload.matchId);

            if (!match) {
                socket.emit("tic-tac-toe:error", {
                    message: "Match not found."
                });
                return;
            }

            try {
                await withMatchLock(match.matchId, async () => {
                    const player = getPlayerBySocket(match, socket.id);

                    if (!player) {
                        throw new Error("You are not a member of this match.");
                    }

                    if (match.status !== "active") {
                        throw new Error("This match has already ended.");
                    }

                    if (match.currentTurn !== player.symbol) {
                        throw new Error("It is not your turn.");
                    }

                    const cell = payload.cell;

                    if (!Number.isInteger(cell) || cell < 0 || cell > 8) {
                        throw new Error("Choose a valid board cell.");
                    }

                    if (match.board[cell]) {
                        throw new Error("That board cell is already occupied.");
                    }

                    const nextBoard = match.board.slice();
                    nextBoard[cell] = player.symbol;
                    const result = getBoardResult(nextBoard);
                    const nextState = {
                        board: nextBoard,
                        currentTurn: result.status === "active"
                            ? player.symbol === "X" ? "O" : "X"
                            : match.currentTurn,
                        status: result.status,
                        winnerSymbol: result.winner,
                        winnerUserId: result.winner === player.symbol
                            ? player.userId
                            : null,
                        winningCells: result.winningCells
                    };

                    await persistMove(match, nextState);
                    Object.assign(match, nextState);

                    emitState(io, match);

                    if (result.status === "won") {
                        const totalXp = await awardTicTacToeWinXp({
                            matchId: match.matchId,
                            userId: player.userId
                        });

                        if (totalXp !== null) {
                            io.to(player.socketId).emit("tic-tac-toe:xp-awarded", {
                                xpEarned: TIC_TAC_TOE_WIN_XP,
                                totalXp
                            });
                        }
                    }
                });
            } catch (error) {
                socket.emit("tic-tac-toe:error", {
                    message: error.message || "Move rejected."
                });
            }
        });

        socket.on("disconnect", () => {
            removeFromQueue(socket.id);

            for (const match of activeMatches.values()) {
                if (getPlayerBySocket(match, socket.id)) {
                    finishDisconnectedMatch(io, match, socket.id).catch(() => {});
                    break;
                }
            }
        });
    });
};

module.exports = {
    attachTicTacToe
};
