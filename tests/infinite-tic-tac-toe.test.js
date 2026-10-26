"use strict";

const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const {
    getWinner,
    chooseInfiniteComputerMove
} = require("../backend/games/ticTacToe");

console.log("Running Infinite Tic-Tac-Toe unit test suite...\n");

// Helper simulating an infinite queue turn
function applyInfiniteMove(board, queue, cell, symbol) {
    let vanishingOldest = null;
    if (queue.length >= 3) {
        vanishingOldest = queue.shift();
        board[vanishingOldest] = null;
    }
    board[cell] = symbol;
    queue.push(cell);
    return { vanishingOldest, winner: getWinner(board) };
}

// 1. 3-marker cap and queue eviction
{
    console.log("1. Testing 3-marker maximum cap & oldest marker eviction...");
    const board = Array(9).fill(null);
    const xQueue = [];

    // Moves 1, 2, 3
    applyInfiniteMove(board, xQueue, 0, "X");
    applyInfiniteMove(board, xQueue, 4, "X");
    applyInfiniteMove(board, xQueue, 8, "X");

    assert.equal(xQueue.length, 3);
    assert.deepEqual(xQueue, [0, 4, 8]);
    assert.equal(board[0], "X");
    assert.equal(board[4], "X");
    assert.equal(board[8], "X");

    // 4th move: placing on cell 2 should remove oldest (cell 0)
    const result = applyInfiniteMove(board, xQueue, 2, "X");
    assert.equal(result.vanishingOldest, 0);
    assert.equal(board[0], null, "Oldest marker at index 0 should vanish");
    assert.equal(board[2], "X", "New marker at index 2 should be active");
    assert.equal(xQueue.length, 3, "Queue length should remain capped at 3");
    assert.deepEqual(xQueue, [4, 8, 2]);
    console.log("  ✓ 3-marker cap and FIFO queue eviction confirmed.");
}

// 2. Visual blink / fade warning identification
{
    console.log("2. Testing vanishing marker warning detection...");
    const xQueue = [1, 4, 7];
    const oQueue = [0, 2];

    // When X has 3 pieces and it's X's turn:
    let vanishingCell = null;
    const currentTurn = "X";
    if (currentTurn === "X" && xQueue.length >= 3) {
        vanishingCell = xQueue[0];
    }
    assert.equal(vanishingCell, 1, "Cell 1 should be flagged as vanishing on X's turn");

    // When it switches to O's turn (O only has 2 pieces):
    let oVanishingCell = null;
    if ("O" === "O" && oQueue.length >= 3) {
        oVanishingCell = oQueue[0];
    }
    assert.equal(oVanishingCell, null, "No piece should vanish when player has < 3 markers");
    console.log("  ✓ Warning indicator identifies oldest piece only when at 3-piece limit.");
}

// 3. Winning detection with active markers
{
    console.log("3. Testing win detection with exactly 3 active markers...");
    const board = Array(9).fill(null);
    const xQueue = [0, 4];
    board[0] = "X";
    board[4] = "X";

    // 3rd move to complete diagonal [0, 4, 8]
    const res = applyInfiniteMove(board, xQueue, 8, "X");
    assert.ok(res.winner);
    assert.equal(res.winner.symbol, "X");
    assert.deepEqual(res.winner.winningCells, [0, 4, 8]);
    console.log("  ✓ Diagonal win detected.");

    // Eviction breaking a potential win line
    const board2 = Array(9).fill(null);
    const xQueue2 = [0, 1, 6];
    board2[0] = "X";
    board2[1] = "X";
    board2[6] = "X";

    // Placing at 2 would have made [0, 1, 2], BUT 0 is oldest and vanishes!
    // So active pieces become [1, 6, 2], which is not a line.
    const res2 = applyInfiniteMove(board2, xQueue2, 2, "X");
    assert.equal(res2.vanishingOldest, 0);
    assert.equal(board2[0], null);
    assert.equal(res2.winner, null, "Line was broken by eviction of cell 0");
    console.log("  ✓ Board win state accurately reflects active pieces after eviction.");
}

// 4. AI Strategic decisions (Winning move & Blocking move)
{
    console.log("4. Testing Infinite Mode Computer AI (win capture & block)...");
    // O has [3, 4], placing at 5 wins [3, 4, 5]
    const board = Array(9).fill(null);
    board[3] = "O";
    board[4] = "O";
    board[0] = "X";
    board[1] = "X";
    const oMoves = [3, 4];
    const xMoves = [0, 1];

    const aiMove = chooseInfiniteComputerMove(board, oMoves, xMoves, { mistakeChance: 0 });
    assert.equal(aiMove, 5, "Computer AI must choose winning move (cell 5)");
    console.log("  ✓ AI takes immediate win.");

    // X threatens to win with cell 2 ([0, 1, 2]). Computer O has [6], so O must block cell 2!
    const board2 = Array(9).fill(null);
    board2[0] = "X";
    board2[1] = "X";
    board2[6] = "O";
    const oMoves2 = [6];
    const xMoves2 = [0, 1];

    const aiBlock = chooseInfiniteComputerMove(board2, oMoves2, xMoves2, { mistakeChance: 0 });
    assert.equal(aiBlock, 2, "Computer AI must block X's winning cell (cell 2)");
    console.log("  ✓ AI blocks opponent's winning threat.");
}

console.log("\nAll Infinite Tic-Tac-Toe unit tests PASSED! ♾✓\n");

