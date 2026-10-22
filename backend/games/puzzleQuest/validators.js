"use strict";

const { PUZZLE_CATALOG } = require("./catalog");

/**
 * Validates catalog integrity: exactly 50 levels from 1 to 50 with no gaps,
 * and exactly 50 unique catalog IDs.
 */
function validateCatalog() {
    if (!Array.isArray(PUZZLE_CATALOG) || PUZZLE_CATALOG.length !== 50) {
        throw new Error(`Catalog must contain exactly 50 entries, found ${PUZZLE_CATALOG?.length}`);
    }

    const levels = new Set();
    const catalogIds = new Set();

    for (const puzzle of PUZZLE_CATALOG) {
        if (!Number.isInteger(puzzle.level) || puzzle.level < 1 || puzzle.level > 50) {
            throw new Error(`Invalid progression level: ${puzzle.level}`);
        }
        if (levels.has(puzzle.level)) {
            throw new Error(`Duplicate progression level: ${puzzle.level}`);
        }
        levels.add(puzzle.level);

        if (!Number.isInteger(puzzle.catalogId) || puzzle.catalogId < 1 || puzzle.catalogId > 50) {
            throw new Error(`Invalid catalogId: ${puzzle.catalogId}`);
        }
        if (catalogIds.has(puzzle.catalogId)) {
            throw new Error(`Duplicate catalogId: ${puzzle.catalogId}`);
        }
        catalogIds.add(puzzle.catalogId);
    }

    return {
        valid: true,
        totalLevels: levels.size,
        totalCatalogIds: catalogIds.size
    };
}

/**
 * Counts squares of all sizes (1x1 to boardSize x boardSize) that contain NEITHER of the given rooks.
 * Coordinates are 1-indexed.
 */
function countRookFreeSquares(boardSize = 8, rooks = [{ row: 3, col: 4 }, { row: 6, col: 6 }]) {
    let totalSquares = 0;
    let rookFreeSquares = 0;

    for (let size = 1; size <= boardSize; size++) {
        for (let r = 1; r <= boardSize - size + 1; r++) {
            for (let c = 1; c <= boardSize - size + 1; c++) {
                totalSquares++;
                const hasRook = rooks.some(rook =>
                    rook.row >= r && rook.row < r + size &&
                    rook.col >= c && rook.col < c + size
                );
                if (!hasRook) {
                    rookFreeSquares++;
                }
            }
        }
    }

    return { totalSquares, rookFreeSquares };
}

/**
 * Level 18 — Eight-Cell Number Placement validator.
 * Cells layout:
 *     [0] [1]
 * [2] [3] [4] [5]
 *     [6] [7]
 * Placed array must contain numbers 1 through 8.
 * Consecutive numbers must NOT touch horizontally, vertically, or diagonally.
 */
const EIGHT_CELL_ADJACENCY = {
    0: [1, 2, 3, 4],
    1: [0, 3, 4, 5],
    2: [0, 3, 6],
    3: [0, 1, 2, 4, 6, 7],
    4: [0, 1, 3, 5, 6, 7],
    5: [1, 4, 7],
    6: [2, 3, 4, 7],
    7: [3, 4, 5, 6]
};

function validateEightCells(placed) {
    if (!Array.isArray(placed) || placed.length !== 8) return false;
    const sorted = [...placed].sort((a, b) => a - b);
    for (let i = 0; i < 8; i++) {
        if (sorted[i] !== i + 1) return false;
    }

    for (let i = 0; i < 8; i++) {
        const val = placed[i];
        for (const neighbor of EIGHT_CELL_ADJACENCY[i]) {
            if (Math.abs(val - placed[neighbor]) === 1) {
                return false;
            }
        }
    }
    return true;
}

/**
 * Level 12 — Crack the Code validator.
 */
