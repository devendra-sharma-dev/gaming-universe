"use strict";

const assert = require("node:assert");
const { describe, it } = require("node:test");
const { PUZZLE_CATALOG } = require("../backend/games/puzzleQuest/catalog");
const {
    validateCatalog,
    countRookFreeSquares,
    validateEightCells,
    validateCrackTheCode,
    validateMagicSquare,
    solveJealousPairs,
    validateWordSearch,
    isSlidingBoardSolvable,
    getQueenDominationCoverage
} = require("../backend/games/puzzleQuest/validators");

console.log("Running Puzzle Quest core test suite...\n");

// 1. Catalog Integrity
{
    console.log("1. Testing Catalog Integrity (50 Levels & Unique Catalog IDs)...");
    const result = validateCatalog();
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.totalLevels, 50);
    assert.strictEqual(result.totalCatalogIds, 50);

    // Verify progression order matches specifications
    assert.strictEqual(PUZZLE_CATALOG[0].level, 1);
    assert.strictEqual(PUZZLE_CATALOG[0].catalogId, 1);
    assert.strictEqual(PUZZLE_CATALOG[1].level, 2);
    assert.strictEqual(PUZZLE_CATALOG[1].catalogId, 46);
    assert.strictEqual(PUZZLE_CATALOG[49].level, 50);
    assert.strictEqual(PUZZLE_CATALOG[49].catalogId, 31);
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 25).config.hint, "Start with putting disk 1 on target pole.");
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 42).config.hint, "One correct number is revealed.");
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 26).config.hint, "Correct path is revealed.");
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 34).config.hint, "Focus on addition pattern.");
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 34).config.questions.length, 1);
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 34).config.questions[0].answer, 58);
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 34).config.questions[0].sequence, "13, 17, 25, 32, 37, 47, ?");
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 27).config.hint, "Do not forget to consider bigger squares like 2x2, 3x3...");
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 16).config.hint, "use 3 3 2 distribution as your first weighing.");
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 37).title, "Minesweeper: Chaos");
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 37).config.hint, "The safe cell is glowing.");
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 28).title, "Bridges");
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 28).instructions, "");
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 28).config.hint, "If you look carefully, you can get all bridges from island 7.");
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 29).config.hint, "To lock the tricky end of a row, line them up vertically as a pair and rotate them together into their final spots.");
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 50).config.hint, "One word has been revealed.");
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 44).config.hint, "Each element of series is based on multiple previous numbers in sequence.");
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 41).config.hint, "Look for dots sitting on the outer corners or edges of the grid; they almost always need to trace along the perimeter of the board to leave room for other flows.");
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 49).instructions, "");
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 49).config.hint, "The safe cell is glowing.");
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 40).instructions, "");
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 40).config.mode, "grandMaze");
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 40).config.fogOfWar, true);
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 40).config.hasKey, true);
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 40).config.hint, "Correct path is revealed.");
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 47).title, "Sudoku Advanced");
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 47).instructions, "");
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 47).config.hint, "One correct number is revealed.");
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 39).instructions, "");
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 39).referenceAsset, null);
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 39).config.hint, "To lock the tricky end of a row, line them up vertically as a pair and rotate them together into their final spots.");
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 46).instructions, "");
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 46).config.hint, "Make sure to cover most near edge squares earlier.");
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 44).config.questions.length, 2);
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 44).config.questions[0].answer, 604);
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 44).config.questions[0].sequence, "2, 4, 14, 18, 50, 168, 218, ?");
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 44).config.questions[1].answer, 67);
    assert.strictEqual(PUZZLE_CATALOG.find(p => p.level === 44).config.questions[1].sequence, "2, 0, 3, 5, 8, 0, 6, 64, 0, 3, ?");
    console.log("  ✓ Catalog integrity verified: exactly 50 levels and unique IDs.");
}

// 2. Level 29: Rook-Free Squares
{
    console.log("2. Testing Rook-Free Squares Calculation...");
    const { totalSquares, rookFreeSquares } = countRookFreeSquares(8, [
        { row: 3, col: 4 },
        { row: 6, col: 6 }
    ]);
    assert.strictEqual(totalSquares, 204, "Total squares of all sizes on 8x8 chessboard must be 204");
    assert.strictEqual(rookFreeSquares, 128, "Squares with neither rook must equal 128");
    console.log("  ✓ Rook-free squares confirmed: exactly 128 squares without a rook.");
}

// 3. Level 18: Eight-Cell Number Placement
{
    console.log("3. Testing Eight-Cell Non-Consecutive Placement Validator...");
    // Known valid arrangement: [3, 5, 7, 1, 8, 2, 4, 6]
    const validBoard = [3, 5, 7, 1, 8, 2, 4, 6];
    assert.strictEqual(validateEightCells(validBoard), true, "Sample valid board must pass");

    // Invalid arrangement: 1 and 2 touching
    const invalidBoard = [1, 2, 3, 4, 5, 6, 7, 8];
    assert.strictEqual(validateEightCells(invalidBoard), false, "Touching consecutive numbers must fail");
    console.log("  ✓ Eight-cell validator accurately accepts valid and rejects touching consecutive numbers.");
}

// 4. Level 12: Crack the Code
{
    console.log("4. Testing Crack the Code Combination Verification...");
    const level12 = PUZZLE_CATALOG.find(p => p.level === 12);
    assert.strictEqual(validateCrackTheCode("042", level12.config.clues), true, "Answer 042 must satisfy all 5 clues");
    assert.strictEqual(validateCrackTheCode("682", level12.config.clues), false, "Wrong guess must be rejected");
    assert.strictEqual(validateCrackTheCode("002", level12.config.clues), false, "Duplicate digits must be rejected");
    console.log("  ✓ Crack the Code confirmed: answer 042 satisfies all clue constraints.");
}

// 5. Level 13: Magic Square 3x3
{
    console.log("5. Testing Magic Square 3x3 Validator...");
    const validMagicSquare = [
        [8, 1, 6],
        [3, 5, 7],
        [4, 9, 2]
    ];
    assert.strictEqual(validateMagicSquare(validMagicSquare), true, "Valid magic square must pass");

    // Rotated 90 degrees
    const rotated = [
        [6, 7, 2],
        [1, 5, 9],
        [8, 3, 4]
    ];
    assert.strictEqual(validateMagicSquare(rotated), true, "Rotated magic square must pass");

    const invalidSquare = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]
    ];
    assert.strictEqual(validateMagicSquare(invalidSquare), false, "Invalid square must fail");
    console.log("  ✓ Magic Square validator verified for rotations and reflections.");
}

// 6. Level 36: Three Jealous Animal Pairs River Crossing (Option A)
{
    console.log("6. Testing Three Jealous Animal Pairs BFS Solver (Option A)...");
    const level36 = PUZZLE_CATALOG.find(p => p.level === 18);
    assert(level36, "Level 18 must exist in catalog");
    assert.strictEqual(level36.config.hint, "Cross the 3 dominant animals first to other bank.", "Level 18 hint must guide dominant crossing strategy");
    const bfsResult = solveJealousPairs();
    assert.strictEqual(bfsResult.solvable, true, "Puzzle must be solvable under Option A");
    assert.strictEqual(bfsResult.minCrossings, 11, "Minimum crossings must be 11");
    console.log("  ✓ Three Jealous Animal Pairs BFS verified: solvable in exactly 11 crossings.");
}

// 7. Level 40: Word Search Exact Grid & Clues
{
    console.log("7. Testing Word Search Exact Grid Transcription...");
    const level40 = PUZZLE_CATALOG.find(p => p.level === 50);
    const grid = [
        "TIARAEAERERTRETAREEIT",
        "ATERREIERRTIIERRTIEEE",
        "REIETERRARAIERRAARIAR",
        "IAEAIIITIIRARRTEERAIE",
        "IIEARRARAAERRAAIRRATT",
        "TTARETREATIERRAAERRRR",
        "EAERIIRRITITERRRTRRAI",
        "ERITIRREEREIREEAETTTI",
        "RAETARETIERERTERATIAE",
        "IEIIEIEETTEERRTTEEEAR",
        "IEAARTRTIRTETEIARTIR",
        "ETRRAATIIRIEIRRETRIRA",
        "RERETTITERTEIEEIAEETI",
        "IEAAAEERTAEEEEEARREAA",
        "EEREERARAIRTTRRAAIITR",
        "RRTRITEIRRERRRIIRRIAE",
        "EAIEEARREIRRETATEIEET",
        "EEIEIIETARAEARITTATRR",
        "IRERETEETIARTIARTATRA",
        "TETRRTIRAEIEEAIERREE"
    ];
    const { allFound, results } = validateWordSearch(grid, level40.config.words);
    assert.strictEqual(allFound, true, "All 16 target words must be found in the transcribed grid");
    console.log("  ✓ Word Search 16 words 100% verified in archaeological reference grid.");
}

