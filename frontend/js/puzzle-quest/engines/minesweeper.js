"use strict";

/**
 * ENGINE: Minesweeper
 * Level 7 (Beginner: 9×9, 10 mines, 71 safe)
 * Level 31 (Intermediate: 16×16, 40 mines, 216 safe)
 */

window.PuzzleEngines = window.PuzzleEngines || {};

window.PuzzleEngines.minesweeper = {
    init: (container, puzzle, shell) => {
        const rows = puzzle.config.rows || 9;
        const cols = puzzle.config.cols || 9;
        const totalMines = puzzle.config.mines || 10;
        const totalSafe = (rows * cols) - totalMines;

        let grid = [];
        let revealedCount = 0;
        let flagsCount = 0;
        let isFirstClick = true;
        let isFlagMode = false;
        let isGameOver = false;

        let glowingCellPos = null;
        let hintGlowTimeout = null;

        const cellSize = Math.max(24, Math.min(400 / cols, 38));

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; width: 100%; box-sizing: border-box;">
                <div style="display: flex; gap: 16px; margin-bottom: 12px; align-items: center; flex-wrap: wrap; justify-content: center;">
                    <div class="pq-hud-stat">
                        <span class="label">MINES:</span>
                        <span id="pq-mine-remaining" style="color:var(--crimson);">${totalMines}</span>
                    </div>
                    <div class="pq-hud-stat">
                        <span class="label">SAFE CLEARED:</span>
                        <span id="pq-mine-cleared" style="color:var(--emerald);">0 / ${totalSafe}</span>
                    </div>
                    <button id="pq-flag-toggle" class="pq-hud-btn" type="button">
                        🚩 FLAG MODE: <span id="pq-flag-mode-label" style="color:var(--silver);">OFF</span>
                    </button>
                </div>

                <div class="pq-maze-scroll-wrap" style="width: 100%; max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; box-sizing: border-box; display: flex; justify-content: center; padding: 6px 4px 12px;">
                    <div style="min-width: max-content; display: flex; justify-content: center;">
                        <div class="pq-mine-grid" id="pq-mine-board" style="grid-template-columns: repeat(${cols}, ${cellSize}px); grid-template-rows: repeat(${rows}, ${cellSize}px); width: ${cols * cellSize}px; height: ${rows * cellSize}px;">
                            <!-- Cells injected by JS -->
                        </div>
                    </div>
                </div>

                <div style="font-size: 12px; color: rgba(255, 255, 255, 0.6); margin-top: 14px; text-align: center;">
                    Left-click to reveal. Right-click or toggle <strong>Flag Mode</strong> to plant flags.
                </div>

                ${puzzle.level === 31 ? "" : `
                <!-- Minesweeper Rules & Strategy Guide -->
                <div class="pq-rules-card">
                    <div class="pq-rules-title">
                        <span>📜</span> MINESWEEPER RULES & STRATEGY
                    </div>
                    <ul class="pq-rules-list">
                        <li><strong>Objective:</strong> Uncover every safe tile across the grid without detonating any of the ${totalMines} hidden mines.</li>
                        <li><strong>First Move Safe:</strong> Your initial click is always 100% safe and opens an initial clearing.</li>
                        <li><strong>Numbers as Clues:</strong> A revealed number indicates exactly how many mines are touching that tile (in all 8 surrounding neighbors).</li>
                        <li><strong>Flagging Mines:</strong> Right-click (or toggle <em>Flag Mode</em> on mobile) to mark tiles where you deduce a mine must be.</li>
                        <li><strong>Opening Cascades:</strong> Clicking a cell with zero adjacent mines automatically clears all its surrounding neighbors for you.</li>
                    </ul>
                </div>
                `}
            </div>
        `;

        const boardEl = container.querySelector("#pq-mine-board");
        const remainingEl = container.querySelector("#pq-mine-remaining");
        const clearedEl = container.querySelector("#pq-mine-cleared");
        const flagToggleBtn = container.querySelector("#pq-flag-toggle");
        const flagLabel = container.querySelector("#pq-flag-mode-label");

        flagToggleBtn.onclick = () => {
            isFlagMode = !isFlagMode;
            flagLabel.innerText = isFlagMode ? "ON" : "OFF";
            flagLabel.style.color = isFlagMode ? "var(--gold)" : "var(--silver)";
            flagToggleBtn.style.borderColor = isFlagMode ? "var(--gold)" : "rgba(255,255,255,0.2)";
        };

        function startGlowTimer() {
            if (typeof shell.playTone === "function") {
                try {
                    shell.playTone(660, "sine", 0.15, 0.1);
                    setTimeout(() => shell.playTone(880, "sine", 0.2, 0.15), 100);
                } catch (e) {}
            }
            if (hintGlowTimeout) clearTimeout(hintGlowTimeout);
            hintGlowTimeout = setTimeout(() => {
                glowingCellPos = null;
                render();
                hintGlowTimeout = null;
            }, 5000);
        }

        // When user opens and dismisses the hint ("The safe cell is glowing"), activate glow on one unrevealed safe cell
        shell.onHintDismissed = () => {
            if (isGameOver) return;

            // If game hasn't started yet, pick any tile (first click is always safe)
            if (isFirstClick) {
                // Pick a strategic central cell to start
                const centerR = Math.floor(rows / 2);
                const centerC = Math.floor(cols / 2);
                glowingCellPos = [centerR, centerC];
                render();
                startGlowTimer();
                return;
            }

            // Otherwise, find an unrevealed, non-mine, non-flagged cell (preferably adjacent to a revealed number)
            const safeCandidates = [];
            const safeBorderCandidates = [];

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const cell = grid[r][c];
                    if (!cell.revealed && !cell.mine && !cell.flagged) {
                        safeCandidates.push([r, c]);
                        // Check if adjacent to a revealed number
                        let touchesRevealed = false;
                        for (let dr = -1; dr <= 1; dr++) {
                            for (let dc = -1; dc <= 1; dc++) {
                                const nr = r + dr;
                                const nc = c + dc;
                                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc].revealed) {
                                    touchesRevealed = true;
                                    break;
                                }
                            }
                            if (touchesRevealed) break;
                        }
                        if (touchesRevealed) {
                            safeBorderCandidates.push([r, c]);
                        }
                    }
                }
            }

            if (safeBorderCandidates.length > 0) {
                glowingCellPos = safeBorderCandidates[Math.floor(Math.random() * safeBorderCandidates.length)];
            } else if (safeCandidates.length > 0) {
                glowingCellPos = safeCandidates[Math.floor(Math.random() * safeCandidates.length)];
            }

            render();
            startGlowTimer();

            // Smoothly scroll the glowing cell into view on scrollable layouts
            const glowingEl = boardEl.querySelector(".pq-mine-cell.glowing");
            if (glowingEl && typeof glowingEl.scrollIntoView === "function") {
                glowingEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
            }
        };

        function initGrid() {
            grid = [];
            for (let r = 0; r < rows; r++) {
                grid[r] = [];
                for (let c = 0; c < cols; c++) {
                    grid[r][c] = {
                        mine: false,
                        revealed: false,
                        flagged: false,
                        adjacentMines: 0
                    };
                }
            }
        }

        function placeMines(firstR, firstC) {
            let placed = 0;
            while (placed < totalMines) {
                const r = Math.floor(Math.random() * rows);
                const c = Math.floor(Math.random() * cols);
                // First click and immediate neighbors are guaranteed mine-free
                if (Math.abs(r - firstR) <= 1 && Math.abs(c - firstC) <= 1) continue;
                if (!grid[r][c].mine) {
                    grid[r][c].mine = true;
                    placed++;
                }
            }

            // Calculate adjacent counts
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (grid[r][c].mine) continue;
                    let count = 0;
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            const nr = r + dr;
                            const nc = c + dc;
                            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc].mine) {
                                count++;
                            }
                        }
                    }
                    grid[r][c].adjacentMines = count;
                }
            }
        }

        function render() {
            boardEl.innerHTML = "";
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const cell = document.createElement("div");
                    const data = grid[r][c];
                    cell.className = "pq-mine-cell";
                    cell.dataset.r = r;
                    cell.dataset.c = c;

                    if (data.revealed) {
                        cell.classList.add("revealed");
                        if (data.mine) {
                            cell.innerHTML = "💣";
                            cell.style.background = "rgba(239, 68, 68, 0.8)";
                        } else if (data.adjacentMines > 0) {
                            cell.innerText = data.adjacentMines;
                            const colors = ["", "#38bdf8", "#4ade80", "#f87171", "#818cf8", "#f43f5e", "#06b6d4", "#facc15", "#e2e8f0"];
                            cell.style.color = colors[data.adjacentMines] || "#ffffff";
                        }
                    } else if (data.flagged) {
                        cell.classList.add("flagged");
                        cell.innerHTML = "🚩";
                    } else if (glowingCellPos && glowingCellPos[0] === r && glowingCellPos[1] === c) {
                        cell.classList.add("glowing");
                    }

                    cell.onclick = (e) => onCellClick(r, c, false);
                    cell.oncontextmenu = (e) => {
                        e.preventDefault();
                        onCellClick(r, c, true);
                    };

                    boardEl.appendChild(cell);
                }
            }

            remainingEl.innerText = totalMines - flagsCount;
            clearedEl.innerText = `${revealedCount} / ${totalSafe}`;
            shell.setMoves(revealedCount);
        }

        function onCellClick(r, c, isRightClick) {
            if (isGameOver) return;

            // If user clicks on the glowing cell (or any cell), stop the glow timer
            if (hintGlowTimeout) {
                clearTimeout(hintGlowTimeout);
                hintGlowTimeout = null;
            }
            if (glowingCellPos) {
                glowingCellPos = null;
            }

            const data = grid[r][c];

            if (isRightClick || isFlagMode) {
                if (data.revealed) return;
                data.flagged = !data.flagged;
                flagsCount += data.flagged ? 1 : -1;
                render();
                return;
            }

            if (data.flagged || data.revealed) return;

            if (isFirstClick) {
                isFirstClick = false;
                placeMines(r, c);
            }

            if (data.mine) {
                // Detonated mine
                isGameOver = true;
                data.revealed = true;
                render();
                setTimeout(() => {
                    shell.failLevel("You detonated a hidden mine! Clear all safe cells by logical deduction.");
                }, 600);
                return;
            }

            // Reveal safe cell & expand if zero
            revealCell(r, c);
            render();

            if (revealedCount === totalSafe) {
                isGameOver = true;
                setTimeout(() => {
                    shell.completeLevel();
                }, 600);
            }
        }

        function revealCell(r, c) {
            const data = grid[r][c];
            if (data.revealed || data.flagged || data.mine) return;

            data.revealed = true;
            revealedCount++;

            if (data.adjacentMines === 0) {
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = r + dr;
                        const nc = c + dc;
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                            revealCell(nr, nc);
                        }
                    }
                }
            }
        }

        initGrid();
        render();

        shell.onReset = () => {
            if (hintGlowTimeout) {
                clearTimeout(hintGlowTimeout);
                hintGlowTimeout = null;
            }
            initGrid();
            revealedCount = 0;
            flagsCount = 0;
            isFirstClick = true;
            isGameOver = false;
            glowingCellPos = null;
            render();
        };

        shell.cleanup = () => {
            if (hintGlowTimeout) {
                clearTimeout(hintGlowTimeout);
                hintGlowTimeout = null;
            }
            shell.onReset = null;
        };
    }
};

