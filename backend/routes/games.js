const crypto = require("crypto");
const express = require("express");

const TicTacToeMatch = require("../models/TicTacToeMatch");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");
const {
    chooseComputerMove,
    chooseInfiniteComputerMove,
    getBoardResult
} = require("../games/ticTacToe");
const { awardTicTacToeWinXp, TIC_TAC_TOE_WIN_XP } = require("../services/xp");
const createHttpError = require("../utils/httpError");
const { games } = require("../games/registry");

const router = express.Router();
const matchLocks = new Map();

const asyncRoute = (handler) => (request, response, next) =>
    Promise.resolve(handler(request, response, next)).catch(next);

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

const toPublicMatch = (match, totalXp = null) => ({
    matchId: match.matchId,
    mode: match.mode,
    variant: match.variant || "standard",
    moveOrder: {
        X: match.xMoves || [],
        O: match.oMoves || []
    },
    board: match.board,
    currentTurn: match.currentTurn,
    status: match.status,
    winner: match.winnerSymbol,
    winningCells: match.winningCells,
    xpAwarded: totalXp !== null,
    xpEarned: totalXp !== null ? TIC_TAC_TOE_WIN_XP : 0,
    totalXp,
    players: match.players.map((player) => ({
        username: player.username,
        symbol: player.symbol
    }))
});

router.get("/registry", (_request, response) => {
    response.json({ success: true, data: { games } });
});

router.get("/word-bomb/validate", (request, response) => {
    const word = String(request.query?.word || "").trim().toLowerCase();
    const { hasWord } = require("../services/wordnikDictionary");
    const valid = /^[a-z]{3,64}$/.test(word) && hasWord(word);
    response.json({ success: true, valid, word });
});


const wordBombRooms = require("../services/wordBombRooms");

const getWordBombActor = async (req) => {
    if (req.user) {
        return {
            id: req.user._id.toString(),
            userId: req.user._id.toString(),
            username: req.user.username,
            isGuest: false
        };
    }
    const session = req.session;
    if (session?.userId) {
        try {
            const user = await User.findById(session.userId).select("username xp");
            if (user) {
                return {
                    id: user._id.toString(),
                    userId: user._id.toString(),
                    username: user.username,
                    isGuest: false
                };
            }
        } catch (_e) {}
    }
    const token = req.headers["x-browser-session"] || req.body?.browserToken;
    const actorId = token ? `guest:${token.slice(0, 16)}` : `guest:${crypto.randomUUID()}`;
    const actorName = req.body?.username || (token ? `Guest${token.slice(0, 6).toUpperCase()}` : "GUEST");
    return {
        id: actorId,
        userId: null,
        username: actorName,
        isGuest: true
    };
};

router.get(
    "/word-bomb/lobbies",
    asyncRoute(async (_request, response) => {
        const lobbies = await wordBombRooms.getActiveLobbies();
        response.json({ success: true, data: { lobbies } });
    })
);

router.post(
    "/word-bomb/room/create",
    asyncRoute(async (request, response) => {
        const actor = await getWordBombActor(request);
        const isPublic = request.body?.isPublic !== false;
        const room = await wordBombRooms.createRoom(actor, isPublic);
        response.json({ success: true, data: { room } });
    })
);

router.post(
    "/word-bomb/room/join",
    asyncRoute(async (request, response) => {
        const actor = await getWordBombActor(request);
        const code = String(request.body?.code || "").trim().toUpperCase();
        try {
            const room = await wordBombRooms.joinRoom(actor, code);
            response.json({ success: true, data: { room } });
        } catch (err) {
            response.status(400).json({
                success: false,
                error: { message: err.message, isFull: Boolean(err.isFull) }
            });
        }
    })
);

router.get(
    "/word-bomb/room/:code",
    asyncRoute(async (request, response) => {
        const code = String(request.params?.code || "").trim().toUpperCase();
        const room = await wordBombRooms.getRoomState(code);
        if (!room) {
            return response.status(404).json({ success: false, error: { message: "Room not found." } });
        }
        response.json({ success: true, data: { room } });
    })
);