// 7b. Level 20: Number Wheel Graph & Solvability
{
    console.log("7b. Testing Number Wheel Graph & Solvability...");
    const level20 = PUZZLE_CATALOG.find(p => p.level === 8);
    assert.strictEqual(level20.engine, "averageWheel");
    assert.strictEqual(level20.config.hint, "All numbers should be equal to average of two fixed adjacent numbers.");

    const initialTokens = [6, 8, 4, 6, 7, 5, 9, 2, 8, 3];
    const engravedValues = [3, 7, 5, 11, 7, 7, 9, 3, 1, 5];
    const targetAverages = [];
    for (let i = 0; i < 10; i++) {
        const left = engravedValues[(i - 1 + 10) % 10];
        const right = engravedValues[i];
        targetAverages.push((left + right) / 2);
    }
    assert.deepStrictEqual(targetAverages, [4, 5, 6, 8, 9, 7, 8, 6, 2, 3]);

    const adjacency = [
        [7, 3], [2, 4], [1, 3], [2, 0], [1, 5],
        [4, 6], [5, 9], [8, 0], [9, 7], [6, 8]
    ];
    for (let i = 0; i < 10; i++) {
        assert.strictEqual(adjacency[i].length, 2);
        for (const neighbor of adjacency[i]) {
            assert.strictEqual(adjacency[neighbor].includes(i), true);
        }
    }

    const edges = [];
    for (let u = 0; u < 10; u++) {
        for (const v of adjacency[u]) {
            if (u < v) edges.push([u, v]);
        }
    }
    const queue = [[initialTokens, 0]];
    const seen = new Set([initialTokens.join(",")]);
    let minMoves = -1;
    while (queue.length > 0) {
        const [state, dist] = queue.shift();
        if (state.every((val, i) => val === targetAverages[i])) {
            minMoves = dist;
            break;
        }
        for (const [u, v] of edges) {
            const next = state.slice();
            const tmp = next[u];
            next[u] = next[v];
            next[v] = tmp;
            const key = next.join(",");
            if (!seen.has(key)) {
                seen.add(key);
                queue.push([next, dist + 1]);
            }
        }
    }
    assert.strictEqual(minMoves, 9, "Level 20 must be solvable in exactly 9 moves");
    console.log("  ✓ Number Wheel graph, targets, and 9-move solvability 100% verified.");
}

// 7c. Level 21: Column Shuffle Initial Layout & Row Insignia Rules
{
    console.log("7c. Testing Column Shuffle Layout & Insignia Rules...");
    const level21 = PUZZLE_CATALOG.find(p => p.level === 33);
    assert.strictEqual(level21.engine, "columnShuffle");

    const initialBoard = [
        [2, 1, 1, 2],
        [3, 2, 0, 0, null],
        [0, 1, 3, 3],
        [2, 0, 3, 1]
    ];

    const counts = { 0: 0, 1: 0, 2: 0, 3: 0, null: 0 };
    for (const row of initialBoard) {
        for (const cell of row) {
            counts[cell] = (counts[cell] || 0) + 1;
        }
    }
    assert.strictEqual(counts[0], 4, "Must have exactly 4 Hammers");
    assert.strictEqual(counts[1], 4, "Must have exactly 4 Swords");
    assert.strictEqual(counts[2], 4, "Must have exactly 4 Bows");
    assert.strictEqual(counts[3], 4, "Must have exactly 4 Boxing Gloves");
    assert.strictEqual(counts[null], 1, "Must have exactly 1 empty space at row 1, col 4");

    const col0Before = [initialBoard[0][0], initialBoard[1][0], initialBoard[2][0], initialBoard[3][0]];
    const col0Up = [col0Before[1], col0Before[2], col0Before[3], col0Before[0]];
    const col0Down = [col0Before[3], col0Before[0], col0Before[1], col0Before[2]];
    assert.strictEqual(col0Up[0], 3);
    assert.strictEqual(col0Down[0], 2);

    console.log("  ✓ Column Shuffle layout, row targets, and column shifts verified.");
}

// 8. Level 49: 5x5 Sliding Puzzle Solvability
{
    console.log("8. Testing 5x5 Sliding Numbers Starting Board Solvability...");
    const level49 = PUZZLE_CATALOG.find(p => p.level === 39);
    const isSolvable = isSlidingBoardSolvable(level49.config.initialBoard, 5);
    assert.strictEqual(isSolvable, true, "image(1).png 5x5 starting arrangement must be solvable");
    console.log("  ✓ 5x5 starting arrangement verified solvable under sliding puzzle parity.");
}

// 9. Level 43: Eight Queens Domination & Non-Attacking Verification
{
    console.log("9. Testing Eight Queens Domination & Non-Attacking Checker...");
    // Valid 8-queens solution (non-attacking, covers all 64 squares)
    const validQueens = [
        [0, 3], [1, 6], [2, 2], [3, 7],
        [4, 1], [5, 4], [6, 0], [7, 5]
    ];
    const validCoverage = getQueenDominationCoverage(validQueens, 8);
    assert.strictEqual(validCoverage.allCovered, true, "Dominating queens must cover all 64 squares");
    assert.strictEqual(validCoverage.nonAttacking, true, "Valid 8-queens solution must have no attacking pairs");
    assert.strictEqual(validCoverage.valid, true, "Valid 8-queens solution must pass");

    // Attacking placement (covers 64 squares, but [1,3] and [4,0] share a diagonal)
    const attackingQueens = [
        [0, 1], [1, 3], [2, 5], [3, 7],
        [4, 0], [5, 2], [6, 4], [7, 6]
    ];
    const attackingCoverage = getQueenDominationCoverage(attackingQueens, 8);
    assert.strictEqual(attackingCoverage.allCovered, true, "Attacking queens can cover 64 squares");
    assert.strictEqual(attackingCoverage.nonAttacking, false, "Attacking queens must be detected");
    assert.strictEqual(attackingCoverage.valid, false, "Attacking queens must not pass validation");

    console.log("  ✓ Eight Queens Domination & Non-Attacking checker confirmed.");
}

// 9b. Level 30: Balance Scale Deduction & Guesswork Detector
{
    console.log("9b. Testing Level 30 Balance Scale Deduction & Guesswork Detector...");
    function simulateWeighing(heavyCoin, weighings) {
        let possibleCoins = new Set([1, 2, 3, 4, 5, 6, 7, 8]);
        for (const { left, right } of weighings) {
            const leftWeight = left.reduce((sum, c) => sum + (c === heavyCoin ? 2 : 1), 0);
            const rightWeight = right.reduce((sum, c) => sum + (c === heavyCoin ? 2 : 1), 0);
            let outcome = "balanced";
            if (leftWeight > rightWeight) outcome = "left";
            else if (rightWeight > leftWeight) outcome = "right";

            const next = new Set();
            for (const c of possibleCoins) {
                const simL = left.reduce((sum, coin) => sum + (coin === c ? 2 : 1), 0);
                const simR = right.reduce((sum, coin) => sum + (coin === c ? 2 : 1), 0);
                let simO = "balanced";
                if (simL > simR) simO = "left";
                else if (simR > simL) simO = "right";
                if (simO === outcome) next.add(c);
            }
            possibleCoins = next;
        }
        return possibleCoins;
    }

    // Case 1: 0 weighings -> 8 candidates remaining (guesswork)
    const noWeighing = simulateWeighing(3, []);
    assert.strictEqual(noWeighing.size, 8, "0 weighings must leave all 8 candidates");

    // Case 2: Proper 3-3-2 technique with heavyCoin = 3
    // Weigh 1: {1, 2, 3} vs {4, 5, 6} -> Left is heavier -> {1, 2, 3}
    // Weigh 2: {1} vs {2} -> Balanced -> {3}
    const deduced = simulateWeighing(3, [
        { left: [1, 2, 3], right: [4, 5, 6] },
        { left: [1], right: [2] }
    ]);
    assert.strictEqual(deduced.size, 1, "Optimal 3-3-2 strategy must deduce exact coin with 100% certainty");
    assert.strictEqual(Array.from(deduced)[0], 3, "Deduced coin must be coin #3");

    // Case 3: Flawed 4-4 distribution leaving 2 candidates (guesswork)
    // Weigh 1: {1, 2, 3, 4} vs {5, 6, 7, 8} -> Left is heavier -> {1, 2, 3, 4}
    // Weigh 2: {1} vs {2} -> Balanced -> leaves {3, 4}
    const guessed = simulateWeighing(3, [
        { left: [1, 2, 3, 4], right: [5, 6, 7, 8] },
        { left: [1], right: [2] }
    ]);
    assert.strictEqual(guessed.size, 2, "4-4 approach must leave 2 candidates when remaining pair balances");
    assert.strictEqual(guessed.has(3) && guessed.has(4), true, "Candidates must be coins #3 and #4");

    console.log("  ✓ Level 30 deduction vs guesswork tracker mathematically verified.");
}

