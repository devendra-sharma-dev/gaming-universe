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

module.exports = {
    WIN_LINES,
    getWinner,
    getAvailableMoves,
    getBoardResult,
    chooseComputerMove
};