function validateCrackTheCode(codeStr, clues) {
    if (!/^\d{3}$/.test(codeStr)) return false;
    const digits = codeStr.split("");
    // Digits must be distinct
    if (new Set(digits).size !== 3) return false;

    for (const clue of clues) {
        const guessDigits = clue.guess.split("");
        let placedCount = 0;
        let correctCount = 0;

        for (let i = 0; i < 3; i++) {
            if (digits[i] === guessDigits[i]) {
                placedCount++;
                correctCount++;
            } else if (digits.includes(guessDigits[i])) {
                correctCount++;
            }
        }

        if (placedCount !== clue.placed || correctCount !== clue.correct) {
            return false;
        }
    }
    return true;
}

/**
 * Level 13 — Magic Square 3x3 validator.
 * Accepts any valid rotation or reflection of the 3x3 magic square.
 */
function validateMagicSquare(grid) {
    if (!Array.isArray(grid) || grid.length !== 3) return false;
    const flat = grid.flat();
    if (flat.length !== 9) return false;

    const sorted = [...flat].sort((a, b) => a - b);
    for (let i = 0; i < 9; i++) {
        if (sorted[i] !== i + 1) return false;
    }

    const TARGET = 15;
    // Rows
    for (let r = 0; r < 3; r++) {
        if (grid[r][0] + grid[r][1] + grid[r][2] !== TARGET) return false;
    }
    // Cols
    for (let c = 0; c < 3; c++) {
        if (grid[0][c] + grid[1][c] + grid[2][c] !== TARGET) return false;
    }
    // Diagonals
    if (grid[0][0] + grid[1][1] + grid[2][2] !== TARGET) return false;
    if (grid[0][2] + grid[1][1] + grid[2][0] !== TARGET) return false;

    return true;
}

/**
 * Level 36 — Three Jealous Animal Pairs River Crossing BFS Solver (Option A).
 */
function isSafeGroupOptionA(group) {
    const dominants = group.filter(e => ["A", "B", "C"].includes(e));
    const companions = group.filter(e => ["a", "b", "c"].includes(e));
    for (const c of companions) {
        const partner = c.toUpperCase();
        if (!dominants.includes(partner) && dominants.length > 0) {
            return false;
        }
    }
    return true;
}

function solveJealousPairs() {
    const all = ["A", "B", "C", "a", "b", "c"];
    const startState = {
        left: [...all].sort(),
        right: [],
        boat: 0 // 0 = Left, 1 = Right
    };

    const stateKey = (s) => s.left.join("") + "|" + s.right.join("") + "|" + s.boat;
    const queue = [{ state: startState, path: [] }];
    const visited = new Set([stateKey(startState)]);

    while (queue.length > 0) {
        const { state, path } = queue.shift();
        if (state.right.length === 6) {
            return { solvable: true, minCrossings: path.length, path };
        }

        const currentBank = state.boat === 0 ? state.left : state.right;
        const otherBank = state.boat === 0 ? state.right : state.left;

        for (let i = 0; i < currentBank.length; i++) {
            const single = [currentBank[i]];
            tryBranch(single);
            for (let j = i + 1; j < currentBank.length; j++) {
                const pair = [currentBank[i], currentBank[j]];
                tryBranch(pair);
            }
        }

        function tryBranch(boat) {
            if (!isSafeGroupOptionA(boat)) return;
            const newCurrent = currentBank.filter(e => !boat.includes(e));
            const newOther = [...otherBank, ...boat].sort();

            if (!isSafeGroupOptionA(newCurrent) || !isSafeGroupOptionA(newOther)) return;

            const nextState = {
                left: state.boat === 0 ? newCurrent : newOther,
                right: state.boat === 0 ? newOther : newCurrent,
                boat: 1 - state.boat
            };

            const key = stateKey(nextState);
            if (!visited.has(key)) {
                visited.add(key);
                queue.push({
                    state: nextState,
                    path: [...path, { boat, from: state.boat === 0 ? "Left" : "Right", to: state.boat === 0 ? "Right" : "Left" }]
                });
            }
        }
    }

    return { solvable: false, minCrossings: -1, path: [] };
}