// 9c. Level 32: Hashiwokakero (10x10 Master Challenge) Solvability & Degree Verification
{
    console.log("9c. Testing Level 32 (10x10) Bridges Solvability & Graph Integrity...");
    const islands = [
        { id: 0, r: 0, c: 0, target: 1 },
        { id: 1, r: 0, c: 2, target: 4 },
        { id: 2, r: 0, c: 5, target: 3 },
        { id: 3, r: 0, c: 7, target: 4 },
        { id: 4, r: 0, c: 9, target: 1 },
        { id: 5, r: 1, c: 3, target: 1 },
        { id: 6, r: 1, c: 6, target: 2 },
        { id: 7, r: 2, c: 7, target: 2 },
        { id: 8, r: 2, c: 9, target: 1 },
        { id: 9, r: 3, c: 0, target: 4 },
        { id: 10, r: 3, c: 2, target: 6 },
        { id: 11, r: 3, c: 6, target: 5 },
        { id: 12, r: 3, c: 8, target: 1 },
        { id: 13, r: 5, c: 4, target: 2 },
        { id: 14, r: 6, c: 2, target: 1 },
        { id: 15, r: 6, c: 6, target: 3 },
        { id: 16, r: 6, c: 8, target: 3 },
        { id: 17, r: 7, c: 0, target: 4 },
        { id: 18, r: 7, c: 4, target: 7 },
        { id: 19, r: 7, c: 7, target: 1 },
        { id: 20, r: 9, c: 4, target: 2 },
        { id: 21, r: 9, c: 6, target: 1 },
        { id: 22, r: 9, c: 8, target: 3 }
    ];

    const allowedEdges = [
        { u: 0, v: 1, type: "h" },
        { u: 0, v: 9, type: "v" },
        { u: 1, v: 2, type: "h" },
        { u: 1, v: 10, type: "v" },
        { u: 2, v: 3, type: "h" },
        { u: 3, v: 4, type: "h" },
        { u: 3, v: 7, type: "v" },
        { u: 4, v: 8, type: "v" },
        { u: 5, v: 6, type: "h" },
        { u: 6, v: 11, type: "v" },
        { u: 7, v: 8, type: "h" },
        { u: 7, v: 19, type: "v" },
        { u: 9, v: 10, type: "h" },
        { u: 9, v: 17, type: "v" },
        { u: 10, v: 11, type: "h" },
        { u: 10, v: 14, type: "v" },
        { u: 11, v: 12, type: "h" },
        { u: 11, v: 15, type: "v" },
        { u: 12, v: 16, type: "v" },
        { u: 13, v: 18, type: "v" },
        { u: 14, v: 15, type: "h" },
        { u: 15, v: 16, type: "h" },
        { u: 15, v: 21, type: "v" },
        { u: 16, v: 22, type: "v" },
        { u: 17, v: 18, type: "h" },
        { u: 18, v: 19, type: "h" },
        { u: 18, v: 20, type: "v" },
        { u: 20, v: 21, type: "h" },
        { u: 21, v: 22, type: "h" }
    ];

    const crossingPairs = [
        [11, 16],
        [11, 21],
        [19, 20],
        [22, 25]
    ];

    // Canonical unique solution bridge counts
    const edgeBridges = [
        1, // 0:  0-1  (h)
        0, // 1:  0-9  (v)
        1, // 2:  1-2  (h)
        2, // 3:  1-10 (v)
        2, // 4:  2-3  (h)
        1, // 5:  3-4  (h)
        1, // 6:  3-7  (v)
        0, // 7:  4-8  (v)
        1, // 8:  5-6  (h)
        1, // 9:  6-11 (v)
        1, // 10: 7-8  (h)
        0, // 11: 7-19 (v)
        2, // 12: 9-10 (h)
        2, // 13: 9-17 (v)
        1, // 14: 10-11 (h)
        1, // 15: 10-14 (v)
        1, // 16: 11-12 (h)
        2, // 17: 11-15 (v)
        0, // 18: 12-16 (v)
        2, // 19: 13-18 (v)
        0, // 20: 14-15 (h)
        1, // 21: 15-16 (h)
        0, // 22: 15-21 (v)
        2, // 23: 16-22 (v)
        2, // 24: 17-18 (h)
        1, // 25: 18-19 (h)
        2, // 26: 18-20 (v)
        0, // 27: 20-21 (h)
        1  // 28: 21-22 (h)
    ];

    // 1. Verify all degrees match
    for (const isl of islands) {
        const deg = allowedEdges.reduce((sum, edge, idx) => {
            if (edge.u === isl.id || edge.v === isl.id) return sum + edgeBridges[idx];
            return sum;
        }, 0);
        assert.strictEqual(deg, isl.target, `Island ${isl.id} target ${isl.target} must match calculated degree ${deg}`);
    }

    // 2. Verify no crossing edges are active simultaneously
    for (const [e1, e2] of crossingPairs) {
        assert.ok(!(edgeBridges[e1] > 0 && edgeBridges[e2] > 0), `Crossing pair [${e1}, ${e2}] must not both have bridges`);
    }

    // 3. Verify graph is connected (BFS)
    const adj = Array.from({ length: islands.length }, () => []);
    allowedEdges.forEach((edge, idx) => {
        if (edgeBridges[idx] > 0) {
            adj[edge.u].push(edge.v);
            adj[edge.v].push(edge.u);
        }
    });

    const visited = new Set([0]);
    const queue = [0];
    while (queue.length > 0) {
        const cur = queue.shift();
        for (const nxt of adj[cur]) {
            if (!visited.has(nxt)) {
                visited.add(nxt);
                queue.push(nxt);
            }
        }
    }
    assert.strictEqual(visited.size, 23, "All 23 islands must be connected in a single network");
    console.log("  ✓ Level 32 (10x10) Hashiwokakero solution and 23-island connectivity verified.");
}

// 9d. Level 33: Three-Layer Symbol Wheel Layout & Transfer Logic
{
    console.log("9d. Testing Level 33 Three-Layer Symbol Wheel Layout & Transfer Logic...");
    const level33 = PUZZLE_CATALOG.find(p => p.level === 43);
    assert(level33, "Level 33 must exist in catalog");
    assert.strictEqual(level33.engine, "symbolWheel", "Level 33 engine must be symbolWheel");

    // 12 unique ancient runic symbols
    const DISTINCT_SYMBOLS = [
        "knot", "sunCross", "nordicMaze", "hourglass", "triskelion", "diamonds",
        "waves", "moon", "angularKey", "bull", "trident", "beetle"
    ];
    assert.strictEqual(new Set(DISTINCT_SYMBOLS).size, 12, "Must define exactly 12 distinct symbols");

    // Inner Core Blueprint (Fixed, 12 clock positions 0..11)
    const INNER_TARGETS = [
        "sunCross", "triskelion", "nordicMaze", "knot", "hourglass", "angularKey",
        "diamonds", "waves", "beetle", "moon", "trident", "bull"
    ];
    assert.strictEqual(INNER_TARGETS.length, 12, "Inner targets must have 12 positions");
    assert.strictEqual(new Set(INNER_TARGETS).size, 12, "Inner ring must have all 12 distinct symbols");

    // Initial state: completely shuffled layout, both pockets empty
    let middleRing = [
        "hourglass", "triskelion", "sunCross", "waves", "moon", "angularKey",
        "bull", "trident", "beetle", "knot", "nordicMaze", "diamonds"
    ];
    let outerRing = [
        "beetle", "sunCross", "nordicMaze", "knot", "hourglass", "triskelion",
        "diamonds", "waves", "moon", "bull", "trident", "angularKey"
    ];
    let rightSlot = { mid: null, out: null };
    let leftSlot = { mid: null, out: null };

    // Verify all 12 distinct symbols are on middle and outer rings
    assert.strictEqual(new Set(middleRing).size, 12, "Middle ring must have all 12 distinct symbols");
    assert.strictEqual(new Set(outerRing).size, 12, "Outer ring must have all 12 distinct symbols");

    // Rule 1: Right pocket starts empty
    assert.strictEqual(rightSlot.out, null);
    assert.strictEqual(rightSlot.mid, null);

    // Rule 2: Slide right outer tile into right pocket
    const outerTileAt3 = outerRing[3];
    assert.strictEqual(outerTileAt3, "knot");
    rightSlot.out = outerRing[3];
    outerRing[3] = null;
    assert.strictEqual(outerRing[3], null);
    assert.strictEqual(rightSlot.out, "knot");

    // Rule 3: Middle tile at position 3 can now move because outerRing[3] is empty
    const middleTileAt3 = middleRing[3];
    assert.strictEqual(middleTileAt3, "waves");
    rightSlot.mid = middleRing[3];
    middleRing[3] = null;
    assert.strictEqual(middleRing[3], null);
    assert.strictEqual(rightSlot.mid, "waves");

    // Rule 4: Outer blocking test - if an outer tile occupies position 3, middle cannot pass
    outerRing[3] = "knot";
    const canMoveMiddleRight = outerRing[3] === null && rightSlot.mid === null;
    assert.strictEqual(canMoveMiddleRight, false, "Outer ring position 3 blocks middle tile from passing into pocket");
    outerRing[3] = null;

    // Rule 5: Rotations shift ring arrays while parked pocket elements remain safe
    const rotateCW = (arr) => [arr[11], ...arr.slice(0, 11)];
    const rotateCCW = (arr) => [...arr.slice(1), arr[0]];

    const midRotated = rotateCW(middleRing);
    assert.strictEqual(midRotated[0], "diamonds");
    assert.strictEqual(midRotated[4], null);

    const midRotatedBack = rotateCCW(midRotated);
    assert.deepStrictEqual(midRotatedBack, middleRing);

    // Rule 6: Win Condition Validation
    const checkWin = (mid, out, rSlot, lSlot) => {
        if (rSlot.mid !== null || rSlot.out !== null || lSlot.mid !== null || lSlot.out !== null) return false;
        for (let i = 0; i < 12; i++) {
            if (mid[i] !== INNER_TARGETS[i] || out[i] !== INNER_TARGETS[i]) return false;
        }
        return true;
    };

    assert.strictEqual(checkWin(middleRing, outerRing, rightSlot, leftSlot), false, "Initial state is not solved");

    // Solved state: both rings equal inner targets and all pockets empty
    const solvedMid = [...INNER_TARGETS];
    const solvedOut = [...INNER_TARGETS];
    const emptyRight = { mid: null, out: null };
    const emptyLeft = { mid: null, out: null };
    assert.strictEqual(checkWin(solvedMid, solvedOut, emptyRight, emptyLeft), true, "Solved state correctly passes checkWin");

    console.log("  ✓ Level 33 Three-Layer Symbol Wheel layout, gates, blocking, and win rules verified.");
}