router.post(
    "/word-bomb/room/start",
    asyncRoute(async (request, response) => {
        const actor = await getWordBombActor(request);
        const code = String(request.body?.code || "").trim().toUpperCase();
        try {
            const room = await wordBombRooms.startRoom(actor, code);
            response.json({ success: true, data: { room } });
        } catch (err) {
            response.status(400).json({ success: false, error: { message: err.message } });
        }
    })
);

router.post(
    "/word-bomb/room/submit",
    asyncRoute(async (request, response) => {
        const actor = await getWordBombActor(request);
        const code = String(request.body?.code || "").trim().toUpperCase();
        const word = request.body?.word;
        try {
            const result = await wordBombRooms.submitWord(actor, code, word);
            response.json({ success: true, data: result });
        } catch (err) {
            response.status(400).json({ success: false, error: { message: err.message } });
        }
    })
);

router.post(
    "/word-bomb/room/leave",
    asyncRoute(async (request, response) => {
        const actor = await getWordBombActor(request);
        const code = String(request.body?.code || "").trim().toUpperCase();
        await wordBombRooms.leaveRoom(actor, code);
        response.json({ success: true });
    })
);

router.use(requireAuth);

router.post(
    "/word-bomb/award-xp",
    asyncRoute(async (request, response) => {
        const xpEarned = parseInt(request.body?.xpEarned, 10) || 0;
        if (xpEarned <= 0) {
            return response.json({
                success: true,
                data: { xpEarned: 0, totalXp: request.user.xp }
            });
        }
        const validXp = Math.min(xpEarned, 1000);
        const user = await User.findByIdAndUpdate(
            request.user._id,
            { $inc: { xp: validXp } },
            { new: true }
        ).select("xp username");
        response.json({
            success: true,
            data: { xpEarned: validXp, totalXp: user ? user.xp : (request.user.xp + validXp) }
        });
    })
);

router.post(
    "/cricket/award-xp",
    asyncRoute(async (request, response) => {
        const xpEarned = parseInt(request.body?.xpEarned, 10) || 0;
        if (xpEarned <= 0) {
            return response.json({
                success: true,
                data: { xpEarned: 0, totalXp: request.user.xp }
            });
        }

        const validXp = Math.min(xpEarned, 2000);
        const user = await User.findByIdAndUpdate(
            request.user._id,
            { $inc: { xp: validXp } },
            { new: true }
        ).select("xp username");

        response.json({
            success: true,
            data: {
                xpEarned: validXp,
                totalXp: user ? user.xp : (request.user.xp + validXp)
            }
        });
    })
);

router.post(
    "/tic-tac-toe/computer/matches",
    asyncRoute(async (request, response) => {
        const variant = request.body?.variant === "infinite" ? "infinite" : "standard";

        const match = await TicTacToeMatch.create({
            matchId: crypto.randomUUID(),
            mode: "computer",
            variant,
            xMoves: [],
            oMoves: [],
            players: [
                {
                    userId: request.user._id,
                    username: request.user.username,
                    symbol: "X"
                }
            ],
            board: Array(9).fill(null),
            currentTurn: "X",
            status: "active"
        });

        response.status(201).json({
            success: true,
            data: {
                match: toPublicMatch(match)
            }
        });
    })
);

router.get(
    "/tic-tac-toe/computer/matches/:matchId",
    asyncRoute(async (request, response) => {
        const match = await TicTacToeMatch.findOne({
            matchId: request.params.matchId,
            mode: "computer",
            "players.userId": request.user._id
        });

        if (!match) {
            throw createHttpError(404, "Match not found.");
        }

        response.json({
            success: true,
            data: {
                match: toPublicMatch(match)
            }
        });
    })
);