/**
 * Level 40 — Word Search Validator.
 */
function validateWordSearch(grid, words) {
    const dirs = [
        [0, 1], [0, -1], [1, 0], [-1, 0],
        [1, 1], [1, -1], [-1, 1], [-1, -1]
    ];
    const results = {};
    let allFound = true;

    for (const word of words) {
        const w = word.toUpperCase();
        results[word] = [];
        for (let r = 0; r < grid.length; r++) {
            for (let c = 0; c < grid[r].length; c++) {
                for (const [dr, dc] of dirs) {
                    let match = true;
                    for (let i = 0; i < w.length; i++) {
                        const nr = r + dr * i;
                        const nc = c + dc * i;
                        if (nr < 0 || nr >= grid.length || nc < 0 || nc >= grid[r].length || grid[nr][nc] !== w[i]) {
                            match = false;
                            break;
                        }
                    }
                    if (match) {
                        results[word].push({
                            start: [r, c],
                            end: [r + dr * (w.length - 1), c + dc * (w.length - 1)],
                            dir: [dr, dc]
                        });
                    }
                }
            }
        }
        if (results[word].length === 0) {
            allFound = false;
        }
    }

    return { allFound, results };
}

/**
 * Sliding puzzle parity checker (solvability on odd/even grid dimensions).
 */
function isSlidingBoardSolvable(board, gridSize) {
    const tiles = board.flat().filter(x => x !== null && x !== 0);
    let inversions = 0;
    for (let i = 0; i < tiles.length; i++) {
        for (let j = i + 1; j < tiles.length; j++) {
            if (tiles[i] > tiles[j]) inversions++;
        }
    }

    if (gridSize % 2 !== 0) {
        // Odd width: solvable iff inversions is even
        return inversions % 2 === 0;
    } else {
        // Even width: find blank row from bottom (1-indexed)
        let blankRowFromBottom = 1;
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                if (board[r][c] === null || board[r][c] === 0) {
                    blankRowFromBottom = gridSize - r;
                }
            }
        }
        // Solvable if (blankRowFromBottom is odd and inversions is even) or (blankRowFromBottom is even and inversions is odd)
        return (blankRowFromBottom % 2 === 1 && inversions % 2 === 0) ||
               (blankRowFromBottom % 2 === 0 && inversions % 2 === 1);
    }
}

/**
 * Level 43 — 8 Queens Domination & Non-Attacking Validator.
 */
function getQueenDominationCoverage(queens, boardSize = 8) {
    const covered = Array.from({ length: boardSize }, () => Array(boardSize).fill(false));
    for (const [qr, qc] of queens) {
        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                if (r === qr || c === qc || Math.abs(r - qr) === Math.abs(c - qc)) {
                    covered[r][c] = true;
                }
            }
        }
    }

    let coveredCount = 0;
    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            if (covered[r][c]) coveredCount++;
        }
    }

    let nonAttacking = true;
    for (let i = 0; i < queens.length; i++) {
        for (let j = i + 1; j < queens.length; j++) {
            const [r1, c1] = queens[i];
            const [r2, c2] = queens[j];
            if (r1 === r2 || c1 === c2 || Math.abs(r1 - r2) === Math.abs(c1 - c2)) {
                nonAttacking = false;
                break;
            }
        }
        if (!nonAttacking) break;
    }

    return {
        totalSquares: boardSize * boardSize,
        coveredSquares: coveredCount,
        allCovered: coveredCount === boardSize * boardSize,
        nonAttacking,
        valid: (queens.length === boardSize) && (coveredCount === boardSize * boardSize) && nonAttacking
    };
}

module.exports = {
    validateCatalog,
    countRookFreeSquares,
    validateEightCells,
    validateCrackTheCode,
    validateMagicSquare,
    isSafeGroupOptionA,
    solveJealousPairs,
    validateWordSearch,
    isSlidingBoardSolvable,
    getQueenDominationCoverage
};