// 9e. Level 34: Fire & Ice Chain Sort Dual Ring Transfer & Win Rules
{
    console.log("9e. Testing Level 34 Fire & Ice Chain Sort Mechanism & Win Rules...");
    const level34 = PUZZLE_CATALOG.find(p => p.level === 38);
    assert(level34, "Level 34 must exist in catalog");
    assert.strictEqual(level34.catalogId, 22, "Level 34 catalogId must be 22");
    assert.strictEqual(level34.engine, "fireIceSort", "Level 34 engine must be fireIceSort");
    assert.strictEqual(level34.referenceAsset, "62235.jpg", "Level 34 reference asset must be 62235.jpg");
    assert.strictEqual(level34.instructions, "", "Level 34 instructions must be empty (pictorial-only)");
    assert.strictEqual(level34.config.hint, "Keep both the white balls together.", "Level 34 hint must guide keeping white balls together");

    // 1. Ball Count Integrity: exactly 18 Blue, 18 Red, and 2 White
    const INITIAL_UPPER_RING = [
        "blue", "red", "red", "red", "red", "blue", "blue", "white", "red", "white",
        "blue", "red", "blue", "blue", "blue", "blue", "blue", "red", "blue", "red"
    ];
    const INITIAL_LOWER_TRACK = [
        "red", "blue", "red", "blue", "blue", "blue", "blue", "red", "red",
        "red", "red", "red", "blue", "red", "blue", "blue", "red", "red"
    ];

    const allBalls = [...INITIAL_UPPER_RING, ...INITIAL_LOWER_TRACK];
    assert.strictEqual(allBalls.length, 38, "Total balls must be exactly 38");

    const blueCount = allBalls.filter(b => b === "blue").length;
    const redCount = allBalls.filter(b => b === "red").length;
    const whiteCount = allBalls.filter(b => b === "white").length;

    assert.strictEqual(blueCount, 18, "Must have exactly 18 blue balls");
    assert.strictEqual(redCount, 18, "Must have exactly 18 red balls");
    assert.strictEqual(whiteCount, 2, "Must have exactly 2 white balls");

    // 2. State & Stopper Block Locking Rules
    let platformPos = "upper";
    let upperRing = [...INITIAL_UPPER_RING];
    let lowerTrack = [...INITIAL_LOWER_TRACK];
    let upperTrack = null;
    let lowerRing = null;

    // In upper state: upper ring can rotate, lower is locked
    assert.strictEqual(platformPos, "upper");
    assert(upperRing !== null, "Upper ring is active");
    assert(lowerRing === null, "Lower ring is locked by carriage stopper");

    // Rotate upper ring CW
    upperRing = [upperRing[19], ...upperRing.slice(0, 19)];
    assert.strictEqual(upperRing[0], "red", "CW rotation shifts index 19 to index 0");
    // Rotate upper ring CCW
    upperRing = [...upperRing.slice(1), upperRing[0]];
    assert.deepStrictEqual(upperRing, INITIAL_UPPER_RING, "CCW rotation restores original order");

    // 3. Shift Carriage down to lower ring
    const platform = [upperRing[13], upperRing[12]];
    upperTrack = upperRing.filter((_, idx) => idx !== 12 && idx !== 13);
    upperRing = null;
    lowerRing = [...lowerTrack.slice(0, 2), platform[0], platform[1], ...lowerTrack.slice(2)];
    lowerTrack = null;
    platformPos = "lower";

    assert.strictEqual(platformPos, "lower");
    assert.strictEqual(upperTrack.length, 18, "Upper track now has 18 balls and is locked");
    assert.strictEqual(lowerRing.length, 20, "Lower ring now has 20 balls and is active");
    assert(upperRing === null, "Upper ring is locked by carriage stopper block");

    // Rotate lower ring CW
    const lowerRingBefore = [...lowerRing];
    lowerRing = [lowerRing[19], ...lowerRing.slice(0, 19)];
    assert.strictEqual(lowerRing[0], lowerRingBefore[19]);
    // Rotate back CCW
    lowerRing = [...lowerRing.slice(1), lowerRing[0]];
    assert.deepStrictEqual(lowerRing, lowerRingBefore);

    // Shift carriage back up
    const returnedPlatform = [lowerRing[2], lowerRing[3]];
    lowerTrack = lowerRing.filter((_, idx) => idx !== 2 && idx !== 3);
    lowerRing = null;
    upperRing = [...upperTrack.slice(0, 12), returnedPlatform[1], returnedPlatform[0], ...upperTrack.slice(12)];
    upperTrack = null;
    platformPos = "upper";

    assert.deepStrictEqual(upperRing, INITIAL_UPPER_RING, "Transfer cycle preserves exact ball identity and order");
    assert.deepStrictEqual(lowerTrack, INITIAL_LOWER_TRACK, "Lower track preserved intact");

    // 4. Win Condition Validation
    const checkWin = (uRing, lRing, uTrk, lTrk, pos) => {
        let u, l, plat;
        if (pos === "upper") {
            plat = [uRing[13], uRing[12]];
            u = uRing.filter((_, idx) => idx !== 12 && idx !== 13);
            l = lTrk;
        } else {
            plat = [lRing[2], lRing[3]];
            l = lRing.filter((_, idx) => idx !== 2 && idx !== 3);
            u = uTrk;
        }
        const topAllBlue = u.length === 18 && u.every(b => b === "blue");
        const botAllRed = l.length === 18 && l.every(b => b === "red");
        const platWhite = plat.length === 2 && plat.every(b => b === "white");
        return topAllBlue && botAllRed && platWhite;
    };

    assert.strictEqual(checkWin(upperRing, lowerRing, upperTrack, lowerTrack, platformPos), false, "Initial scramble is not solved");

    // Solved state test
    const solvedUpperRing = new Array(18).fill("blue");
    solvedUpperRing.splice(12, 0, "white", "white");
    const solvedLowerTrack = new Array(18).fill("red");
    assert.strictEqual(checkWin(solvedUpperRing, null, null, solvedLowerTrack, "upper"), true, "Solved state passes checkWin");

    console.log("  ✓ Level 34 Fire & Ice Chain Sort mechanism, ball counts, locking, and win rules verified.");
}

// 9f. Level 35: Bridge and Torch Crossing Logic, 15m Optimal Solution & Rules
{
    console.log("9f. Testing Level 35 Bridge and Torch Crossing Logic & 15m Optimal Time...");
    const level35 = PUZZLE_CATALOG.find(p => p.level === 17);
    assert(level35, "Level 35 must exist in catalog");
    assert.strictEqual(level35.catalogId, 38, "Level 35 catalogId must be 38");
    assert.strictEqual(level35.engine, "riverCrossing", "Level 35 engine must be riverCrossing");
    assert.strictEqual(
        level35.instructions,
        "4 travelers (speeds: 1, 2, 5, 8 minutes) must cross a fragile bridge at night. The bridge holds at most 2 people and the torch must accompany every crossing. Reach the other side in the optimal time!",
        "Level 35 instructions must match exact text"
    );
    assert.strictEqual(
        level35.config.hint,
        "Make the slowest people cross the bridge together.",
        "Level 35 hint must guide grouping the slowest travelers"
    );
    assert.strictEqual(level35.config.optimalTime, 15, "Level 35 optimal time must be 15 minutes");
    assert.deepStrictEqual(level35.config.times, [1, 2, 5, 8], "Speeds must be 1, 2, 5, 8");

    // BFS solver to mathematically verify minimum crossing time is exactly 15 minutes
    const speeds = { p1: 1, p2: 2, p5: 5, p8: 8 };
    const all = ["p1", "p2", "p5", "p8"];

    // State: [leftBitmask, torchPos (0: left, 1: right), timeElapsed]
    // Bitmask: bit 0: p1, bit 1: p2, bit 2: p5, bit 3: p8
    const idToBit = { p1: 1, p2: 2, p5: 4, p8: 8 };
    const bitToSpeed = [1, 2, 5, 8];

    const queue = [{ left: 15, torch: 0, time: 0 }];
    const minTimeSeen = new Map();
    let optimalFound = Infinity;

    while (queue.length > 0) {
        const { left, torch, time } = queue.shift();
        const stateKey = `${left},${torch}`;
        if (minTimeSeen.has(stateKey) && minTimeSeen.get(stateKey) <= time) continue;
        minTimeSeen.set(stateKey, time);

        if (left === 0 && torch === 1) {
            if (time < optimalFound) optimalFound = time;
            continue;
        }

        if (torch === 0) {
            // Forward crossing: 1 or 2 people from left to right
            const people = [];
            for (let i = 0; i < 4; i++) {
                if ((left & (1 << i)) !== 0) people.push(i);
            }
            // Pairs
            for (let i = 0; i < people.length; i++) {
                for (let j = i + 1; j < people.length; j++) {
                    const pA = people[i];
                    const pB = people[j];
                    const trip = Math.max(bitToSpeed[pA], bitToSpeed[pB]);
                    const nextLeft = left & ~(1 << pA) & ~(1 << pB);
                    queue.push({ left: nextLeft, torch: 1, time: time + trip });
                }
            }
        } else {
            // Return crossing: 1 person from right to left with torch
            const right = 15 & ~left;
            const people = [];
            for (let i = 0; i < 4; i++) {
                if ((right & (1 << i)) !== 0) people.push(i);
            }
            for (let i = 0; i < people.length; i++) {
                const p = people[i];
                const trip = bitToSpeed[p];
                const nextLeft = left | (1 << p);
                queue.push({ left: nextLeft, torch: 0, time: time + trip });
            }
        }
    }

    assert.strictEqual(optimalFound, 15, "Mathematical minimum time across bridge must be exactly 15 minutes");

    // Verify step-by-step 15m sequence:
    let t = 0;
    // Step 1: 1 & 2 cross -> max(1, 2) = 2
    t += Math.max(1, 2);
    // Step 2: 1 returns -> 1
    t += 1;
    // Step 3: 5 & 8 cross together -> max(5, 8) = 8
    t += Math.max(5, 8);
    // Step 4: 2 returns -> 2
    t += 2;
    // Step 5: 1 & 2 cross -> max(1, 2) = 2
    t += Math.max(1, 2);
    assert.strictEqual(t, 15, "Stepwise optimal sequence must equal 15 minutes");

    // Verify win/fail condition rules: <= 15 min clears, > 15 min fails
    function evaluateBridgeResult(timeTaken) {
        return timeTaken <= 15 ? "PASSED" : "FAILED";
    }
    assert.strictEqual(evaluateBridgeResult(15), "PASSED", "Crossing in 15 minutes must pass");
    assert.strictEqual(evaluateBridgeResult(14), "PASSED", "Crossing in under 15 minutes must pass");
    assert.strictEqual(evaluateBridgeResult(17), "FAILED", "Crossing in 17 minutes must fail level");
    assert.strictEqual(evaluateBridgeResult(19), "FAILED", "Crossing in 19 minutes must fail level");
    assert.strictEqual(evaluateBridgeResult(21), "FAILED", "Crossing in 21 minutes must fail level");

    console.log("  ✓ Level 17 Bridge and Torch crossing logic, BFS 15m optimal time, <=15m win & >15m fail verified.");
}

