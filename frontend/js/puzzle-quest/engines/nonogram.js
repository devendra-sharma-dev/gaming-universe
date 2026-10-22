"use strict";

/**
 * ENGINE: Nonogram (Pixel Reveal & Pixel Master)
 * Level 9 (7×7 Heart)
 * Level 46 (20×20 Pixel Master)
 */

window.PuzzleEngines = window.PuzzleEngines || {};

window.PuzzleEngines.nonogram = {
    init: (container, puzzle, shell) => {
        const size = puzzle.config.size || 5;
        const solution = puzzle.config.solution;
        const rowClues = puzzle.config.rowClues;
        const colClues = puzzle.config.colClues;

        // Player grid: 0 = empty, 1 = filled, 2 = crossed
        let playerGrid = Array.from({ length: size }, () => Array(size).fill(0));
        let mode = "fill"; // "fill" or "cross"
        let glowingCell = null; // [r, c]

        // Dynamic cell sizing: 36px for <=7, 28px for <=10, 24px for 20×20
        const cellSize = size <= 7 ? 36 : (size <= 10 ? 28 : 24);
        const isLevel46 = puzzle.level === 46;

        // Clue dimension calculations so text fits comfortably without clipping
        const maxRowClueLen = Math.max(...rowClues.map(c => c.length));
        const rowCluesWidth = Math.max(54, maxRowClueLen * 14 + 14);

        const maxColClueLen = Math.max(...colClues.map(c => c.length));
        const colCluesHeight = Math.max(56, maxColClueLen * 16 + 8);

        const gridWidth = size * cellSize + 4;
        const gridHeight = size * cellSize + 4;

        container.innerHTML = `
            <div class="pq-nono-wrapper">
                <div class="pq-nono-controls" style="display: flex; gap: 14px; margin-bottom: 12px; align-items: center; justify-content: center; flex-wrap: wrap;">
                    <button id="pq-nono-toggle-fill" class="pq-hud-btn" type="button" style="background:var(--cyan); color:#000; border-color:var(--cyan); font-weight:800; min-width: 120px;">
                        ■ FILL MODE
                    </button>
                    <button id="pq-nono-toggle-cross" class="pq-hud-btn" type="button" style="font-weight:800; min-width: 120px;">
                        ✖ CROSS MODE
                    </button>
                </div>

                <!-- Scroll Wrapper for perfect mobile & desktop visibility -->
                <div class="pq-nono-scroll-wrapper">
                    <div class="pq-nono-board-stage" style="display: grid; grid-template-columns: ${rowCluesWidth}px ${gridWidth}px; grid-template-rows: ${colCluesHeight}px ${gridHeight}px;">
                        <!-- (1, 1) Corner Spacer (Sticky) -->
                        <div class="pq-nono-corner-spacer" style="grid-column: 1; grid-row: 1; position: sticky; left: 0; z-index: 12; background: #030814; width: ${rowCluesWidth}px; height: ${colCluesHeight}px;"></div>

                        <!-- (1, 2) Top Clues Grid -->
                        <div class="pq-nono-top-clues" style="grid-column: 2; grid-row: 1; display: grid; grid-template-columns: repeat(${size}, ${cellSize}px); width: ${gridWidth}px; height: ${colCluesHeight}px; border-left: 2px solid var(--panel-border); border-right: 2px solid var(--panel-border); border-top: 2px solid transparent; border-bottom: 2px solid var(--panel-border); box-sizing: border-box; background: #030814;">
                            ${colClues.map((clue, c) => {
                                const isColDivider = isLevel46 && (c + 1) % 5 === 0 && c < size - 1;
                                return `
                                    <div class="pq-nono-col-clue" style="width: ${cellSize}px; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; padding: 2px 0; box-sizing: border-box; font-size: ${size >= 20 ? '11px' : '12px'}; font-weight: 700; color: #cbd5e1; border-right: ${isColDivider ? '2px solid var(--cyan)' : '1px solid rgba(255, 255, 255, 0.08)'};">
                                        ${clue.map(num => `<span style="line-height: 15px;">${num}</span>`).join("")}
                                    </div>
                                `;
                            }).join("")}
                        </div>

                        <!-- (2, 1) Row Clues Grid (Sticky) -->
                        <div class="pq-nono-row-clues" style="grid-column: 1; grid-row: 2; position: sticky; left: 0; z-index: 10; background: #030814; box-shadow: 3px 0 8px rgba(0, 0, 0, 0.6); display: grid; grid-template-rows: repeat(${size}, ${cellSize}px); width: ${rowCluesWidth}px; height: ${gridHeight}px; border-top: 2px solid transparent; border-bottom: 2px solid transparent; box-sizing: border-box;">
                            ${rowClues.map((clue, r) => {
                                const isRowDivider = isLevel46 && (r + 1) % 5 === 0 && r < size - 1;
                                return `
                                    <div class="pq-nono-row-clue-item" style="height: ${cellSize}px; display: flex; align-items: center; justify-content: flex-end; gap: 4px; padding-right: 8px; box-sizing: border-box; font-size: ${size >= 20 ? '11px' : '12px'}; font-weight: 700; color: #cbd5e1; border-bottom: ${isRowDivider ? '2px solid var(--cyan)' : '1px solid rgba(255, 255, 255, 0.08)'};">
                                        ${clue.map(num => `<span style="min-width: 10px; text-align: center;">${num}</span>`).join("")}
                                    </div>
                                `;
                            }).join("")}
                        </div>

                        <!-- (2, 2) Nonogram Grid -->
                        <div class="pq-nono-grid" id="pq-nono-board" style="grid-column: 2; grid-row: 2; display: grid; grid-template-columns: repeat(${size}, ${cellSize}px); grid-template-rows: repeat(${size}, ${cellSize}px); width: ${gridWidth}px; height: ${gridHeight}px; background: #020714; border: 2px solid var(--panel-border); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6); box-sizing: border-box;">
                            <!-- Cells injected by JS -->
                        </div>
                    </div>
                </div>

                <div style="font-size: 12px; color: rgba(255, 255, 255, 0.6); margin-top: 14px; text-align: center;">
                    Tap to fill (■) or switch to <strong>Cross Mode (✖)</strong> to mark empty cells.
                </div>

                <!-- Nonogram Rules & Strategy Guide -->
                <div class="pq-rules-card" style="margin-top: 16px; max-width: 600px; width: 100%;">
                    <div class="pq-rules-title">
                        <span>📜</span> NONOGRAM RULES & STRATEGY
                    </div>
                    <ul class="pq-rules-list">
                        <li><strong>Objective:</strong> Uncover the hidden pixel pattern by deducing which squares on the grid are filled (■) and which remain empty (✖).</li>
                        <li><strong>Number Clues:</strong> Numbers along each row and column indicate groups of consecutive filled squares in that line, in order.</li>
                        <li><strong>Spacing Rule:</strong> Multiple numbers in a line mean there is at least one empty square between consecutive runs. For instance, <em>2 2</em> indicates 2 filled squares, at least one empty space, then 2 filled squares.</li>
                        <li><strong>Anchor Clues:</strong> Large clues (such as <em>${size >= 20 ? "19 on a 20×20" : "7 on a 7×7"}</em> grid) leave almost no room for variation and provide guaranteed anchor squares!</li>
                        <li><strong>Cross Mode (✖):</strong> Use Cross Mode to mark cells you deduce are empty. This prevents misclicks and narrows down remaining cells.</li>
                    </ul>
                </div>
            </div>
        `;

        const boardEl = container.querySelector("#pq-nono-board");
        const fillBtn = container.querySelector("#pq-nono-toggle-fill");
        const crossBtn = container.querySelector("#pq-nono-toggle-cross");

        fillBtn.onclick = () => {
            mode = "fill";
            fillBtn.style.background = "var(--cyan)";
            fillBtn.style.color = "#000";
            fillBtn.style.borderColor = "var(--cyan)";
            crossBtn.style.background = "rgba(255,255,255,0.08)";
            crossBtn.style.color = "#fff";
            crossBtn.style.borderColor = "rgba(255,255,255,0.2)";
        };

        crossBtn.onclick = () => {
            mode = "cross";
            crossBtn.style.background = "var(--crimson)";
            crossBtn.style.color = "#fff";
            crossBtn.style.borderColor = "var(--crimson)";
            fillBtn.style.background = "rgba(255,255,255,0.08)";
            fillBtn.style.color = "#fff";
            fillBtn.style.borderColor = "rgba(255,255,255,0.2)";
        };

        // Hint handler: glow a safe cell (solution is 1, but player hasn't filled it)
        shell.onHintDismissed = () => {
            const safeCells = [];
            for (let r = 0; r < size; r++) {
                for (let c = 0; c < size; c++) {
                    if (solution[r][c] === 1 && playerGrid[r][c] !== 1) {
                        safeCells.push([r, c]);
                    }
                }
            }

            if (safeCells.length > 0) {
                glowingCell = safeCells[Math.floor(Math.random() * safeCells.length)];
                render();
            }
        };

        function applyCellStyling(cell, r, c) {
            cell.className = "pq-nono-cell";
            cell.style.width = `${cellSize}px`;
            cell.style.height = `${cellSize}px`;

            const isColDivider = isLevel46 && (c + 1) % 5 === 0 && c < size - 1;
            const isRowDivider = isLevel46 && (r + 1) % 5 === 0 && r < size - 1;

            if (isColDivider) {
                cell.style.borderRight = "2px solid var(--cyan)";
            } else {
                cell.style.borderRight = "1px solid rgba(255, 255, 255, 0.08)";
            }

            if (isRowDivider) {
                cell.style.borderBottom = "2px solid var(--cyan)";
            } else {
                cell.style.borderBottom = "1px solid rgba(255, 255, 255, 0.08)";
            }

            const val = playerGrid[r][c];
            if (val === 1) {
                cell.classList.add("filled");
                cell.innerText = "";
            } else if (val === 2) {
                cell.classList.add("crossed");
                cell.innerText = "✖";
            } else {
                cell.innerText = "";
            }

            if (glowingCell && glowingCell[0] === r && glowingCell[1] === c) {
                cell.classList.add("glowing");
            }
        }

        function render() {
            boardEl.innerHTML = "";
            for (let r = 0; r < size; r++) {
                for (let c = 0; c < size; c++) {
                    const cell = document.createElement("div");
                    applyCellStyling(cell, r, c);

                    cell.onclick = () => onCellClick(r, c, false);
                    cell.oncontextmenu = (e) => {
                        e.preventDefault();
                        onCellClick(r, c, true);
                    };

                    boardEl.appendChild(cell);
                }
            }
        }

        function updateCellDom(r, c) {
            const index = r * size + c;
            const cell = boardEl.children[index];
            if (cell) {
                applyCellStyling(cell, r, c);
            }
        }

        function onCellClick(r, c, isRight) {
            // Stop glowing when user clicks on the glowing cell
            if (glowingCell && glowingCell[0] === r && glowingCell[1] === c) {
                glowingCell = null;
            }

            const current = playerGrid[r][c];
            if (isRight || mode === "cross") {
                playerGrid[r][c] = current === 2 ? 0 : 2;
            } else {
                playerGrid[r][c] = current === 1 ? 0 : 1;
            }

            shell.incrementMoves();
            updateCellDom(r, c);
            checkSolution();
        }

        function checkSolution() {
            for (let r = 0; r < size; r++) {
                for (let c = 0; c < size; c++) {
                    const isPlayerFilled = playerGrid[r][c] === 1;
                    const isSolFilled = solution[r][c] === 1;
                    if (isPlayerFilled !== isSolFilled) return;
                }
            }

            // Solved!
            setTimeout(() => {
                shell.completeLevel();
            }, 600);
        }

        render();

        shell.onReset = () => {
            playerGrid = Array.from({ length: size }, () => Array(size).fill(0));
            glowingCell = null;
            render();
        };
    }
};