router.post(
    "/tic-tac-toe/computer/matches/:matchId/moves",
    asyncRoute(async (request, response) => {
        const { matchId } = request.params;

        const result = await withMatchLock(matchId, async () => {
            const match = await TicTacToeMatch.findOne({
                matchId,
                mode: "computer",
                "players.userId": request.user._id
            });

            if (!match) {
                throw createHttpError(404, "Match not found.");
            }

            if (match.status !== "active") {
                throw createHttpError(409, "This match has already ended.");
            }

            if (match.currentTurn !== "X") {
                throw createHttpError(409, "It is not your turn.");
            }

            const cell = request.body.cell;

            if (!Number.isInteger(cell) || cell < 0 || cell > 8) {
                throw createHttpError(400, "Choose a valid board cell.");
            }

            if (match.board[cell]) {
                throw createHttpError(409, "That board cell is already occupied.");
            }

            const isInfinite = match.variant === "infinite";

            if (isInfinite) {
                if (!Array.isArray(match.xMoves)) match.xMoves = [];
                if (!Array.isArray(match.oMoves)) match.oMoves = [];

                // When player places 4th marker, oldest vanishes automatically
                if (match.xMoves.length >= 3) {
                    const oldestX = match.xMoves.shift();
                    match.board[oldestX] = null;
                }

                match.board[cell] = "X";
                match.xMoves.push(cell);
                match.markModified("board");
                match.markModified("xMoves");

                let boardResult = getBoardResult(match.board);
                let totalXp = null;

                if (boardResult.status === "won") {
                    match.status = "won";
                    match.winnerSymbol = boardResult.winner;
                    match.winningCells = boardResult.winningCells;
                    match.winnerUserId = request.user._id;

                    await match.save();
                    totalXp = await awardTicTacToeWinXp({
                        matchId,
                        userId: request.user._id
                    });
                } else {
                    match.currentTurn = "O";
                    const computerCell = chooseInfiniteComputerMove(
                        match.board,
                        match.oMoves,
                        match.xMoves
                    );

                    if (computerCell !== null) {
                        if (match.oMoves.length >= 3) {
                            const oldestO = match.oMoves.shift();
                            match.board[oldestO] = null;
                        }

                        match.board[computerCell] = "O";
                        match.oMoves.push(computerCell);
                        match.markModified("board");
                        match.markModified("oMoves");

                        boardResult = getBoardResult(match.board);

                        if (boardResult.status === "won") {
                            match.status = "won";
                            match.winnerSymbol = boardResult.winner;
                            match.winningCells = boardResult.winningCells;
                            match.winnerUserId = null;
                        } else {
                            match.currentTurn = "X";
                        }
                    }

                    await match.save();
                }

                return toPublicMatch(match, totalXp);
            }

            // Standard Mode logic
            match.board[cell] = "X";

            let boardResult = getBoardResult(match.board);
            let totalXp = null;

            if (boardResult.status === "won") {
                match.status = "won";
                match.winnerSymbol = boardResult.winner;
                match.winningCells = boardResult.winningCells;
                match.winnerUserId = request.user._id;

                await match.save();
                totalXp = await awardTicTacToeWinXp({
                    matchId,
                    userId: request.user._id
                });
            } else if (boardResult.status === "draw") {
                match.status = "draw";
                match.winningCells = [];
                await match.save();
            } else {
                match.currentTurn = "O";
                const computerCell = chooseComputerMove(match.board);

                if (computerCell === null) {
                    match.status = "draw";
                    match.currentTurn = "X";
                    boardResult = getBoardResult(match.board);
                } else {
                    match.board[computerCell] = "O";
                    boardResult = getBoardResult(match.board);

                    if (boardResult.status === "won") {
                        match.status = "won";
                        match.winnerSymbol = boardResult.winner;
                        match.winningCells = boardResult.winningCells;
                        match.winnerUserId = null;
                    } else if (boardResult.status === "draw") {
                        match.status = "draw";
                        match.winningCells = [];
                    } else {
                        match.currentTurn = "X";
                    }
                }

                await match.save();
            }

            return toPublicMatch(match, totalXp);
        });

        response.json({
            success: true,
            data: {
                match: result
            }
        });
    })
);

module.exports = router;