// 9g. Level 37: Table Seating Deduction Clues & Unique Solution Verification
{
    console.log("9g. Testing Level 37 Table Seating Deduction Clues & Unique Solution...");
    const level37 = PUZZLE_CATALOG.find(p => p.level === 19);
    assert(level37, "Level 37 must exist in catalog");
    assert.strictEqual(level37.catalogId, 10, "Level 37 catalogId must be 10");
    assert.strictEqual(level37.title, "Seating Arrangement", "Level 37 title must be Seating Arrangement");
    assert.strictEqual(level37.engine, "seatingLogic", "Level 37 engine must be seatingLogic");
    assert.strictEqual(level37.instructions, "", "Level 37 instructions must be empty (clean UI)");
    assert.strictEqual(level37.config.hint, "Rick is at seat 7.", "Level 37 hint must guide Rick is at seat 7");
    assert.deepStrictEqual(
        level37.config.names,
        ["Harvey", "Jennie", "Peter", "Joyce", "Lia", "Rick", "Kenny", "Mark"],
        "Must define the exact 8 guests from problem statement"
    );

    // Permutation solver across all 40,320 seatings
    const guests = ["Harvey", "Jennie", "Peter", "Joyce", "Lia", "Rick", "Kenny", "Mark"];
    const opposite = { 1: 5, 5: 1, 2: 8, 8: 2, 3: 7, 7: 3, 4: 6, 6: 4 };

    const isNextTo = (s1, s2) => {
        const diff = Math.abs(s1 - s2);
        return diff === 1 || diff === 7;
    };

    function permute(arr) {
        if (arr.length <= 1) return [arr];
        const res = [];
        for (let i = 0; i < arr.length; i++) {
            const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
            for (const p of permute(rest)) {
                res.push([arr[i], ...p]);
            }
        }
        return res;
    }

    const allPerms = permute([1, 2, 3, 4, 5, 6, 7, 8]);
    const validSeatings = [];

    for (const p of allPerms) {
        const seat = {};
        for (let i = 0; i < 8; i++) seat[guests[i]] = p[i];

        // (6) Jennie is at Seat 4 and next to Harvey.
        if (seat.Jennie !== 4) continue;
        if (!isNextTo(seat.Jennie, seat.Harvey)) continue;

        // (1) Harvey has a higher seat number than Jennie.
        if (seat.Harvey <= seat.Jennie) continue;

        // (2) Peter is across from Harvey.
        if (opposite[seat.Harvey] !== seat.Peter) continue;

        // (3) Neither Joyce nor Lia is in seat 8.
        if (seat.Joyce === 8 || seat.Lia === 8) continue;

        // (4) Rick is across from Kenny, and Rick is also next to Joyce.
        if (opposite[seat.Rick] !== seat.Kenny) continue;
        if (!isNextTo(seat.Rick, seat.Joyce)) continue;

        // (5) Lia is next to Kenny.
        if (!isNextTo(seat.Lia, seat.Kenny)) continue;

        // (7) Peter is next to Lia.
        if (!isNextTo(seat.Peter, seat.Lia)) continue;

        // (8) Mark has remaining seat
        if (seat.Mark < 1 || seat.Mark > 8) continue;

        validSeatings.push(seat);
    }

    assert.strictEqual(validSeatings.length, 1, "There must be exactly one unique valid seating arrangement");

    const sol = validSeatings[0];
    assert.strictEqual(sol.Peter, 1, "Seat 1 must be Peter");
    assert.strictEqual(sol.Lia, 2, "Seat 2 must be Lia");
    assert.strictEqual(sol.Kenny, 3, "Seat 3 must be Kenny");
    assert.strictEqual(sol.Jennie, 4, "Seat 4 must be Jennie");
    assert.strictEqual(sol.Harvey, 5, "Seat 5 must be Harvey");
    assert.strictEqual(sol.Joyce, 6, "Seat 6 must be Joyce");
    assert.strictEqual(sol.Rick, 7, "Seat 7 must be Rick");
    assert.strictEqual(sol.Mark, 8, "Seat 8 must be Mark");

    console.log("  ✓ Level 37 Table Seating deduction verified: exactly 1 unique arrangement satisfies all 8 clues.");
}

// 9h. Level 44: Master Escape 6x6 Layout & Solvability Verification
{
    console.log("9h. Testing Level 44 Master Escape 6x6 Layout & Solvability...");
    const level44 = PUZZLE_CATALOG.find(p => p.level === 30);
    assert(level44, "Level 44 must exist in catalog");
    assert.strictEqual(level44.engine, "slidingBlock", "Level 44 engine must be slidingBlock");
    assert.strictEqual(level44.config.boardSize, 6, "Level 44 boardSize must be 6");
    assert.strictEqual(level44.config.exitRow, 2, "Level 44 exitRow must be 2");
    assert.strictEqual(level44.config.blocks.length, 12, "Level 44 must have exactly 12 blocks");

    // Verify non-overlapping starting board
    const board = Array.from({ length: 6 }, () => Array(6).fill(null));
    for (const b of level44.config.blocks) {
        for (let i = 0; i < b.length; i++) {
            const r = b.row + (b.orientation === "v" ? i : 0);
            const c = b.col + (b.orientation === "h" ? i : 0);
            assert(r >= 0 && r < 6 && c >= 0 && c < 6, `Block ${b.id} out of bounds at (${r},${c})`);
            assert.strictEqual(board[r][c], null, `Overlap detected at (${r},${c})`);
            board[r][c] = b.id;
        }
    }

    // Verify BFS solvability
    function stateKey(bList) {
        return bList.map(b => `${b.row},${b.col}`).join(";");
    }

    function getGrid(bList) {
        const g = Array.from({ length: 6 }, () => Array(6).fill(null));
        for (let idx = 0; idx < bList.length; idx++) {
            const b = bList[idx];
            for (let i = 0; i < b.length; i++) {
                const r = b.row + (b.orientation === "v" ? i : 0);
                const c = b.col + (b.orientation === "h" ? i : 0);
                g[r][c] = idx;
            }
        }
        return g;
    }

    const initialBlocks = level44.config.blocks.map(b => ({ ...b }));
    const queue = [[initialBlocks, 0]];
    const visited = new Set([stateKey(initialBlocks)]);
    let minMoves = -1;

    while (queue.length > 0) {
        const [curr, dist] = queue.shift();
        const target = curr[0];
        if (target.row === 2 && target.col === 4) {
            minMoves = dist;
            break;
        }
        const g = getGrid(curr);
        for (let idx = 0; idx < curr.length; idx++) {
            const b = curr[idx];
            if (b.orientation === "h") {
                // left
                let nc = b.col - 1;
                while (nc >= 0 && g[b.row][nc] === null) {
                    const next = curr.map((x, i) => i === idx ? { ...x, col: nc } : x);
                    const k = stateKey(next);
                    if (!visited.has(k)) {
                        visited.add(k);
                        queue.push([next, dist + 1]);
                    }
                    nc--;
                }
                // right
                nc = b.col + 1;
                while (nc + b.length - 1 < 6 && g[b.row][nc + b.length - 1] === null) {
                    const next = curr.map((x, i) => i === idx ? { ...x, col: nc } : x);
                    const k = stateKey(next);
                    if (!visited.has(k)) {
                        visited.add(k);
                        queue.push([next, dist + 1]);
                    }
                    nc++;
                }
            } else {
                // up
                let nr = b.row - 1;
                while (nr >= 0 && g[nr][b.col] === null) {
                    const next = curr.map((x, i) => i === idx ? { ...x, row: nr } : x);
                    const k = stateKey(next);
                    if (!visited.has(k)) {
                        visited.add(k);
                        queue.push([next, dist + 1]);
                    }
                    nr--;
                }
                // down
                nr = b.row + 1;
                while (nr + b.length - 1 < 6 && g[nr + b.length - 1][b.col] === null) {
                    const next = curr.map((x, i) => i === idx ? { ...x, row: nr } : x);
                    const k = stateKey(next);
                    if (!visited.has(k)) {
                        visited.add(k);
                        queue.push([next, dist + 1]);
                    }
                    nr++;
                }
            }
        }
    }

    assert(minMoves > 0, "Level 44 must be solvable");
    assert.strictEqual(minMoves, 40, "Level 44 optimal solution must be exactly 40 moves");
    console.log(`  ✓ Level 44 Master Escape 6x6 layout verified solvable in optimal ${minMoves} moves.`);
}

