const crypto = require("crypto");
const express = require("express");

const TicTacToeMatch = require("../models/TicTacToeMatch");
const { requireAuth } = require("../middleware/auth");
const {
    chooseComputerMove,
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

router.use(requireAuth);

router.post(
    "/tic-tac-toe/computer/matches",
    asyncRoute(async (request, response) => {
        const match = await TicTacToeMatch.create({
            matchId: crypto.randomUUID(),
            mode: "computer",
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
