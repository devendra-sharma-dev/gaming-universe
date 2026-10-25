const WIN_LINES = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
];

const getWinner = (board) => {
    for (const line of WIN_LINES) {
        const [first, second, third] = line;

        if (
            board[first] &&
            board[first] === board[second] &&
            board[first] === board[third]
        ) {
            return {
                symbol: board[first],
                winningCells: line
            };
        }
    }

    return null;
};

const getAvailableMoves = (board) =>
    board.reduce((moves, cell, index) => {
        if (!cell) {
            moves.push(index);
        }

        return moves;
    }, []);

const getBoardResult = (board) => {
    const winner = getWinner(board);

    if (winner) {
        return {
            status: "won",
            winner: winner.symbol,
            winningCells: winner.winningCells
        };
    }

    if (getAvailableMoves(board).length === 0) {
        return {
            status: "draw",
            winner: null,
            winningCells: []
        };
    }

    return {
        status: "active",
        winner: null,
        winningCells: []
    };
};

const minimax = (board, maximizing) => {
    const result = getBoardResult(board);

    if (result.status === "won") {
        return result.winner === "O" ? 10 : -10;
    }

    if (result.status === "draw") {
        return 0;
    }

    const scores = [];

    for (const move of getAvailableMoves(board)) {
        board[move] = maximizing ? "O" : "X";
        const score = minimax(board, !maximizing);
        board[move] = null;
        scores.push(score);
    }

    return maximizing ? Math.max(...scores) : Math.min(...scores);
};

const chooseComputerMove = (board, options = {}) => {
    const mistakeChance = Number.isFinite(options.mistakeChance)
        ? options.mistakeChance
        : 0.42;
    const availableMoves = getAvailableMoves(board);

    // The computer is deliberately beatable: most turns are strategic,
    // while some turns use a legal suboptimal move so outcomes stay varied.
    if (availableMoves.length && Math.random() < mistakeChance) {
        return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }

    let bestScore = -Infinity;
    let bestMove = null;

    for (const move of getAvailableMoves(board)) {
        board[move] = "O";
        const score = minimax(board, false);
        board[move] = null;

        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }

    return bestMove;
};

/**
 * Intelligent move choice for Infinite Tic-Tac-Toe.
 * In Infinite Mode, each player has at most 3 markers.
 * When placing a 4th marker, that player's oldest marker vanishes first.
 */
const chooseInfiniteComputerMove = (board, oMoves = [], xMoves = [], options = {}) => {
    const mistakeChance = Number.isFinite(options.mistakeChance)
        ? options.mistakeChance
        : 0.25;

    const oldestO = oMoves.length >= 3 ? oMoves[0] : null;
    const oldestX = xMoves.length >= 3 ? xMoves[0] : null;

    // Available moves for O: currently empty cells plus O's oldest cell (which will vacate)
    const availableMoves = [];
    for (let i = 0; i < 9; i++) {
        if (!board[i] || i === oldestO) {
            availableMoves.push(i);
        }
    }

    if (!availableMoves.length) return null;

    if (availableMoves.length > 1 && Math.random() < mistakeChance) {
        return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }

    // 1. Can O win on this move?
    for (const move of availableMoves) {
        const simBoard = board.slice();
        if (oldestO !== null) {
            simBoard[oldestO] = null;
        }
        simBoard[move] = "O";
        const winner = getWinner(simBoard);
        if (winner && winner.symbol === "O") {
            return move;
        }
    }

    // 2. Can X win on their next move? If so, block them!
    const xAvailableMoves = [];
    for (let i = 0; i < 9; i++) {
        if (!board[i] || i === oldestX) {
            xAvailableMoves.push(i);
        }
    }

    for (const xMove of xAvailableMoves) {
        const simBoard = board.slice();
        if (oldestX !== null) {
            simBoard[oldestX] = null;
        }
        simBoard[xMove] = "X";
        const winner = getWinner(simBoard);
        if (winner && winner.symbol === "X") {
            if (availableMoves.includes(xMove)) {
                return xMove;
            }
        }
    }

    // 3. Take center (cell 4) if open
    if (availableMoves.includes(4)) return 4;

    // 4. Take corners if available
    const corners = [0, 2, 6, 8].filter((c) => availableMoves.includes(c));
    if (corners.length) {
        return corners[Math.floor(Math.random() * corners.length)];
    }

    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
};

module.exports = {
    WIN_LINES,
    getWinner,
    getAvailableMoves,
    getBoardResult,
    chooseComputerMove,
    chooseInfiniteComputerMove
};