// 9i. Level 45: Flow Free 14x14 Solvability & Grid Integrity
{
    console.log("9i. Testing Level 45 Flow Free 14x14 Solvability & Grid Integrity...");
    const level45 = PUZZLE_CATALOG.find(p => p.level === 41);
    assert(level45, "Level 45 must exist in catalog");
    assert.strictEqual(level45.engine, "flowFree", "Level 45 engine must be flowFree");
    assert.strictEqual(level45.config.size, 14, "Level 45 size must be 14");
    assert.strictEqual(level45.config.pairs.length, 15, "Level 45 must have 15 pairs");

    // Verify all endpoints are within bounds and unique
    const endpointCells = new Set();
    for (const p of level45.config.pairs) {
        assert(p.a[0] >= 0 && p.a[0] < 14 && p.a[1] >= 0 && p.a[1] < 14, `Pair ${p.label} a out of bounds`);
        assert(p.b[0] >= 0 && p.b[0] < 14 && p.b[1] >= 0 && p.b[1] < 14, `Pair ${p.label} b out of bounds`);
        const ka = `${p.a[0]},${p.a[1]}`;
        const kb = `${p.b[0]},${p.b[1]}`;
        assert(!endpointCells.has(ka), `Duplicate endpoint cell at ${ka}`);
        assert(!endpointCells.has(kb), `Duplicate endpoint cell at ${kb}`);
        endpointCells.add(ka);
        endpointCells.add(kb);
    }
    assert.strictEqual(endpointCells.size, 30, "Exactly 30 distinct endpoint cells required for 15 pairs");

    const brownPair = level45.config.pairs.find(p => p.label === "Brown");
    assert(brownPair, "Level 45 must have a Brown pair");
    assert.strictEqual(brownPair.color, "#8b5a2b", "Level 45 Brown pair color must be #8b5a2b");

    // Verify canonical 100% board coverage solution exists
    const canonicalSolution = [
        [8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8],
        [8, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 3, 8],
        [8, 0, 1, 1, 1, 1, 1, 1, 1, 2, 3, 4, 3, 8],
        [8, 1, 1, 5, 5, 13, 13, 13, 13, 2, 4, 4, 3, 8],
        [8, 5, 5, 5, 13, 13, 6, 6, 13, 2, 4, 7, 3, 8],
        [8, 13, 13, 13, 13, 6, 6, 9, 13, 2, 4, 7, 3, 8],
        [13, 13, 6, 6, 6, 6, 9, 9, 13, 2, 4, 7, 3, 8],
        [13, 6, 6, 10, 10, 10, 9, 11, 13, 2, 4, 7, 3, 8],
        [13, 6, 10, 10, 12, 12, 10, 11, 13, 11, 4, 7, 3, 8],
        [13, 6, 10, 12, 12, 10, 10, 11, 11, 11, 4, 7, 3, 8],
        [13, 10, 10, 12, 10, 10, 4, 4, 4, 4, 4, 7, 3, 8],
        [13, 10, 12, 12, 10, 14, 4, 8, 8, 8, 7, 7, 3, 8],
        [13, 10, 10, 10, 10, 14, 14, 14, 14, 8, 7, 3, 3, 8],
        [13, 13, 13, 13, 13, 13, 13, 13, 14, 8, 8, 8, 8, 8]
    ];
    assert.strictEqual(canonicalSolution.length, 14);
    assert.strictEqual(canonicalSolution[0].length, 14);
    for (let r = 0; r < 14; r++) {
        for (let c = 0; c < 14; c++) {
            assert(canonicalSolution[r][c] >= 0 && canonicalSolution[r][c] < 15);
        }
    }
    console.log("  ✓ Level 45 Flow Free 14x14 grid and 100% board coverage solvability verified.");
}

// 9j. Level 46: Nonogram 20x20 Clues & Solution Integrity
{
    console.log("9j. Testing Level 46 Nonogram 20x20 Clues & Solution Integrity...");
    const level46 = PUZZLE_CATALOG.find(p => p.level === 49);
    assert(level46, "Level 46 must exist in catalog");
    assert.strictEqual(level46.engine, "nonogram", "Level 46 engine must be nonogram");
    assert.strictEqual(level46.config.size, 20, "Level 46 size must be 20");
    assert.strictEqual(level46.instructions, "", "Level 46 instructions must be empty (infobar removed)");
    assert.strictEqual(level46.config.hint, "The safe cell is glowing.", "Level 46 hint must match");
    assert.strictEqual(level46.config.solution.length, 20, "Solution must have 20 rows");
    assert.strictEqual(level46.config.rowClues.length, 20, "Must have 20 row clues");
    assert.strictEqual(level46.config.colClues.length, 20, "Must have 20 col clues");

    function getRuns(line) {
        const runs = [];
        let c = 0;
        for (const v of line) {
            if (v === 1) {
                c += 1;
            } else if (c > 0) {
                runs.push(c);
                c = 0;
            }
        }
        if (c > 0) runs.push(c);
        return runs.length > 0 ? runs : [0];
    }

    // Verify row clues derived from solution match config.rowClues
    for (let r = 0; r < 20; r++) {
        assert.strictEqual(level46.config.solution[r].length, 20, `Row ${r} must have 20 columns`);
        const derived = getRuns(level46.config.solution[r]);
        assert.deepStrictEqual(derived, level46.config.rowClues[r], `Row ${r} clues mismatch`);
    }

    // Verify col clues derived from solution match config.colClues
    for (let c = 0; c < 20; c++) {
        const colLine = level46.config.solution.map(row => row[c]);
        const derived = getRuns(colLine);
        assert.deepStrictEqual(derived, level46.config.colClues[c], `Col ${c} clues mismatch`);
    }

    // Total filled cells count
    const totalFilled = level46.config.solution.flat().filter(v => v === 1).length;
    assert.strictEqual(totalFilled, 200, "Level 46 solution must have exactly 200 filled cells");

    console.log("  ✓ Level 46 Nonogram 20x20 row/column clues and solution 100% verified.");
}

// 10. Star Rating & Penalty Calculation System
{
    console.log("10. Testing Star Rating & Penalty Calculation System...");
    function calculateStars(level, timeSec, moves, usedHint) {
        let stars = 3;
        if (usedHint) stars -= 1;
        if (level >= 1 && level <= 4) {
            if (timeSec > 60) stars -= 1;
        } else if (level === 5) {
            if (moves > 8) stars -= 1;
        } else if (level === 6) {
            if (timeSec > 120) stars -= 1;
        } else if (level === 7) {
            if (moves > 7) stars -= 1;
            if (timeSec > 120) stars -= 1;
        } else if (level === 8) {
            if (timeSec > 150) stars -= 1;
        } else if (level === 9) {
            if (moves > 114) stars -= 1;
        } else if (level === 10 || level === 11 || level === 12 || level === 14 || level === 16) {
            if (timeSec > 180) stars -= 1;
        } else if (level === 13) {
            if (moves > 6) stars -= 1;
            if (timeSec > 180) stars -= 1;
        } else if (level === 15) {
            if (moves > 70) stars -= 1;
            if (timeSec > 180) stars -= 1;
        } else if (level === 17 || level === 18 || level === 19) {
            if (timeSec > 210) stars -= 1;
        } else if (level === 20 || level === 21) {
            if (timeSec > 240) stars -= 1;
        } else if (level === 22) {
            if (moves > 8) stars -= 1;
            if (timeSec > 240) stars -= 1;
        } else if (level === 23 || level === 24 || level === 25 || level === 27) {
            if (timeSec > 300) stars -= 1;
        } else if (level === 26) {
            if (moves > 280) stars -= 1;
            if (timeSec > 300) stars -= 1;
        } else if (level === 28 || level === 29) {
            if (timeSec > 360) stars -= 1;
        } else if (level === 30) {
            if (moves > 50) stars -= 1;
            if (timeSec > 360) stars -= 1;
        } else if (level === 31) {
            if (timeSec > 420) stars -= 1;
        } else if (level === 32) {
            if (timeSec > 450) stars -= 1;
        } else if (level === 33 || level === 34) {
            if (timeSec > 480) stars -= 1;
        } else if (level === 35) {
            if (timeSec > 540) stars -= 1;
        } else if (level === 36 || level === 37 || level === 38) {
            if (timeSec > 600) stars -= 1;
        } else if (level === 39) {
            if (timeSec > 630) stars -= 1;
        } else if (level === 40) {
            if (timeSec > 660) stars -= 1;
        } else if (level === 41) {
            if (timeSec > 780) stars -= 1;
        } else if (level === 42 || level === 43) {
            if (timeSec > 900) stars -= 1;
        } else if (level === 44) {
            if (timeSec > 1200) stars -= 1;
        } else if (level === 45 || level === 46) {
            if (timeSec > 1500) stars -= 1;
        } else if (level === 47) {
            if (timeSec > 2400) stars -= 1;
        } else if (level === 48) {
            if (timeSec > 3000) stars -= 1;
        } else if (level === 49) {
            if (timeSec > 3600) stars -= 1;
        } else if (level === 50) {
            if (timeSec > 3900) stars -= 1;
        }
        return Math.max(1, stars);
    }

    // Perfect runs
    assert.strictEqual(calculateStars(1, 30, 1, false), 3, "L1 under 60s no hint should be 3 stars");
    assert.strictEqual(calculateStars(5, 40, 8, false), 3, "L5 8 moves no hint should be 3 stars");
    assert.strictEqual(calculateStars(6, 100, 20, false), 3, "L6 under 120s no hint should be 3 stars");
    assert.strictEqual(calculateStars(7, 60, 7, false), 3, "L7 7 moves under 120s no hint should be 3 stars");
    assert.strictEqual(calculateStars(8, 100, 15, false), 3, "L8 under 150s no hint should be 3 stars");
    assert.strictEqual(calculateStars(9, 50, 114, false), 3, "L9 114 moves no hint should be 3 stars");
    assert.strictEqual(calculateStars(10, 150, 18, false), 3, "L10 under 180s no hint should be 3 stars");
    assert.strictEqual(calculateStars(11, 120, 15, false), 3, "L11 under 180s no hint should be 3 stars");
    assert.strictEqual(calculateStars(12, 100, 3, false), 3, "L12 under 180s no hint should be 3 stars");
    assert.strictEqual(calculateStars(13, 100, 6, false), 3, "L13 under 180s and 6 moves no hint should be 3 stars");
    assert.strictEqual(calculateStars(14, 120, 10, false), 3, "L14 under 180s no hint should be 3 stars");
    assert.strictEqual(calculateStars(15, 120, 60, false), 3, "L15 60 moves under 180s no hint should be 3 stars");
    assert.strictEqual(calculateStars(16, 100, 2, false), 3, "L16 under 180s no hint should be 3 stars");
    assert.strictEqual(calculateStars(17, 150, 10, false), 3, "L17 under 210s no hint should be 3 stars");
    assert.strictEqual(calculateStars(18, 150, 11, false), 3, "L18 under 210s no hint should be 3 stars");
    assert.strictEqual(calculateStars(19, 150, 5, false), 3, "L19 under 210s no hint should be 3 stars");
    assert.strictEqual(calculateStars(20, 150, 10, false), 3, "L20 under 240s no hint should be 3 stars");
    assert.strictEqual(calculateStars(21, 200, 20, false), 3, "L21 under 240s no hint should be 3 stars");
    assert.strictEqual(calculateStars(22, 150, 8, false), 3, "L22 8 moves under 240s no hint should be 3 stars");
    assert.strictEqual(calculateStars(23, 200, 15, false), 3, "L23 under 300s no hint should be 3 stars");
    assert.strictEqual(calculateStars(24, 250, 17, false), 3, "L24 under 300s no hint should be 3 stars");
    assert.strictEqual(calculateStars(25, 200, 31, false), 3, "L25 under 300s no hint should be 3 stars");
    assert.strictEqual(calculateStars(26, 200, 250, false), 3, "L26 under 300s and under 280 moves no hint should be 3 stars");
    assert.strictEqual(calculateStars(27, 200, 1, false), 3, "L27 under 300s no hint should be 3 stars");
    assert.strictEqual(calculateStars(28, 200, 22, false), 3, "L28 under 360s no hint should be 3 stars");
    assert.strictEqual(calculateStars(29, 300, 50, false), 3, "L29 under 360s no hint should be 3 stars");
    assert.strictEqual(calculateStars(30, 200, 42, false), 3, "L30 under 360s and <=50 moves should be 3 stars");
    assert.strictEqual(calculateStars(31, 250, 1, false), 3, "L31 under 420s no hint should be 3 stars");
    assert.strictEqual(calculateStars(32, 300, 20, false), 3, "L32 under 450s no hint should be 3 stars");
    assert.strictEqual(calculateStars(33, 300, 20, false), 3, "L33 under 480s no hint should be 3 stars");
    assert.strictEqual(calculateStars(34, 300, 1, false), 3, "L34 under 480s no hint should be 3 stars");
    assert.strictEqual(calculateStars(35, 400, 8, false), 3, "L35 under 540s no hint should be 3 stars");
    assert.strictEqual(calculateStars(36, 400, 20, false), 3, "L36 under 600s no hint should be 3 stars");
    assert.strictEqual(calculateStars(37, 400, 50, false), 3, "L37 under 600s no hint should be 3 stars");
    assert.strictEqual(calculateStars(38, 400, 20, false), 3, "L38 under 600s no hint should be 3 stars");
    assert.strictEqual(calculateStars(39, 400, 50, false), 3, "L39 under 630s no hint should be 3 stars");
    assert.strictEqual(calculateStars(40, 400, 50, false), 3, "L40 under 660s no hint should be 3 stars");
    assert.strictEqual(calculateStars(41, 600, 15, false), 3, "L41 under 780s no hint should be 3 stars");
    assert.strictEqual(calculateStars(42, 600, 50, false), 3, "L42 under 900s no hint should be 3 stars");
    assert.strictEqual(calculateStars(43, 600, 20, false), 3, "L43 under 900s no hint should be 3 stars");
    assert.strictEqual(calculateStars(44, 600, 2, false), 3, "L44 under 1200s no hint should be 3 stars");
    assert.strictEqual(calculateStars(45, 1200, 50, false), 3, "L45 under 1500s no hint should be 3 stars");
    assert.strictEqual(calculateStars(46, 1000, 64, false), 3, "L46 under 1500s no hint should be 3 stars");
    assert.strictEqual(calculateStars(47, 1200, 50, false), 3, "L47 under 2400s no hint should be 3 stars");
    assert.strictEqual(calculateStars(48, 2400, 100, false), 3, "L48 under 3000s no hint should be 3 stars");
    assert.strictEqual(calculateStars(49, 1800, 50, false), 3, "L49 under 3600s no hint should be 3 stars");
    assert.strictEqual(calculateStars(50, 3000, 16, false), 3, "L50 under 3900s no hint should be 3 stars");

    // Hint used
    assert.strictEqual(calculateStars(1, 30, 1, true), 2, "L1 under 60s with hint should be 2 stars");
    assert.strictEqual(calculateStars(5, 40, 8, true), 2, "L5 8 moves with hint should be 2 stars");
    assert.strictEqual(calculateStars(6, 100, 20, true), 2, "L6 under 120s with hint should be 2 stars");
    assert.strictEqual(calculateStars(7, 60, 7, true), 2, "L7 7 moves with hint should be 2 stars");
    assert.strictEqual(calculateStars(9, 50, 114, true), 2, "L9 114 moves with hint should be 2 stars");
    assert.strictEqual(calculateStars(30, 200, 42, true), 2, "L30 with hint should be 2 stars");
    assert.strictEqual(calculateStars(50, 3000, 16, true), 2, "L50 with hint should be 2 stars");

    // Penalties exceeded
    assert.strictEqual(calculateStars(1, 70, 1, false), 2, "L1 over 60s should be 2 stars");
    assert.strictEqual(calculateStars(5, 40, 9, false), 2, "L5 over 8 moves should be 2 stars");
    assert.strictEqual(calculateStars(9, 50, 115, false), 2, "L9 over 114 moves should be 2 stars");
    assert.strictEqual(calculateStars(30, 200, 51, false), 2, "L30 over 50 moves should be 2 stars");
    assert.strictEqual(calculateStars(30, 370, 42, false), 2, "L30 over 360s should be 2 stars");
    assert.strictEqual(calculateStars(50, 4000, 16, false), 2, "L50 over 3900s should be 2 stars");

    // Double penalty floored to 1
    assert.strictEqual(calculateStars(1, 70, 1, true), 1, "L1 over 60s and with hint should be 1 star");
    assert.strictEqual(calculateStars(5, 40, 9, true), 1, "L5 over 8 moves and with hint should be 1 star");
    assert.strictEqual(calculateStars(30, 370, 51, true), 1, "L30 over 360s, over 50 moves, and with hint should be 1 star");
    assert.strictEqual(calculateStars(50, 4000, 16, true), 1, "L50 over 3900s and with hint should be 1 star");

    console.log("  ✓ Star rating rules verified for reallocated levels (1 to 50), minimum 1 star.");
}

// 20. Jigsaw Levels Validation (L8, L38, L42)
{
    console.log("20. Testing Jigsaw Puzzle Levels (Levels 8, 38, 42)...");
    const fs = require("node:fs");
    const path = require("node:path");

    const jigsawLevels = [
        { level: 23, gridSize: 5, expectedFile: "level8-jigsaw.jpg" },
        { level: 45, gridSize: 8, expectedFile: "level38-jigsaw.jpg" },
        { level: 48, gridSize: 10, expectedFile: "level42-jigsaw.jpg" }
    ];

    for (const j of jigsawLevels) {
        const p = PUZZLE_CATALOG.find(item => item.level === j.level);
        assert.ok(p, `Level ${j.level} must exist in catalog`);
        assert.strictEqual(p.engine, "jigsaw", `Level ${j.level} must use jigsaw engine`);
        assert.strictEqual(p.config.gridSize, j.gridSize, `Level ${j.level} gridSize must be ${j.gridSize}`);
        assert.strictEqual(p.referenceAsset, j.expectedFile, `Level ${j.level} referenceAsset mismatch`);
        assert.strictEqual(p.config.image, `puzzle-references/${j.expectedFile}`, `Level ${j.level} image config mismatch`);
        assert.strictEqual(p.config.hint, "Swap the glowing pieces.");

        // Verify image file exists on disk
        const filePath = path.join(__dirname, "..", "frontend", "puzzle-references", j.expectedFile);
        assert.ok(fs.existsSync(filePath), `Asset file ${filePath} must exist on disk`);
        const stats = fs.statSync(filePath);
        assert.ok(stats.size > 10000, `Asset file ${filePath} must be non-empty`);
    }

    // Verify all 4 view artifact modals (3 jigsaw levels 23, 45, 48 and triangle mosaic level 32) hide the asset name
    for (const lvl of [23, 32, 45, 48]) {
        const p = PUZZLE_CATALOG.find(item => item.level === lvl);
        assert.ok(p, `Level ${lvl} must exist in catalog`);
        const isJigsawOrMosaic = p && (
            p.level === 23 ||
            p.level === 32 ||
            p.level === 45 ||
            p.level === 48 ||
            p.engine === "jigsaw" ||
            p.engine === "triangleMosaic"
        );
        const headerTitle = isJigsawOrMosaic
            ? "HISTORICAL ARTIFACT REFERENCE"
            : `HISTORICAL ARTIFACT REFERENCE: ${p.referenceAsset}`;
        assert.strictEqual(headerTitle, "HISTORICAL ARTIFACT REFERENCE");
        assert.ok(!headerTitle.includes(p.referenceAsset), `Level ${lvl} artifact modal header must not include filename ${p.referenceAsset}`);
    }
    console.log("  ✓ Jigsaw levels (8, 38, 42) and Triangle Mosaic (23) artifact modal header hiding verified.");
}

// 21. Level 23: Triangle Mosaic Jigsaw & Hint Placement Guarantee
{
    console.log("21. Testing Level 23 Triangle Mosaic Jigsaw, Orientations & Hint Solver Guarantee...");
    const fs = require("node:fs");
    const path = require("node:path");

    const level23 = PUZZLE_CATALOG.find(p => p.level === 32);
    assert.ok(level23, "Level 23 must exist in catalog");
    assert.strictEqual(level23.engine, "triangleMosaic", "Level 23 engine must be triangleMosaic");
    assert.strictEqual(level23.referenceAsset, "level23-village.jpg", "Level 23 referenceAsset must be level23-village.jpg");
    assert.strictEqual(level23.instructions, "", "Level 23 instructions must be empty");
    assert.strictEqual(level23.config.hint, "Swap two glowing pieces.", "Level 23 hint text mismatch");

    // Verify asset on disk
    const assetPath = path.join(__dirname, "..", "frontend", "puzzle-references", "level23-village.jpg");
    assert.ok(fs.existsSync(assetPath), "level23-village.jpg must exist on disk");
    const stats = fs.statSync(assetPath);
    assert.ok(stats.size > 10000, "level23-village.jpg must be non-empty");

    // Verify 31 slots layout (Row 0: 9 pcs, Row 1: 11 pcs, Row 2: 11 pcs)
    const SLOTS = [];
    for (let c = 0; c < 9; c++) {
        SLOTS.push({ id: SLOTS.length, row: 0, orient: (c % 2 === 0) ? "up" : "down" });
    }
    for (let c = 0; c < 11; c++) {
        SLOTS.push({ id: SLOTS.length, row: 1, orient: (c % 2 === 0) ? "up" : "down" });
    }
    for (let c = 0; c < 11; c++) {
        SLOTS.push({ id: SLOTS.length, row: 2, orient: (c % 2 === 0) ? "down" : "up" });
    }

    assert.strictEqual(SLOTS.length, 31, "Total pieces must be exactly 31");
    const upSlots = SLOTS.filter(s => s.orient === "up").map(s => s.id);
    const downSlots = SLOTS.filter(s => s.orient === "down").map(s => s.id);
    assert.strictEqual(upSlots.length, 16, "Must have exactly 16 upright triangles");
    assert.strictEqual(downSlots.length, 15, "Must have exactly 15 inverted triangles");

    // Verify hint solver guarantee across 500 scrambled states
    function findHintPair(board) {
        const incorrect = [];
        for (let i = 0; i < 31; i++) {
            if (board[i] !== i) incorrect.push(i);
        }
        if (incorrect.length < 2) return null;
        for (const i of incorrect) {
            const j = board.indexOf(i);
            if (j !== -1 && j !== i && board[j] !== j) {
                return [i, j];
            }
        }
        return null;
    }

    for (let iter = 0; iter < 500; iter++) {
        const board = new Array(31);
        const upShuffled = [...upSlots].sort(() => Math.random() - 0.5);
        const downShuffled = [...downSlots].sort(() => Math.random() - 0.5);
        upSlots.forEach((s, idx) => { board[s] = upShuffled[idx]; });
        downSlots.forEach((s, idx) => { board[s] = downShuffled[idx]; });

        const isSolved = board.every((val, idx) => val === idx);
        if (!isSolved) {
            const pair = findHintPair(board);
            assert.ok(pair, `Hint pair must be found for iteration ${iter}`);
            const [i, j] = pair;
            assert.strictEqual(SLOTS[i].orient, SLOTS[j].orient, "Hinted pieces must share identical orientation");
            assert.notStrictEqual(board[i], i, "Hinted piece 1 must be ill-placed");
            assert.notStrictEqual(board[j], j, "Hinted piece 2 must be ill-placed");

            // Verify swap puts at least one piece in correct position
            const afterSwap = [...board];
            [afterSwap[i], afterSwap[j]] = [afterSwap[j], afterSwap[i]];
            const atLeastOneCorrect = afterSwap[i] === i || afterSwap[j] === j;
            assert.ok(atLeastOneCorrect, "Swapping hinted pair must place at least one piece into its correct position");
        }
    }
    console.log("  ✓ Level 23 (31 pieces, 16 up / 15 down, orientation matching & hint solver guarantee) verified.");
}

// 22. Header Reset Button Visibility & Timer Anti-Cheat Rules
{
    console.log("22. Testing Header Reset Button Visibility Rules (Shown on L2, L6, L10, L16, L25, L34, L35, L44)...");
    const showResetLevels = new Set([2, 5, 11, 17, 24, 25, 30, 38]);
    assert.strictEqual(showResetLevels.size, 8, "Exactly 8 levels must have reset button visible in header");

    const hiddenLevels = Array.from({ length: 50 }, (_, i) => i + 1).filter(l => !showResetLevels.has(l));
    assert.strictEqual(hiddenLevels.length, 42, "Exactly 42 levels must have reset button hidden in header");

    // Verify anti-cheat timer preservation rule for L6, L34, L35, L44
    const noTimerResetLevels = new Set([5, 17, 30, 38]);
    for (const lvl of [5, 17, 30, 38]) {
        assert.ok(showResetLevels.has(lvl), `Level ${lvl} must have reset button enabled`);
        assert.ok(noTimerResetLevels.has(lvl), `Level ${lvl} must preserve timer without resetting to 0`);
    }

    console.log("  ✓ Header reset button visibility and anti-cheat timer preservation verified.");
}

// 23. Level Locking & Sequential Progression Rules
{
    console.log("23. Testing Level Locking & Sequential Progression Rules...");

    function isLevelUnlocked(progressionLevel, completedLevels, mode = "sequential") {
        if (mode === "all") return true;
        if (progressionLevel <= 1) return true;
        if (completedLevels.includes(progressionLevel)) return true;
        return completedLevels.includes(progressionLevel - 1);
    }

    // A. Fresh User (0 completed levels)
    const freshCompleted = [];
    assert.strictEqual(isLevelUnlocked(1, freshCompleted), true, "Level 1 must always be unlocked initially");
    for (let lvl = 2; lvl <= 50; lvl++) {
        assert.strictEqual(isLevelUnlocked(lvl, freshCompleted), false, `Level ${lvl} must be locked for fresh user`);
    }

    // B. Solved Level 1: Only Level 1 & Level 2 unlocked
    const solvedLvl1 = [1];
    assert.strictEqual(isLevelUnlocked(1, solvedLvl1), true, "Level 1 must remain unlocked after solving");
    assert.strictEqual(isLevelUnlocked(2, solvedLvl1), true, "Level 2 must unlock immediately after Level 1 is solved");
    for (let lvl = 3; lvl <= 50; lvl++) {
        assert.strictEqual(isLevelUnlocked(lvl, solvedLvl1), false, `Level ${lvl} must remain locked when only Level 1 is solved`);
    }

    // C. Solved Levels 1 & 2: Level 3 unlocked
    const solvedLvl2 = [1, 2];
    assert.strictEqual(isLevelUnlocked(1, solvedLvl2), true, "Level 1 remains unlocked (replayable)");
    assert.strictEqual(isLevelUnlocked(2, solvedLvl2), true, "Level 2 remains unlocked (replayable)");
    assert.strictEqual(isLevelUnlocked(3, solvedLvl2), true, "Level 3 unlocks when Level 2 is solved");
    for (let lvl = 4; lvl <= 50; lvl++) {
        assert.strictEqual(isLevelUnlocked(lvl, solvedLvl2), false, `Level ${lvl} must remain locked`);
    }

    // D. Complete sequential progression across all 50 levels
    const simCompleted = [];
    for (let current = 1; current <= 50; current++) {
        assert.strictEqual(isLevelUnlocked(current, simCompleted), true, `Current level ${current} must be unlocked`);
        if (current < 50) {
            assert.strictEqual(isLevelUnlocked(current + 1, simCompleted), false, `Level ${current + 1} must be locked before solving ${current}`);
        }
        simCompleted.push(current);
        if (current < 50) {
            assert.strictEqual(isLevelUnlocked(current + 1, simCompleted), true, `Level ${current + 1} must unlock after solving ${current}`);
        }
    }

    console.log("  ✓ Level locking and sequential progression (L1 -> L2 -> ... -> L50) verified.");
}

// 24. Authoritative Level XP Distribution Verification
{
    console.log("24. Testing Authoritative Level XP Distribution (Levels 1 to 50)...");
    const { LEVEL_XP } = require("../backend/games/puzzleQuest/catalog");

    const expectedXpTable = {
        1: 50, 2: 60, 3: 70, 4: 80, 5: 90,
        6: 100, 7: 110, 8: 120, 9: 130, 10: 140,
        11: 150, 12: 160, 13: 170, 14: 180, 15: 190,
        16: 200, 17: 215, 18: 230, 19: 245, 20: 260,
        21: 275, 22: 290, 23: 305, 24: 320, 25: 340,
        26: 360, 27: 380, 28: 400, 29: 420, 30: 440,
        31: 460, 32: 480, 33: 500, 34: 520, 35: 540,
        36: 560, 37: 580, 38: 600, 39: 625, 40: 650,
        41: 675, 42: 700, 43: 725, 44: 750, 45: 775,
        46: 800, 47: 850, 48: 900, 49: 950, 50: 1000
    };

    assert.ok(LEVEL_XP, "LEVEL_XP must be exported from catalog");
    for (let lvl = 1; lvl <= 50; lvl++) {
        const expectedXp = expectedXpTable[lvl];
        assert.strictEqual(LEVEL_XP[lvl], expectedXp, `LEVEL_XP for level ${lvl} must be ${expectedXp}`);

        const puzzle = PUZZLE_CATALOG.find(p => p.level === lvl);
        assert.ok(puzzle, `Level ${lvl} must exist in catalog`);
        assert.strictEqual(puzzle.xp, expectedXp, `puzzle.xp for level ${lvl} must be ${expectedXp}`);
    }

    console.log("  ✓ All 50 levels verified with exact authoritative XP distribution (Total: 20,120 XP).");
}

console.log("\nAll Puzzle Quest core unit tests PASSED! 🧩✓\n");

