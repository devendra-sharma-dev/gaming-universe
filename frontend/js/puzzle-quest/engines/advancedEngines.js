"use strict";

/**
 * ADVANCED ENGINES FOR PUZZLE QUEST: 50 CHALLENGES
 * - Level 26 & 48: Sudoku (Medium & Advanced)
 * - Level 30: Eight Coins, Two Weighings (Balance Scale)
 * - Level 32: Bridges / Hashiwokakero (Graph Logic)
 * - Level 33: Three-Layer Symbol Wheel (62232.jpg)
 * - Level 34: Fire & Ice Chain Sort (62235.jpg)
 * - Level 37: Circular Seating Arrangement (8 Seats)
 * - Level 39 & 49: Sliding Numbers (4×4 15-Puzzle & 5×5 image(1).png)
 * - Level 40: Archaeological Word Search (62240.jpg)
 * - Level 43: Eight Queens Domination (Chessboard Coverage)
 * - Level 50: Knight's Tour (64 Squares from A1)
 */

window.PuzzleEngines = window.PuzzleEngines || {};

// ─────────────────────────────────────────────────────────
// LEVEL 26 & 48: SUDOKU (Medium & Advanced)
// ─────────────────────────────────────────────────────────
window.PuzzleEngines.sudoku = {
    init: (container, puzzle, shell) => {
        const isAdvanced = puzzle.config.difficulty === "advanced";

        // Solved template boards
        const solution = [
            [5, 3, 4, 6, 7, 8, 9, 1, 2],
            [6, 7, 2, 1, 9, 5, 3, 4, 8],
            [1, 9, 8, 3, 4, 2, 5, 6, 7],
            [8, 5, 9, 7, 6, 1, 4, 2, 3],
            [4, 2, 6, 8, 5, 3, 7, 9, 1],
            [7, 1, 3, 9, 2, 4, 8, 5, 6],
            [9, 6, 1, 5, 3, 7, 2, 8, 4],
            [2, 8, 7, 4, 1, 9, 6, 3, 5],
            [3, 4, 5, 2, 8, 6, 1, 7, 9]
        ];

        // Mask for clues (1 = given, 0 = empty)
        let maskMedium = [
            [1, 1, 0, 0, 1, 0, 0, 0, 0],
            [1, 0, 0, 1, 1, 1, 0, 0, 0],
            [0, 1, 1, 0, 0, 0, 0, 1, 0],
            [1, 0, 0, 0, 1, 0, 0, 0, 1],
            [1, 0, 0, 1, 0, 1, 0, 0, 1],
            [1, 0, 0, 0, 1, 0, 0, 0, 1],
            [0, 1, 0, 0, 0, 0, 1, 1, 0],
            [0, 0, 0, 1, 1, 1, 0, 0, 1],
            [0, 0, 0, 0, 1, 0, 0, 1, 1]
        ];

        let maskAdvanced = [
            [0, 0, 0, 6, 0, 0, 9, 0, 2],
            [0, 7, 0, 0, 0, 0, 0, 0, 0],
            [1, 0, 0, 0, 4, 0, 0, 6, 0],
            [0, 0, 0, 7, 0, 0, 0, 0, 0],
            [4, 0, 0, 0, 5, 0, 0, 0, 1],
            [0, 0, 0, 0, 0, 4, 0, 0, 0],
            [0, 6, 0, 0, 3, 0, 0, 0, 4],
            [0, 0, 0, 0, 0, 0, 0, 3, 0],
            [3, 0, 5, 0, 0, 6, 0, 0, 0]
        ];

        const activeMask = isAdvanced ? maskAdvanced : maskMedium;
        const currentBoard = Array.from({ length: 9 }, (_, r) =>
            Array.from({ length: 9 }, (_, c) => (activeMask[r][c] ? solution[r][c] : 0))
        );

        let selectedCell = null;
        let glowingCell = null;
        let hintGlowTimeout = null;

        container.innerHTML = `
            <div class="pq-sudoku-wrapper">
                ${!isAdvanced ? `<div style="font-size: 13px; font-weight: 700; color: var(--gold); text-align: center;">CLASSIC SUDOKU: 9×9 GRID</div>` : ""}

                <!-- 9x9 Sudoku Board -->
                <div id="pq-sudoku-board" class="pq-sudoku-board"></div>

                <!-- Digits Keypad -->
                <div class="pq-sudoku-keypad">
                    <div class="pq-sudoku-num-row">
                        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `
                            <button class="pq-hud-btn pq-sudoku-key" data-num="${n}" type="button">${n}</button>
                        `).join("")}
                    </div>
                    <div class="pq-sudoku-actions-row">
                        <button class="pq-hud-btn pq-sudoku-clear" type="button">CLEAR</button>
                    </div>
                </div>
                <div id="pq-sudoku-msg" style="min-height: 22px; font-size: 13px; font-weight: 700; text-align: center;"></div>
            </div>
        `;

        const boardEl = container.querySelector("#pq-sudoku-board");
        const msgEl = container.querySelector("#pq-sudoku-msg");

        function renderBoard() {
            boardEl.innerHTML = "";
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    const cell = document.createElement("div");
                    const isGiven = activeMask[r][c] === 1;
                    const val = currentBoard[r][c];
                    const isGlowing = glowingCell && glowingCell.r === r && glowingCell.c === c;

                    cell.style.cssText = `
                        display: flex; align-items: center; justify-content: center;
                        font-size: 16px; font-weight: ${isGiven || isGlowing ? "900" : "600"};
                        color: ${isGlowing ? "var(--gold)" : (isGiven ? "var(--cyan)" : "#ffffff")};
                        background: ${isGlowing ? "rgba(245, 197, 24, 0.35)" : (selectedCell && selectedCell.r === r && selectedCell.c === c ? "rgba(56, 189, 248, 0.35)" : (r % 2 === c % 2 ? "rgba(255,255,255,0.02)" : "transparent"))};
                        border-right: ${c % 3 === 2 && c !== 8 ? "2px solid var(--panel-border)" : "1px solid rgba(255,255,255,0.08)"};
                        border-bottom: ${r % 3 === 2 && r !== 8 ? "2px solid var(--panel-border)" : "1px solid rgba(255,255,255,0.08)"};
                        cursor: ${isGiven ? "default" : "pointer"};
                        transition: background 0.15s ease, transform 0.2s ease;
                        user-select: none;
                        box-sizing: border-box;
                    `;

                    if (isGlowing) {
                        cell.classList.add("pq-sudoku-cell-hint");
                    }

                    cell.textContent = val > 0 ? val : "";

                    if (!isGiven) {
                        cell.onclick = () => {
                            selectedCell = { r, c };
                            renderBoard();
                        };
                    }
                    boardEl.appendChild(cell);
                }
            }
        }

        renderBoard();

        function enterNumber(num) {
            if (!selectedCell) return;
            const { r, c } = selectedCell;
            if (activeMask[r][c] === 1) return;

            currentBoard[r][c] = num;
            if (typeof shell.incrementMoves === "function") {
                shell.incrementMoves();
            }
            renderBoard();
            checkAutoWin();
        }

        container.querySelectorAll(".pq-sudoku-key").forEach(btn => {
            btn.onclick = () => enterNumber(Number(btn.dataset.num));
        });

        container.querySelector(".pq-sudoku-clear").onclick = () => {
            if (selectedCell) enterNumber(0);
        };

        function handleKeyDown(e) {
            if (e.key >= "1" && e.key <= "9") enterNumber(Number(e.key));
            if (e.key === "Backspace" || e.key === "Delete") enterNumber(0);
        }
        window.addEventListener("keydown", handleKeyDown);

        function checkAutoWin() {
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (currentBoard[r][c] !== solution[r][c]) return;
                }
            }
            if (msgEl) msgEl.innerHTML = `<span style="color: var(--emerald);">✓ Complete! Sudoku fully resolved!</span>`;
            setTimeout(() => shell.completeLevel(), 800);
        }

        // Reset grid to initial layout
        shell.onReset = () => {
            if (hintGlowTimeout) {
                clearTimeout(hintGlowTimeout);
                hintGlowTimeout = null;
            }
            glowingCell = null;
            selectedCell = null;
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    currentBoard[r][c] = activeMask[r][c] ? solution[r][c] : 0;
                }
            }
            if (msgEl) msgEl.innerHTML = "";
            renderBoard();
        };

        // Hint hook: place 1 correct number on any empty cell and glow for 5s
        shell.onHintDismissed = () => {
            const emptyCells = [];
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (activeMask[r][c] === 0 && currentBoard[r][c] === 0) {
                        emptyCells.push({ r, c });
                    }
                }
            }

            let candidates = emptyCells;
            if (candidates.length === 0) {
                for (let r = 0; r < 9; r++) {
                    for (let c = 0; c < 9; c++) {
                        if (activeMask[r][c] === 0 && currentBoard[r][c] !== solution[r][c]) {
                            candidates.push({ r, c });
                        }
                    }
                }
            }

            if (candidates.length === 0) return;

            const picked = candidates[Math.floor(Math.random() * candidates.length)];
            currentBoard[picked.r][picked.c] = solution[picked.r][picked.c];
            glowingCell = { r: picked.r, c: picked.c };
            selectedCell = { r: picked.r, c: picked.c };

            if (typeof shell.playTone === "function") {
                try {
                    shell.playTone(660, "triangle", 0.2, 0.1);
                    setTimeout(() => shell.playTone(880, "triangle", 0.3, 0.15), 100);
                } catch (e) {}
            }

            renderBoard();

            if (hintGlowTimeout) clearTimeout(hintGlowTimeout);
            hintGlowTimeout = setTimeout(() => {
                glowingCell = null;
                renderBoard();
                hintGlowTimeout = null;
            }, 5000);

            checkAutoWin();
        };

        shell.cleanup = () => {
            if (hintGlowTimeout) {
                clearTimeout(hintGlowTimeout);
                hintGlowTimeout = null;
            }
            window.removeEventListener("keydown", handleKeyDown);
        };
    }
};

// ─────────────────────────────────────────────────────────
// LEVEL 30: EIGHT COINS, TWO WEIGHINGS (Balance Scale)
// ─────────────────────────────────────────────────────────
window.PuzzleEngines.coinWeighing = {
    init: (container, puzzle, shell) => {
        // Randomly pick the heavier coin between 1 and 8
        let heavyCoin = Math.floor(Math.random() * 8) + 1;
        let weighingsUsed = 0;
        const maxWeighings = 2;

        let leftPan = [];
        let rightPan = [];
        let tray = [1, 2, 3, 4, 5, 6, 7, 8];
        let possibleCoins = new Set([1, 2, 3, 4, 5, 6, 7, 8]);

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 580px; margin: 0 auto; gap: 16px;">
                <div style="font-size: 13px; font-weight: 800; color: var(--gold); text-align: center;">
                    WEIGH AT MOST 2 TIMES TO DISCOVER THE HEAVIER COIN
                </div>

                <!-- Weighing Status Bar -->
                <div style="display: flex; justify-content: space-between; width: 100%; max-width: 440px; font-size: 13px; font-weight: 700; color: var(--cyan); background: rgba(0,0,0,0.25); padding: 8px 14px; border-radius: 8px; border: 1px solid var(--panel-border);">
                    <span>Weighings Used: <strong id="pq-weigh-count" style="color: #fff;">0 / 2</strong></span>
                    <span id="pq-scale-status" style="color: var(--gold);">Scale Balanced</span>
                </div>

                <!-- Balance Scale Graphic -->
                <div style="position: relative; width: 440px; height: 180px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end;">
                    <!-- Beam -->
                    <div id="pq-scale-beam" style="position: absolute; top: 40px; width: 340px; height: 8px; background: #94a3b8; border-radius: 4px; transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); transform-origin: center center; display: flex; justify-content: space-between; align-items: center;">
                        <!-- Left String & Pan -->
                        <div style="position: absolute; left: 10px; top: 8px; display: flex; flex-direction: column; align-items: center;">
                            <div style="width: 2px; height: 50px; background: rgba(255,255,255,0.4);"></div>
                            <div id="pq-pan-left" style="width: 110px; min-height: 48px; border: 2px solid var(--cyan); border-radius: 0 0 16px 16px; background: rgba(14, 27, 48, 0.9); display: flex; flex-wrap: wrap; gap: 4px; padding: 6px; justify-content: center; align-items: center;"></div>
                            <div style="font-size: 10px; font-weight: 800; color: var(--cyan); margin-top: 4px;">LEFT PAN</div>
                        </div>

                        <!-- Pivot Fulcrum -->
                        <div style="position: absolute; left: 50%; transform: translateX(-50%); top: -10px; width: 16px; height: 16px; border-radius: 50%; background: var(--gold); border: 2px solid #fff;"></div>

                        <!-- Right String & Pan -->
                        <div style="position: absolute; right: 10px; top: 8px; display: flex; flex-direction: column; align-items: center;">
                            <div style="width: 2px; height: 50px; background: rgba(255,255,255,0.4);"></div>
                            <div id="pq-pan-right" style="width: 110px; min-height: 48px; border: 2px solid var(--cyan); border-radius: 0 0 16px 16px; background: rgba(14, 27, 48, 0.9); display: flex; flex-wrap: wrap; gap: 4px; padding: 6px; justify-content: center; align-items: center;"></div>
                            <div style="font-size: 10px; font-weight: 800; color: var(--cyan); margin-top: 4px;">RIGHT PAN</div>
                        </div>
                    </div>

                    <!-- Base / Stand -->
                    <div style="width: 24px; height: 110px; background: #475569; border-radius: 4px; z-index: 1;"></div>
                    <div style="width: 120px; height: 14px; background: #334155; border-radius: 6px; z-index: 1;"></div>
                </div>

                <!-- Coins Tray -->
                <div style="width: 100%; max-width: 480px; background: rgba(14, 27, 48, 0.8); border: 1px solid var(--panel-border); border-radius: 12px; padding: 12px; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                    <div style="font-size: 11px; font-weight: 800; color: rgba(255,255,255,0.6);">COIN TRAY (TAP COIN TO PLACE ON LEFT / RIGHT PAN)</div>
                    <div id="pq-tray-coins" style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;"></div>
                </div>

                <!-- Scale Actions -->
                <div style="display: flex; gap: 10px;">
                    <button id="pq-scale-weigh-btn" class="pq-btn pq-btn-gold" type="button">WEIGH SCALE ⚖️</button>
                    <button id="pq-scale-reset-pans" class="pq-hud-btn" type="button">RETURN ALL TO TRAY</button>
                </div>

                <!-- Accusation Panel -->
                <div style="width: 100%; max-width: 480px; margin-top: 8px; text-align: center;">
                    <div style="font-size: 12px; font-weight: 800; color: var(--gold); margin-bottom: 8px;">WHICH COIN IS THE HEAVIER ONE?</div>
                    <div style="display: flex; justify-content: center; gap: 8px; flex-wrap: wrap;">
                        ${[1, 2, 3, 4, 5, 6, 7, 8].map(n => `
                            <button class="pq-hud-btn pq-accuse-btn" data-coin="${n}" style="width: 42px; height: 42px; font-size: 15px; font-weight: 900; border-color: var(--gold);">#${n}</button>
                        `).join("")}
                    </div>
                </div>

                <div id="pq-scale-feedback" style="min-height: 24px; font-size: 13px; font-weight: 700; text-align: center;"></div>
            </div>
        `;

        const panLeftEl = container.querySelector("#pq-pan-left");
        const panRightEl = container.querySelector("#pq-pan-right");
        const trayEl = container.querySelector("#pq-tray-coins");
        const beamEl = container.querySelector("#pq-scale-beam");
        const countEl = container.querySelector("#pq-weigh-count");
        const statusEl = container.querySelector("#pq-scale-status");
        const feedbackEl = container.querySelector("#pq-scale-feedback");

        function renderCoins() {
            panLeftEl.innerHTML = "";
            leftPan.forEach(c => {
                const el = createCoinEl(c, "left");
                panLeftEl.appendChild(el);
            });

            panRightEl.innerHTML = "";
            rightPan.forEach(c => {
                const el = createCoinEl(c, "right");
                panRightEl.appendChild(el);
            });

            trayEl.innerHTML = "";
            tray.forEach(c => {
                const el = createCoinEl(c, "tray");
                trayEl.appendChild(el);
            });
        }

        function createCoinEl(c, loc) {
            const el = document.createElement("button");
            el.className = "pq-coin-chip";
            el.style.cssText = `
                width: 32px; height: 32px; border-radius: 50%;
                background: radial-gradient(circle at 30% 30%, #fef08a, #ca8a04);
                border: 2px solid #eab308; color: #713f12; font-weight: 900;
                font-size: 13px; display: flex; align-items: center; justify-content: center;
                cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            `;
            el.textContent = c;

            el.onclick = () => {
                if (loc === "tray") {
                    if (leftPan.length <= rightPan.length) {
                        tray = tray.filter(x => x !== c);
                        leftPan.push(c);
                    } else {
                        tray = tray.filter(x => x !== c);
                        rightPan.push(c);
                    }
                } else if (loc === "left") {
                    leftPan = leftPan.filter(x => x !== c);
                    rightPan.push(c);
                } else if (loc === "right") {
                    rightPan = rightPan.filter(x => x !== c);
                    tray.push(c);
                }
                renderCoins();
            };
            return el;
        }

        renderCoins();

        container.querySelector("#pq-scale-reset-pans").onclick = () => {
            tray = [1, 2, 3, 4, 5, 6, 7, 8];
            leftPan = [];
            rightPan = [];
            beamEl.style.transform = "rotate(0deg)";
            statusEl.textContent = "Scale Balanced";
            renderCoins();
        };

        container.querySelector("#pq-scale-weigh-btn").onclick = () => {
            if (weighingsUsed >= maxWeighings) {
                feedbackEl.innerHTML = `<span style="color: var(--crimson);">Exceeded maximum 2 weighings! Select your answer below.</span>`;
                return;
            }

            if (leftPan.length === 0 && rightPan.length === 0) {
                feedbackEl.innerHTML = `<span style="color: var(--gold);">Place coins on the pans first!</span>`;
                return;
            }

            weighingsUsed++;
            shell.incrementMoves();
            countEl.textContent = `${weighingsUsed} / ${maxWeighings}`;

            // Calculate weights (normal coin = 1, heavy coin = 2)
            const leftWeight = leftPan.reduce((sum, c) => sum + (c === heavyCoin ? 2 : 1), 0);
            const rightWeight = rightPan.reduce((sum, c) => sum + (c === heavyCoin ? 2 : 1), 0);

            let outcome = "balanced";
            if (leftWeight > rightWeight) {
                outcome = "left";
                beamEl.style.transform = "rotate(-8deg)";
                statusEl.textContent = "Left Pan is Heavier ⬇️";
                feedbackEl.innerHTML = `<span style="color: var(--cyan);">Left side sinks! Total: Left > Right.</span>`;
            } else if (rightWeight > leftWeight) {
                outcome = "right";
                beamEl.style.transform = "rotate(8deg)";
                statusEl.textContent = "Right Pan is Heavier ⬇️";
                feedbackEl.innerHTML = `<span style="color: var(--cyan);">Right side sinks! Total: Right > Left.</span>`;
            } else {
                outcome = "balanced";
                beamEl.style.transform = "rotate(0deg)";
                statusEl.textContent = "Both Sides Balance Perfectly ⚖️";
                feedbackEl.innerHTML = `<span style="color: var(--gold);">Both sides have equal weight!</span>`;
            }

            // Narrow candidate set based on this weighing's outcome
            const nextPossible = new Set();
            for (const c of possibleCoins) {
                const simLeft = leftPan.reduce((sum, coin) => sum + (coin === c ? 2 : 1), 0);
                const simRight = rightPan.reduce((sum, coin) => sum + (coin === c ? 2 : 1), 0);
                let simOutcome = "balanced";
                if (simLeft > simRight) simOutcome = "left";
                else if (simRight > simLeft) simOutcome = "right";

                if (simOutcome === outcome) {
                    nextPossible.add(c);
                }
            }
            possibleCoins = nextPossible;
        };

        container.querySelectorAll(".pq-accuse-btn").forEach(btn => {
            btn.onclick = () => {
                const guess = Number(btn.dataset.coin);
                shell.incrementMoves();

                if (guess !== heavyCoin) {
                    shell.failLevel(`Coin #${guess} is normal weight. The heavy coin was #${heavyCoin}.`, "Incorrect Coin Selected");
                    return;
                }

                // If user selected the correct coin, check if it was deduced with 100% certainty or pure guesswork
                if (possibleCoins.size > 1) {
                    shell.failLevel(`Guesswork detected! Based on your previous weighings, there were ${possibleCoins.size} possible coins remaining. You must deduce the answer with 100% certainty before guessing!`, "Pure Guesswork Detected");
                    return;
                }

                feedbackEl.innerHTML = `<span style="color: var(--emerald);">✓ Correct! Coin #${heavyCoin} was uniquely deduced with 100% certainty! Brilliant logic.</span>`;
                setTimeout(() => shell.completeLevel(), 900);
            };
        });

        shell.onReset = () => {
            heavyCoin = Math.floor(Math.random() * 8) + 1;
            weighingsUsed = 0;
            possibleCoins = new Set([1, 2, 3, 4, 5, 6, 7, 8]);
            tray = [1, 2, 3, 4, 5, 6, 7, 8];
            leftPan = [];
            rightPan = [];
            beamEl.style.transform = "rotate(0deg)";
            statusEl.textContent = "Scale Balanced";
            countEl.textContent = `0 / ${maxWeighings}`;
            feedbackEl.innerHTML = "";
            renderCoins();
        };

        shell.cleanup = () => {
            shell.onReset = null;
        };
    }
};

// ─────────────────────────────────────────────────────────
// LEVEL 32: BRIDGES (Hashiwokakero - 10x10 Master Challenge)
// ─────────────────────────────────────────────────────────
window.PuzzleEngines.bridges = {
    init: (container, puzzle, shell) => {
        // 10x10 grid authentic Hashiwokakero puzzle (23 islands)
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

        // 29 Valid orthogonal connections
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

        // Intersecting orthogonal pairs (cannot cross)
        const crossingPairs = [
            [11, 16],
            [11, 21],
            [19, 20],
            [22, 25]
        ];

        // Edge bridge counts: 0, 1, or 2
        let edgeBridges = Array(allowedEdges.length).fill(0);
        let selectedIsland = null;

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 520px; margin: 0 auto; gap: 14px;">
                <!-- Interactive SVG Canvas (10x10 Grid with Horizontal Scroll on Mobile) -->
                <div class="pq-maze-scroll-wrap" style="width: 100%; max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; box-sizing: border-box; display: flex; justify-content: center; padding: 4px 2px 10px;">
                    <div style="min-width: max-content; display: flex; justify-content: center;">
                        <div style="position: relative; width: 390px; height: 390px; background: #071529; border: 2px solid var(--panel-border); border-radius: 12px; box-shadow: inset 0 0 30px rgba(0,0,0,0.5); overflow: hidden;">
                            <svg id="pq-bridges-svg" width="390" height="390" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
                                <!-- Grid lines and bridges rendered here -->
                            </svg>
                            <!-- Island buttons rendered here -->
                            <div id="pq-islands-layer" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;"></div>
                        </div>
                    </div>
                </div>

                <div style="display: flex; gap: 10px;">
                    <button id="pq-bridges-clear" class="pq-hud-btn" type="button">CLEAR BRIDGES</button>
                    <button id="pq-bridges-check" class="pq-btn pq-btn-gold" type="button">CHECK SOLUTION</button>
                </div>
                <div id="pq-bridges-msg" style="min-height: 22px; font-size: 13px; font-weight: 700; text-align: center;"></div>

                <!-- Hashiwokakero Rules & Strategy Guide -->
                <div class="pq-rules-card" style="margin-top: 6px;">
                    <div class="pq-rules-title">
                        <span>🌉</span> BRIDGES (HASHIWOKAKERO) RULES
                    </div>
                    <ul class="pq-rules-list">
                        <li><strong>Objective:</strong> Connect all islands into a single, fully connected network using horizontal and vertical bridges.</li>
                        <li><strong>Bridge Limit:</strong> At most 2 bridges can connect any pair of adjacent islands (tap an island, then an adjacent island to cycle: 0 → 1 → 2 → 0).</li>
                        <li><strong>Island Target:</strong> The number on each island indicates exactly how many bridges must connect to it. An island turns green when its bridge count matches.</li>
                        <li><strong>No Crossing:</strong> Bridges may only run horizontally or vertically and must never cross other bridges or other islands.</li>
                        <li><strong>Connected Network:</strong> All islands must be connected together in one continuous network (no isolated groups).</li>
                    </ul>
                </div>
            </div>
        `;

        const svgEl = container.querySelector("#pq-bridges-svg");
        const islandsEl = container.querySelector("#pq-islands-layer");
        const msgEl = container.querySelector("#pq-bridges-msg");

        function getCoord(pos) {
            return 22 + pos * 38.4;
        }

        function renderBridges() {
            // Render background grid & lines in SVG
            let svgHtml = "";

            // Faint grid lines
            for (let i = 0; i < 10; i++) {
                const pos = getCoord(i);
                svgHtml += `<line x1="${pos}" y1="${getCoord(0)}" x2="${pos}" y2="${getCoord(9)}" stroke="rgba(255,255,255,0.06)" stroke-width="1" />`;
                svgHtml += `<line x1="${getCoord(0)}" y1="${pos}" x2="${getCoord(9)}" y2="${pos}" stroke="rgba(255,255,255,0.06)" stroke-width="1" />`;
            }

            allowedEdges.forEach((edge, idx) => {
                const count = edgeBridges[idx];
                if (count === 0) return;

                const u = islands[edge.u];
                const v = islands[edge.v];
                const x1 = getCoord(u.c);
                const y1 = getCoord(u.r);
                const x2 = getCoord(v.c);
                const y2 = getCoord(v.r);

                if (count === 1) {
                    svgHtml += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round" />`;
                } else if (count === 2) {
                    if (edge.type === "h") {
                        svgHtml += `<line x1="${x1}" y1="${y1 - 3}" x2="${x2}" y2="${y2 - 3}" stroke="#38bdf8" stroke-width="2.5" />`;
                        svgHtml += `<line x1="${x1}" y1="${y1 + 3}" x2="${x2}" y2="${y2 + 3}" stroke="#38bdf8" stroke-width="2.5" />`;
                    } else {
                        svgHtml += `<line x1="${x1 - 3}" y1="${y1}" x2="${x2 - 3}" y2="${y2}" stroke="#38bdf8" stroke-width="2.5" />`;
                        svgHtml += `<line x1="${x1 + 3}" y1="${y1}" x2="${x2 + 3}" y2="${y2}" stroke="#38bdf8" stroke-width="2.5" />`;
                    }
                }
            });
            svgEl.innerHTML = svgHtml;

            // Render Islands
            islandsEl.innerHTML = "";
            islands.forEach(isl => {
                const currentDegree = allowedEdges.reduce((sum, edge, idx) => {
                    if (edge.u === isl.id || edge.v === isl.id) return sum + edgeBridges[idx];
                    return sum;
                }, 0);

                const isExact = currentDegree === isl.target;
                const isOver = currentDegree > isl.target;
                const isSelected = selectedIsland === isl.id;

                const btn = document.createElement("button");
                btn.className = "pq-island-node";
                btn.style.cssText = `
                    position: absolute;
                    left: ${getCoord(isl.c) - 14}px;
                    top: ${getCoord(isl.r) - 14}px;
                    width: 28px; height: 28px; border-radius: 50%;
                    background: ${isSelected ? "var(--cyan)" : isExact ? "var(--emerald)" : isOver ? "var(--crimson)" : "#0f294a"};
                    border: 2px solid ${isSelected ? "#fff" : isExact ? "#34d399" : isOver ? "#f87171" : "var(--panel-border)"};
                    color: #fff; font-weight: 900; font-size: 13px;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; pointer-events: auto;
                    box-shadow: 0 0 10px ${isSelected ? "var(--cyan)" : isExact ? "rgba(16, 185, 129, 0.4)" : "rgba(0,0,0,0.5)"};
                    transition: transform 0.15s ease, background 0.2s ease;
                `;
                btn.textContent = isl.target;

                btn.onclick = () => onIslandClick(isl.id);
                islandsEl.appendChild(btn);
            });
        }

        function onIslandClick(id) {
            if (selectedIsland === null) {
                selectedIsland = id;
                renderBridges();
            } else if (selectedIsland === id) {
                selectedIsland = null;
                renderBridges();
            } else {
                const u = Math.min(selectedIsland, id);
                const v = Math.max(selectedIsland, id);
                const edgeIndex = allowedEdges.findIndex(e => e.u === u && e.v === v);

                if (edgeIndex !== -1) {
                    const nextCount = (edgeBridges[edgeIndex] + 1) % 3;
                    if (nextCount > 0) {
                        const hasCrossing = crossingPairs.some(([e1, e2]) => {
                            if (e1 === edgeIndex && edgeBridges[e2] > 0) return true;
                            if (e2 === edgeIndex && edgeBridges[e1] > 0) return true;
                            return false;
                        });
                        if (hasCrossing) {
                            if (msgEl) msgEl.innerHTML = `<span style="color: var(--crimson);">Bridges cannot cross existing bridges!</span>`;
                            selectedIsland = null;
                            renderBridges();
                            return;
                        }
                    }
                    edgeBridges[edgeIndex] = nextCount;
                    shell.incrementMoves();
                    if (msgEl) msgEl.innerHTML = "";
                }
                selectedIsland = null;
                renderBridges();
                checkWin();
            }
        }

        function checkWin() {
            for (const isl of islands) {
                const deg = allowedEdges.reduce((sum, edge, idx) => {
                    if (edge.u === isl.id || edge.v === isl.id) return sum + edgeBridges[idx];
                    return sum;
                }, 0);
                if (deg !== isl.target) return false;
            }

            // Check no crossings
            for (const [e1, e2] of crossingPairs) {
                if (edgeBridges[e1] > 0 && edgeBridges[e2] > 0) return false;
            }

            // Check connectivity via BFS
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
                for (const next of adj[cur]) {
                    if (!visited.has(next)) {
                        visited.add(next);
                        queue.push(next);
                    }
                }
            }

            if (visited.size === islands.length) {
                msgEl.innerHTML = `<span style="color: var(--emerald);">✓ Complete! Island network fully connected and balanced!</span>`;
                setTimeout(() => shell.completeLevel(), 900);
                return true;
            }
            return false;
        }

        container.querySelector("#pq-bridges-clear").onclick = () => {
            edgeBridges.fill(0);
            selectedIsland = null;
            if (msgEl) msgEl.innerHTML = "";
            renderBridges();
        };

        container.querySelector("#pq-bridges-check").onclick = () => {
            if (!checkWin()) {
                msgEl.innerHTML = `<span style="color: var(--crimson);">Island numbers must match bridge counts, cannot cross, and all islands must be connected!</span>`;
            }
        };

        shell.onReset = () => {
            edgeBridges.fill(0);
            selectedIsland = null;
            if (msgEl) msgEl.innerHTML = "";
            renderBridges();
        };

        shell.cleanup = () => {
            edgeBridges.fill(0);
            selectedIsland = null;
        };

        renderBridges();
    }
};

// ─────────────────────────────────────────────────────────
// LEVEL 33: THREE-LAYER SYMBOL WHEEL (62232.jpg)
// ─────────────────────────────────────────────────────────
window.PuzzleEngines.symbolWheel = {
    init: (container, puzzle, shell) => {
        // 12 Ancient Runic Symbols with clean SVG vector graphics
        const SYMBOLS = {
            knot: {
                name: "Celtic Knot",
                svg: `<svg viewBox="0 0 40 40" width="100%" height="100%"><rect x="10" y="10" width="20" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="3" transform="rotate(45 20 20)"/><rect x="11" y="11" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="20" cy="20" r="4" fill="currentColor"/></svg>`
            },
            sunCross: {
                name: "Double-T Cross",
                svg: `<svg viewBox="0 0 40 40" width="100%" height="100%"><line x1="20" y1="6" x2="20" y2="34" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><line x1="10" y1="12" x2="30" y2="12" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><line x1="10" y1="28" x2="30" y2="28" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><line x1="10" y1="12" x2="10" y2="18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><line x1="30" y1="22" x2="30" y2="28" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`
            },
            nordicMaze: {
                name: "Nordic Maze",
                svg: `<svg viewBox="0 0 40 40" width="100%" height="100%"><path d="M 8,8 L 32,8 L 32,32 L 20,32 L 20,20 L 26,20 L 26,14 L 14,14 L 14,26 L 8,26 Z" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linejoin="miter"/></svg>`
            },
            hourglass: {
                name: "Hourglass",
                svg: `<svg viewBox="0 0 40 40" width="100%" height="100%"><line x1="8" y1="8" x2="32" y2="8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><line x1="8" y1="32" x2="32" y2="32" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M 11,9 L 29,31 M 29,9 L 11,31" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="20" cy="20" r="3.5" fill="currentColor"/></svg>`
            },
            triskelion: {
                name: "Triskelion",
                svg: `<svg viewBox="0 0 40 40" width="100%" height="100%"><path d="M 20,20 Q 20,9 12,9 Q 7,13 10,18" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><path d="M 20,20 Q 29,15 31,23 Q 28,30 22,28" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><path d="M 20,20 Q 15,31 22,34 Q 30,32 28,24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><circle cx="20" cy="20" r="3" fill="currentColor"/></svg>`
            },
            diamonds: {
                name: "Interlocking Diamonds",
                svg: `<svg viewBox="0 0 40 40" width="100%" height="100%"><polygon points="20,6 29,15 20,24 11,15" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><polygon points="20,16 29,25 20,34 11,25" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></svg>`
            },
            waves: {
                name: "Triple Waves",
                svg: `<svg viewBox="0 0 40 40" width="100%" height="100%"><path d="M 8,12 Q 14,7 20,12 T 32,12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M 8,20 Q 14,15 20,20 T 32,20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M 8,28 Q 14,23 20,28 T 32,28" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`
            },
            moon: {
                name: "Double Moon",
                svg: `<svg viewBox="0 0 40 40" width="100%" height="100%"><path d="M 9,14 Q 20,26 31,14 Q 20,19 9,14 Z" fill="currentColor"/><path d="M 9,24 Q 20,36 31,24 Q 20,29 9,24 Z" fill="currentColor"/></svg>`
            },
            angularKey: {
                name: "Angular Hook",
                svg: `<svg viewBox="0 0 40 40" width="100%" height="100%"><path d="M 10,12 L 24,12 L 24,24 L 32,24 M 18,12 L 18,30 L 10,30" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="square"/></svg>`
            },
            bull: {
                name: "Bull Horns",
                svg: `<svg viewBox="0 0 40 40" width="100%" height="100%"><path d="M 12,10 Q 10,24 20,32 Q 30,24 28,10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><line x1="12" y1="21" x2="28" y2="21" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M 8,10 Q 12,12 14,8 M 32,10 Q 28,12 26,8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`
            },
            trident: {
                name: "Trident",
                svg: `<svg viewBox="0 0 40 40" width="100%" height="100%"><line x1="20" y1="33" x2="20" y2="7" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M 13,11 L 20,6 L 27,11" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M 10,21 Q 14,24 20,24 Q 26,24 30,21 L 30,13 M 10,21 L 10,13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`
            },
            beetle: {
                name: "Scarab Beetle",
                svg: `<svg viewBox="0 0 40 40" width="100%" height="100%"><ellipse cx="20" cy="21" rx="6" ry="8" fill="currentColor"/><circle cx="20" cy="11" r="3.5" fill="currentColor"/><path d="M 18,9 Q 15,6 13,8 M 22,9 Q 25,6 27,8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M 14,17 L 9,15 M 14,21 L 8,21 M 14,25 L 9,28" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 26,17 L 31,15 M 26,21 L 32,21 M 26,25 L 31,28" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`
            }
        };

        // Inner Core: Fixed blueprint sequence (Positions 0..11, 0 is 12 o'clock, clockwise)
        const INNER_TARGETS = [
            "sunCross", "triskelion", "nordicMaze", "knot", "hourglass", "angularKey",
            "diamonds", "waves", "beetle", "moon", "trident", "bull"
        ];

        // Initial state from reference image: completely shuffled, both pockets empty!
        const INITIAL_MIDDLE = [
            "hourglass", "triskelion", "sunCross", "waves", "moon", "angularKey",
            "bull", "trident", "beetle", "knot", "nordicMaze", "diamonds"
        ];
        const INITIAL_OUTER = [
            "beetle", "sunCross", "nordicMaze", "knot", "hourglass", "triskelion",
            "diamonds", "waves", "moon", "bull", "trident", "angularKey"
        ];

        let middleRing = [...INITIAL_MIDDLE];
        let outerRing = [...INITIAL_OUTER];
        let rightSlot = { mid: null, out: null };
        let leftSlot = { mid: null, out: null };

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 780px; margin: 0 auto; gap: 14px;">
                <!-- Canvas wrap with mobile horizontal scrolling (starts at 0 on left, no cutoff) -->
                <div class="pq-maze-scroll-wrap" style="width: 100%; max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; box-sizing: border-box; text-align: center; padding: 4px 2px 8px;">
                    <div style="display: inline-block; min-width: 760px; text-align: left; margin: 0 auto;">
                        <div id="pq-wheel-canvas-container" style="position: relative; width: 760px; height: 460px; background: #061325; border: 2px solid var(--panel-border); border-radius: 14px; box-shadow: inset 0 0 35px rgba(0,0,0,0.6); overflow: hidden; user-select: none;">
                            <!-- SVG Base for circles, tracks, and background aesthetics -->
                            <svg id="pq-wheel-svg" width="760" height="460" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;">
                                <defs>
                                    <radialGradient id="pq-jewel-grad" cx="50%" cy="50%" r="50%">
                                        <stop offset="0%" stop-color="#93c5fd"/>
                                        <stop offset="60%" stop-color="#1d4ed8"/>
                                        <stop offset="100%" stop-color="#0f172a"/>
                                    </radialGradient>
                                    <filter id="pq-glow-gold" x="-20%" y="-20%" width="140%" height="140%">
                                        <feGaussianBlur stdDeviation="3" result="blur"/>
                                        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                                    </filter>
                                </defs>

                                <!-- Unified Outer Perimeter: Central Wheel and Side Pockets with NO boundary inside the ring -->
                                <path d="M 582.5 192 L 716 192 A 14 14 0 0 1 730 206 L 730 254 A 14 14 0 0 1 716 268 L 582.5 268 A 206 206 0 0 1 177.5 268 L 44 268 A 14 14 0 0 1 30 254 L 30 206 A 14 14 0 0 1 44 192 L 177.5 192 A 206 206 0 0 1 582.5 192 Z" fill="#081d33" stroke="#d97706" stroke-width="3.5"/>

                                <!-- Wheel Center (cx: 380, cy: 230) -->
                                <!-- Concentric Track Bands -->
                                <circle cx="380" cy="230" r="186" fill="rgba(16, 86, 104, 0.28)" stroke="#1e293b" stroke-width="40"/>
                                <circle cx="380" cy="230" r="132" fill="rgba(13, 67, 82, 0.35)" stroke="#0f172a" stroke-width="38"/>
                                <circle cx="380" cy="230" r="78" fill="rgba(11, 46, 63, 0.45)" stroke="#0b2e3f" stroke-width="34"/>

                                <!-- Golden Divider Rings -->
                                <circle cx="380" cy="230" r="158" fill="none" stroke="rgba(217, 119, 6, 0.5)" stroke-width="1.8"/>
                                <circle cx="380" cy="230" r="102" fill="none" stroke="rgba(217, 119, 6, 0.55)" stroke-width="1.8"/>
                                <circle cx="380" cy="230" r="58" fill="none" stroke="#d97706" stroke-width="2.5"/>

                                <!-- 12 Radial Sector Spokes -->
                                ${[ -75, -45, -15, 15, 45, 75, 105, 135, 165, 195, 225, 255 ].map(deg => {
                                    const rad = deg * Math.PI / 180;
                                    const x1 = (380 + 58 * Math.cos(rad)).toFixed(1);
                                    const y1 = (230 + 58 * Math.sin(rad)).toFixed(1);
                                    const x2 = (380 + 206 * Math.cos(rad)).toFixed(1);
                                    const y2 = (230 + 206 * Math.sin(rad)).toFixed(1);
                                    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(217, 119, 6, 0.3)" stroke-width="1.5"/>`;
                                }).join("")}

                                <!-- Central Blue Crystal Jewel -->
                                <circle cx="380" cy="230" r="42" fill="url(#pq-jewel-grad)" stroke="#fbbf24" stroke-width="3" filter="url(#pq-glow-gold)"/>
                                <polygon points="380,194 404,208 404,236 380,250 356,236 356,208" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>
                            </svg>

                            <!-- Interactive Layer for Tiles & Slots -->
                            <div id="pq-wheel-interactive" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></div>
                        </div>
                    </div>
                </div>

                <!-- Rotation HUD Controls -->
                <div style="display: flex; gap: 24px; justify-content: center; flex-wrap: wrap;">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; background: rgba(15, 23, 42, 0.6); padding: 8px 14px; border-radius: 10px; border: 1px solid rgba(103, 232, 249, 0.3);">
                        <span style="font-size: 11px; font-weight: 800; color: #67e8f9; letter-spacing: 1px;">OUTER RING</span>
                        <div style="display: flex; gap: 8px;">
                            <button id="pq-btn-outer-ccw" class="pq-hud-btn" type="button" style="padding: 6px 14px; font-weight: 800;">⟲ CCW</button>
                            <button id="pq-btn-outer-cw" class="pq-hud-btn" type="button" style="padding: 6px 14px; font-weight: 800;">CW ⟳</button>
                        </div>
                    </div>

                    <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; background: rgba(15, 23, 42, 0.6); padding: 8px 14px; border-radius: 10px; border: 1px solid rgba(251, 191, 36, 0.3);">
                        <span style="font-size: 11px; font-weight: 800; color: #fbbf24; letter-spacing: 1px;">MIDDLE RING</span>
                        <div style="display: flex; gap: 8px;">
                            <button id="pq-btn-middle-ccw" class="pq-hud-btn" type="button" style="padding: 6px 14px; font-weight: 800;">⟲ CCW</button>
                            <button id="pq-btn-middle-cw" class="pq-hud-btn" type="button" style="padding: 6px 14px; font-weight: 800;">CW ⟳</button>
                        </div>
                    </div>
                </div>

                <div id="pq-wheel-status" style="min-height: 22px; font-size: 13px; font-weight: 700; text-align: center;"></div>
            </div>
        `;

        const layerEl = container.querySelector("#pq-wheel-interactive");
        const statusEl = container.querySelector("#pq-wheel-status");

        const CX = 380;
        const CY = 230;
        const R_INNER = 78;
        const R_MID = 132;
        const R_OUT = 186;

        // Pocket slot coordinates - perfectly spaced, no overlap with ring tiles
        const SLOTS = {
            right: {
                mid: { x: 632, y: CY, label: "MID" },
                out: { x: 692, y: CY, label: "OUT" }
            },
            left: {
                out: { x: 68, y: CY, label: "OUT" },
                mid: { x: 128, y: CY, label: "MID" }
            }
        };

        function getPosAngle(idx) {
            // Index 0: 12 o'clock (-90 deg), clockwise
            return (idx * 30 - 90) * (Math.PI / 180);
        }

        function createTileElement(symKey, size, color, bgColor, borderColor, isInteractive, title = "") {
            const el = document.createElement("div");
            el.className = "pq-rune-tile" + (isInteractive ? " pq-rune-interactive" : "");
            el.title = title || (SYMBOLS[symKey]?.name || "");
            el.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                border-radius: 8px;
                background: ${bgColor};
                border: 2px solid ${borderColor};
                color: ${color};
                display: flex;
                align-items: center;
                justify-content: center;
                box-sizing: border-box;
                padding: 4px;
                transition: transform 0.18s ease, box-shadow 0.18s ease;
                ${isInteractive ? "cursor: pointer; box-shadow: 0 0 10px rgba(56, 189, 248, 0.4); touch-action: none;" : "pointer-events: none;"}
            `;
            if (symKey && SYMBOLS[symKey]) {
                el.innerHTML = SYMBOLS[symKey].svg;
            }
            return el;
        }

        // Render entire interactive state
        function render() {
            layerEl.innerHTML = "";

            // 1. Render Fixed Inner Ring (Targets)
            for (let i = 0; i < 12; i++) {
                const sym = INNER_TARGETS[i];
                const angle = getPosAngle(i);
                const x = CX + R_INNER * Math.cos(angle);
                const y = CY + R_INNER * Math.sin(angle);
                const tile = createTileElement(sym, 26, "#38bdf8", "#0b2e3f", "#d97706", false, `Inner Target: ${SYMBOLS[sym]?.name}`);
                tile.style.left = `${x - 13}px`;
                tile.style.top = `${y - 13}px`;
                layerEl.appendChild(tile);
            }

            // 2. Render Middle Ring
            for (let i = 0; i < 12; i++) {
                const sym = middleRing[i];
                const angle = getPosAngle(i);
                const x = CX + R_MID * Math.cos(angle);
                const y = CY + R_MID * Math.sin(angle);

                if (sym) {
                    const isMatched = sym === INNER_TARGETS[i];
                    // Movable if at pos 3 (right gate) and outerRing[3] === null and rightSlot.mid === null,
                    // OR at pos 9 (left gate) and outerRing[9] === null and leftSlot.mid === null.
                    const canMoveRight = (i === 3 && outerRing[3] === null && rightSlot.mid === null);
                    const canMoveLeft = (i === 9 && outerRing[9] === null && leftSlot.mid === null);
                    const isInteractive = canMoveRight || canMoveLeft;

                    const color = isMatched ? "#34d399" : "#fbbf24";
                    const borderColor = isMatched ? "#10b981" : (isInteractive ? "#f59e0b" : "#475569");
                    const bgColor = isMatched ? "rgba(6, 78, 59, 0.85)" : "#0f233a";

                    const tile = createTileElement(sym, 32, color, bgColor, borderColor, isInteractive, `Middle Ring: ${SYMBOLS[sym]?.name}`);
                    tile.style.left = `${x - 16}px`;
                    tile.style.top = `${y - 16}px`;

                    if (isInteractive) {
                        tile.style.animation = "pq-pulse-glow 1.5s infinite";
                        setupDrag(tile, () => {
                            if (canMoveRight) transferRightMiddle();
                            else if (canMoveLeft) transferLeftMiddle();
                        });
                    }
                    layerEl.appendChild(tile);
                } else {
                    // Empty Middle Ring Slot indicator
                    const emptySlot = document.createElement("div");
                    emptySlot.style.cssText = `
                        position: absolute; left: ${x - 14}px; top: ${y - 14}px; width: 28px; height: 28px;
                        border-radius: 6px; border: 1.5px dashed rgba(251, 191, 36, 0.4); background: rgba(0,0,0,0.3); pointer-events: none;
                    `;
                    layerEl.appendChild(emptySlot);
                }
            }

            // 3. Render Outer Ring
            for (let i = 0; i < 12; i++) {
                const sym = outerRing[i];
                const angle = getPosAngle(i);
                const x = CX + R_OUT * Math.cos(angle);
                const y = CY + R_OUT * Math.sin(angle);

                if (sym) {
                    const isMatched = sym === INNER_TARGETS[i];
                    // Movable if at pos 3 and rightSlot.out === null, OR at pos 9 and leftSlot.out === null.
                    const canMoveRight = (i === 3 && rightSlot.out === null);
                    const canMoveLeft = (i === 9 && leftSlot.out === null);
                    const isInteractive = canMoveRight || canMoveLeft;

                    const color = isMatched ? "#34d399" : "#67e8f9";
                    const borderColor = isMatched ? "#10b981" : (isInteractive ? "#38bdf8" : "#475569");
                    const bgColor = isMatched ? "rgba(6, 78, 59, 0.85)" : "#0c2842";

                    const tile = createTileElement(sym, 36, color, bgColor, borderColor, isInteractive, `Outer Ring: ${SYMBOLS[sym]?.name}`);
                    tile.style.left = `${x - 18}px`;
                    tile.style.top = `${y - 18}px`;

                    if (isInteractive) {
                        tile.style.animation = "pq-pulse-glow 1.5s infinite";
                        setupDrag(tile, () => {
                            if (canMoveRight) transferRightOuter();
                            else if (canMoveLeft) transferLeftOuter();
                        });
                    }
                    layerEl.appendChild(tile);
                } else {
                    // Empty Outer Ring Slot indicator
                    const emptySlot = document.createElement("div");
                    emptySlot.style.cssText = `
                        position: absolute; left: ${x - 16}px; top: ${y - 16}px; width: 32px; height: 32px;
                        border-radius: 6px; border: 1.5px dashed rgba(56, 189, 248, 0.4); background: rgba(0,0,0,0.3); pointer-events: none;
                    `;
                    layerEl.appendChild(emptySlot);
                }
            }

            // 4. Render Pocket Slots (Left & Right)
            renderPocketSlot("right", "mid", rightSlot.mid, SLOTS.right.mid, () => transferRightMiddle(), outerRing[3] === null && middleRing[3] === null);
            renderPocketSlot("right", "out", rightSlot.out, SLOTS.right.out, () => transferRightOuter(), outerRing[3] === null);

            renderPocketSlot("left", "mid", leftSlot.mid, SLOTS.left.mid, () => transferLeftMiddle(), outerRing[9] === null && middleRing[9] === null);
            renderPocketSlot("left", "out", leftSlot.out, SLOTS.left.out, () => transferLeftOuter(), outerRing[9] === null);

            updateStatus();
        }

        function renderPocketSlot(side, type, sym, slotCoord, onMoveAction, canReturnToRing) {
            // Slot base box
            const slotBox = document.createElement("div");
            slotBox.style.cssText = `
                position: absolute; left: ${slotCoord.x - 20}px; top: ${slotCoord.y - 20}px; width: 40px; height: 40px;
                border-radius: 8px; border: 1.5px dashed ${type === "out" ? "rgba(56,189,248,0.5)" : "rgba(251,191,36,0.5)"};
                background: rgba(15, 23, 42, 0.6); display: flex; flex-direction: column; align-items: center; justify-content: center;
                pointer-events: none;
            `;
            slotBox.innerHTML = `<span style="font-size: 8px; font-weight: 800; color: ${type === "out" ? "#38bdf8" : "#fbbf24"}; opacity: 0.6;">${slotCoord.label}</span>`;
            layerEl.appendChild(slotBox);

            if (sym) {
                const isInteractive = canReturnToRing;
                const tile = createTileElement(sym, 34, type === "out" ? "#67e8f9" : "#fbbf24", "#091f36", isInteractive ? "#38bdf8" : "#64748b", isInteractive, `${side.toUpperCase()} Pocket (${slotCoord.label}): ${SYMBOLS[sym]?.name}`);
                tile.style.left = `${slotCoord.x - 17}px`;
                tile.style.top = `${slotCoord.y - 17}px`;

                if (isInteractive) {
                    tile.style.animation = "pq-pulse-glow 1.5s infinite";
                    setupDrag(tile, () => onMoveAction());
                }
                layerEl.appendChild(tile);
            }
        }

        // Pointer Drag & Tap handling helper
        function setupDrag(element, onAction) {
            let startX = 0;
            let startY = 0;
            let isDragging = false;

            element.addEventListener("pointerdown", (e) => {
                e.preventDefault();
                startX = e.clientX;
                startY = e.clientY;
                isDragging = false;
                element.setPointerCapture(e.pointerId);
            });

            element.addEventListener("pointermove", (e) => {
                if (!element.hasPointerCapture(e.pointerId)) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                if (Math.hypot(dx, dy) > 6) {
                    isDragging = true;
                    element.style.transform = `translate(${dx}px, ${dy}px) scale(1.12)`;
                    element.style.zIndex = "100";
                }
            });

            const onRelease = (e) => {
                if (!element.hasPointerCapture(e.pointerId)) return;
                element.releasePointerCapture(e.pointerId);
                element.style.transform = "";
                element.style.zIndex = "";

                // If dragged past threshold or simple tap/click
                onAction();
            };

            element.addEventListener("pointerup", onRelease);
            element.addEventListener("pointercancel", (e) => {
                if (element.hasPointerCapture(e.pointerId)) element.releasePointerCapture(e.pointerId);
                element.style.transform = "";
                element.style.zIndex = "";
            });
        }

        // Movement Actions
        function transferRightOuter() {
            if (rightSlot.out === null && outerRing[3] !== null) {
                rightSlot.out = outerRing[3];
                outerRing[3] = null;
                shell.incrementMoves();
                render();
                checkWin();
            } else if (rightSlot.out !== null && outerRing[3] === null) {
                outerRing[3] = rightSlot.out;
                rightSlot.out = null;
                shell.incrementMoves();
                render();
                checkWin();
            }
        }

        function transferRightMiddle() {
            if (outerRing[3] !== null) {
                showMsg("Outer gate at 3 o'clock must be clear to move middle tile!", "crimson");
                return;
            }
            if (rightSlot.mid === null && middleRing[3] !== null) {
                rightSlot.mid = middleRing[3];
                middleRing[3] = null;
                shell.incrementMoves();
                render();
                checkWin();
            } else if (rightSlot.mid !== null && middleRing[3] === null) {
                middleRing[3] = rightSlot.mid;
                rightSlot.mid = null;
                shell.incrementMoves();
                render();
                checkWin();
            }
        }

        function transferLeftOuter() {
            if (leftSlot.out === null && outerRing[9] !== null) {
                leftSlot.out = outerRing[9];
                outerRing[9] = null;
                shell.incrementMoves();
                render();
                checkWin();
            } else if (leftSlot.out !== null && outerRing[9] === null) {
                outerRing[9] = leftSlot.out;
                leftSlot.out = null;
                shell.incrementMoves();
                render();
                checkWin();
            }
        }

        function transferLeftMiddle() {
            if (outerRing[9] !== null) {
                showMsg("Outer gate at 9 o'clock must be clear to move middle tile!", "crimson");
                return;
            }
            if (leftSlot.mid === null && middleRing[9] !== null) {
                leftSlot.mid = middleRing[9];
                middleRing[9] = null;
                shell.incrementMoves();
                render();
                checkWin();
            } else if (leftSlot.mid !== null && middleRing[9] === null) {
                middleRing[9] = leftSlot.mid;
                leftSlot.mid = null;
                shell.incrementMoves();
                render();
                checkWin();
            }
        }

        // Rotations
        function rotateOuter(dir) {
            if (dir === "cw") {
                outerRing = [outerRing[11], ...outerRing.slice(0, 11)];
            } else {
                outerRing = [...outerRing.slice(1), outerRing[0]];
            }
            shell.incrementMoves();
            render();
            checkWin();
        }

        function rotateMiddle(dir) {
            if (dir === "cw") {
                middleRing = [middleRing[11], ...middleRing.slice(0, 11)];
            } else {
                middleRing = [...middleRing.slice(1), middleRing[0]];
            }
            shell.incrementMoves();
            render();
            checkWin();
        }

        function countMatches() {
            let m = 0;
            for (let i = 0; i < 12; i++) {
                if (middleRing[i] === INNER_TARGETS[i]) m++;
                if (outerRing[i] === INNER_TARGETS[i]) m++;
            }
            return m;
        }

        function updateStatus() {
            const matches = countMatches();
            if (matches < 24) {
                statusEl.innerHTML = `<span style="color: rgba(255,255,255,0.7);">Alignment Progress: <strong style="color: var(--gold);">${matches} / 24</strong> runes matching inner core</span>`;
            }
        }

        function showMsg(txt, color = "gold") {
            statusEl.innerHTML = `<span style="color: var(--${color});">${txt}</span>`;
            setTimeout(() => updateStatus(), 2200);
        }

        function checkWin() {
            // All 4 pocket slots must be returned to rings
            if (rightSlot.mid !== null || rightSlot.out !== null || leftSlot.mid !== null || leftSlot.out !== null) {
                return false;
            }
            for (let i = 0; i < 12; i++) {
                if (middleRing[i] !== INNER_TARGETS[i] || outerRing[i] !== INNER_TARGETS[i]) {
                    return false;
                }
            }

            statusEl.innerHTML = `<span style="color: var(--emerald); font-weight: 800; font-size: 15px;">✓ All 24 runic positions perfectly aligned with the Inner Core! Seal unlocked!</span>`;
            setTimeout(() => shell.completeLevel(), 900);
            return true;
        }

        // Wire Buttons
        container.querySelector("#pq-btn-outer-ccw").onclick = () => rotateOuter("ccw");
        container.querySelector("#pq-btn-outer-cw").onclick = () => rotateOuter("cw");
        container.querySelector("#pq-btn-middle-ccw").onclick = () => rotateMiddle("ccw");
        container.querySelector("#pq-btn-middle-cw").onclick = () => rotateMiddle("cw");

        shell.onReset = () => {
            middleRing = [...INITIAL_MIDDLE];
            outerRing = [...INITIAL_OUTER];
            rightSlot = { mid: null, out: null };
            leftSlot = { mid: null, out: null };
            render();
        };

        shell.cleanup = () => {
            // cleanup references
        };

        render();
    }
};

// ─────────────────────────────────────────────────────────
// LEVEL 34: FIRE & ICE CHAIN SORT (62235.jpg)
// ─────────────────────────────────────────────────────────
window.PuzzleEngines.fireIceSort = {
    init: (container, puzzle, shell) => {
        // Total balls: 18 Blue (Ice) + 18 Red (Fire) + 2 White (Neutral) = 38 Balls
        // 20 slots per ring: 18 on track + 2 in the vertical carriage platform
        // Solved state: 18 Blue in upper track, 18 Red in lower track, 2 White in platform
        // Initial state generated via 50 deterministic legal operations from solved state
        const INITIAL_PLATFORM_POS = "upper";
        const INITIAL_UPPER_RING = [
            "blue", "red", "red", "red", "red", "blue", "blue", "white", "red", "white",
            "blue", "red", "blue", "blue", "blue", "blue", "blue", "red", "blue", "red"
        ];
        const INITIAL_LOWER_TRACK = [
            "red", "blue", "red", "blue", "blue", "blue", "blue", "red", "red",
            "red", "red", "red", "blue", "red", "blue", "blue", "red", "red"
        ];

        let platformPos = INITIAL_PLATFORM_POS;
        let upperRing = [...INITIAL_UPPER_RING];
        let lowerTrack = [...INITIAL_LOWER_TRACK];
        let upperTrack = null;
        let lowerRing = null;

        // Geometry Constants (Uniform spacing across straight paths and curves)
        // 6 slots on top straight, 4 on right semicircle, 6 on bottom straight, 4 on left semicircle = 20 slots
        const CX = 260;
        const CY_TOP = 190;
        const CY_BOT = 395;
        const D = 35.0; // Distance between adjacent ball centers (~35px, leaving clean ~7px gap everywhere)
        const L = 2.5 * D; // 87.5px half-span for the 6 straight slots
        const R = (5.0 * D) / Math.PI; // 55.704px radius so semicircle arc length = 5*D, matching straight spacing

        // 20 Slot coordinates for Upper Ring (clockwise, 0 is top-left)
        const UPPER_COORDS = [];
        for (let i = 0; i < 6; i++) {
            UPPER_COORDS.push({ x: (CX - L) + i * D, y: CY_TOP - R });
        }
        for (let i = 1; i <= 4; i++) {
            const ang = -Math.PI / 2 + i * (Math.PI / 5);
            UPPER_COORDS.push({ x: (CX + L) + R * Math.cos(ang), y: CY_TOP + R * Math.sin(ang) });
        }
        for (let i = 0; i < 6; i++) {
            UPPER_COORDS.push({ x: (CX + L) - i * D, y: CY_TOP + R });
        }
        for (let i = 1; i <= 4; i++) {
            const ang = Math.PI / 2 + i * (Math.PI / 5);
            UPPER_COORDS.push({ x: (CX - L) + R * Math.cos(ang), y: CY_TOP + R * Math.sin(ang) });
        }

        // 20 Slot coordinates for Lower Ring (clockwise, 0 is top-left)
        const LOWER_COORDS = [];
        for (let i = 0; i < 6; i++) {
            LOWER_COORDS.push({ x: (CX - L) + i * D, y: CY_BOT - R });
        }
        for (let i = 1; i <= 4; i++) {
            const ang = -Math.PI / 2 + i * (Math.PI / 5);
            LOWER_COORDS.push({ x: (CX + L) + R * Math.cos(ang), y: CY_BOT + R * Math.sin(ang) });
        }
        for (let i = 0; i < 6; i++) {
            LOWER_COORDS.push({ x: (CX + L) - i * D, y: CY_BOT + R });
        }
        for (let i = 1; i <= 4; i++) {
            const ang = Math.PI / 2 + i * (Math.PI / 5);
            LOWER_COORDS.push({ x: (CX - L) + R * Math.cos(ang), y: CY_BOT + R * Math.sin(ang) });
        }

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 580px; margin: 0 auto; gap: 8px;">
                <!-- Canvas wrap with mobile horizontal scrolling -->
                <div class="pq-maze-scroll-wrap" style="width: 100%; max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; box-sizing: border-box; text-align: center; padding: 2px;">
                    <div style="display: inline-block; min-width: 520px; text-align: left; margin: 0 auto;">
                        <div id="pq-fireice-canvas" style="position: relative; width: 520px; height: 570px; background: #06111f; border: 2px solid var(--panel-border); border-radius: 16px; box-shadow: inset 0 0 45px rgba(0,0,0,0.85); overflow: hidden; user-select: none;">
                            <!-- SVG Decorative Background Layer -->
                            <svg width="520" height="570" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;">
                                <defs>
                                    <!-- Ball Gradients -->
                                    <radialGradient id="pq-ball-blue" cx="35%" cy="35%" r="65%">
                                        <stop offset="0%" stop-color="#e0f2fe"/>
                                        <stop offset="30%" stop-color="#38bdf8"/>
                                        <stop offset="70%" stop-color="#0284c7"/>
                                        <stop offset="100%" stop-color="#082f49"/>
                                    </radialGradient>
                                    <radialGradient id="pq-ball-red" cx="35%" cy="35%" r="65%">
                                        <stop offset="0%" stop-color="#fee2e2"/>
                                        <stop offset="30%" stop-color="#f87171"/>
                                        <stop offset="70%" stop-color="#dc2626"/>
                                        <stop offset="100%" stop-color="#450a0a"/>
                                    </radialGradient>
                                    <radialGradient id="pq-ball-white" cx="35%" cy="35%" r="65%">
                                        <stop offset="0%" stop-color="#ffffff"/>
                                        <stop offset="45%" stop-color="#f1f5f9"/>
                                        <stop offset="80%" stop-color="#cbd5e1"/>
                                        <stop offset="100%" stop-color="#475569"/>
                                    </radialGradient>

                                    <!-- Aura Filters -->
                                    <filter id="pq-glow-ice" x="-20%" y="-20%" width="140%" height="140%">
                                        <feGaussianBlur stdDeviation="4" result="blur"/>
                                        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                                    </filter>
                                    <filter id="pq-glow-fire" x="-20%" y="-20%" width="140%" height="140%">
                                        <feGaussianBlur stdDeviation="4" result="blur"/>
                                        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                                    </filter>
                                </defs>

                                <!-- Upper Ice Track Fill & Glow (Uniform Stadium Racetrack) -->
                                <path d="M 172.5 134.3 L 347.5 134.3 A 55.7 55.7 0 0 1 347.5 245.7 L 172.5 245.7 A 55.7 55.7 0 0 1 172.5 134.3 Z" fill="rgba(6, 30, 54, 0.7)" stroke="#1e293b" stroke-width="36"/>
                                <path d="M 172.5 134.3 L 347.5 134.3 A 55.7 55.7 0 0 1 347.5 245.7 L 172.5 245.7 A 55.7 55.7 0 0 1 172.5 134.3 Z" fill="none" stroke="rgba(56, 189, 248, 0.45)" stroke-width="2.5" filter="url(#pq-glow-ice)"/>
                                <path d="M 172.5 152.3 L 347.5 152.3 A 37.7 37.7 0 0 1 347.5 227.7 L 172.5 227.7 A 37.7 37.7 0 0 1 172.5 152.3 Z" fill="#030e1a" stroke="rgba(56, 189, 248, 0.25)" stroke-width="1.5"/>

                                <!-- Lower Fire Track Fill & Glow (Uniform Stadium Racetrack) -->
                                <path d="M 172.5 339.3 L 347.5 339.3 A 55.7 55.7 0 0 1 347.5 450.7 L 172.5 450.7 A 55.7 55.7 0 0 1 172.5 339.3 Z" fill="rgba(45, 12, 12, 0.7)" stroke="#1e293b" stroke-width="36"/>
                                <path d="M 172.5 339.3 L 347.5 339.3 A 55.7 55.7 0 0 1 347.5 450.7 L 172.5 450.7 A 55.7 55.7 0 0 1 172.5 339.3 Z" fill="none" stroke="rgba(239, 68, 68, 0.45)" stroke-width="2.5" filter="url(#pq-glow-fire)"/>
                                <path d="M 172.5 357.3 L 347.5 357.3 A 37.7 37.7 0 0 1 347.5 432.7 L 172.5 432.7 A 37.7 37.7 0 0 1 172.5 357.3 Z" fill="#150505" stroke="rgba(239, 68, 68, 0.25)" stroke-width="1.5"/>

                                <!-- Center Elevator Guiding Rails -->
                                <line x1="228" y1="230" x2="228" y2="355" stroke="#d97706" stroke-width="2" stroke-dasharray="4,2"/>
                                <line x1="292" y1="230" x2="292" y2="355" stroke="#d97706" stroke-width="2" stroke-dasharray="4,2"/>
                            </svg>

                            <!-- Interactive Layer (Carriage, Balls, and Stopper Blocks) -->
                            <div id="pq-fireice-interactive" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></div>

                            <!-- Upper Ring Center Hub: Frost Emoji + Clockwise Button -->
                            <div style="position: absolute; left: 195px; top: 168px; width: 130px; height: 44px; display: flex; align-items: center; justify-content: center; gap: 14px; z-index: 12;">
                                <span style="font-size: 30px; filter: drop-shadow(0 0 8px rgba(56, 189, 248, 0.7)); pointer-events: none; user-select: none;">❄️</span>
                                <button id="pq-btn-ice-cw" type="button" title="Rotate Clockwise" style="width: 38px; height: 38px; border-radius: 50%; background: rgba(8, 47, 73, 0.85); border: 2px solid #38bdf8; color: #38bdf8; font-size: 21px; font-weight: 900; line-height: 1; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 0 10px rgba(56, 189, 248, 0.35); padding: 0;">⟳</button>
                            </div>

                            <!-- Lower Ring Center Hub: Fire Emoji + Clockwise Button -->
                            <div style="position: absolute; left: 195px; top: 373px; width: 130px; height: 44px; display: flex; align-items: center; justify-content: center; gap: 14px; z-index: 12;">
                                <span style="font-size: 30px; filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.7)); pointer-events: none; user-select: none;">🔥</span>
                                <button id="pq-btn-fire-cw" type="button" title="Rotate Clockwise" style="width: 38px; height: 38px; border-radius: 50%; background: rgba(69, 10, 10, 0.85); border: 2px solid #ef4444; color: #ef4444; font-size: 21px; font-weight: 900; line-height: 1; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 0 10px rgba(239, 68, 68, 0.35); padding: 0;">⟳</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="pq-fireice-msg" style="min-height: 22px; font-size: 13px; font-weight: 700; text-align: center;"></div>
            </div>
        `;

        const layerEl = container.querySelector("#pq-fireice-interactive");
        const msgEl = container.querySelector("#pq-fireice-msg");
        const btnIceCw = container.querySelector("#pq-btn-ice-cw");
        const btnFireCw = container.querySelector("#pq-btn-fire-cw");

        function createBallElement(color, x, y) {
            const ball = document.createElement("div");
            ball.className = "pq-fi-ball";
            ball.style.cssText = `
                position: absolute;
                left: ${x - 14}px;
                top: ${y - 14}px;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                box-sizing: border-box;
                transition: transform 0.2s ease, left 0.3s ease, top 0.3s ease;
                z-index: 10;
                pointer-events: none;
            `;

            if (color === "blue") {
                ball.style.background = "radial-gradient(circle at 35% 35%, #e0f2fe 0%, #38bdf8 30%, #0284c7 70%, #082f49 100%)";
                ball.style.boxShadow = "0 0 10px rgba(56, 189, 248, 0.65), inset 0 -2px 4px rgba(0,0,0,0.6)";
                ball.style.border = "1.5px solid rgba(224, 242, 254, 0.5)";
            } else if (color === "red") {
                ball.style.background = "radial-gradient(circle at 35% 35%, #fee2e2 0%, #f87171 30%, #dc2626 70%, #450a0a 100%)";
                ball.style.boxShadow = "0 0 10px rgba(239, 68, 68, 0.65), inset 0 -2px 4px rgba(0,0,0,0.6)";
                ball.style.border = "1.5px solid rgba(254, 226, 226, 0.5)";
            } else {
                ball.style.background = "radial-gradient(circle at 35% 35%, #ffffff 0%, #f1f5f9 45%, #cbd5e1 80%, #475569 100%)";
                ball.style.boxShadow = "0 0 12px rgba(255, 255, 255, 0.85), inset 0 -2px 4px rgba(0,0,0,0.4)";
                ball.style.border = "1.5px solid #ffffff";
            }
            return ball;
        }

        function render() {
            layerEl.innerHTML = "";

            // 1. Render Socket Indicators for both rings
            for (let i = 0; i < 20; i++) {
                const isCarriageUpper = (i === 12 || i === 13);
                const isCarriageLower = (i === 2 || i === 3);

                if (!isCarriageUpper) {
                    const skt = document.createElement("div");
                    skt.style.cssText = `
                        position: absolute; left: ${UPPER_COORDS[i].x - 13}px; top: ${UPPER_COORDS[i].y - 13}px;
                        width: 26px; height: 26px; border-radius: 50%;
                        background: rgba(8, 29, 51, 0.6); border: 1.5px dashed rgba(56, 189, 248, 0.25);
                        pointer-events: none;
                    `;
                    layerEl.appendChild(skt);
                }

                if (!isCarriageLower) {
                    const skt = document.createElement("div");
                    skt.style.cssText = `
                        position: absolute; left: ${LOWER_COORDS[i].x - 13}px; top: ${LOWER_COORDS[i].y - 13}px;
                        width: 26px; height: 26px; border-radius: 50%;
                        background: rgba(42, 12, 12, 0.6); border: 1.5px dashed rgba(239, 68, 68, 0.25);
                        pointer-events: none;
                    `;
                    layerEl.appendChild(skt);
                }
            }

            // 2. Render Balls on Tracks
            if (platformPos === "upper") {
                // Upper ring has all 20 balls active
                for (let i = 0; i < 20; i++) {
                    const b = upperRing[i];
                    layerEl.appendChild(createBallElement(b, UPPER_COORDS[i].x, UPPER_COORDS[i].y));
                }
                // Lower ring has 18 track balls (indices 2 & 3 are blocked by carriage)
                let trackIdx = 0;
                for (let i = 0; i < 20; i++) {
                    if (i === 2 || i === 3) continue;
                    const b = lowerTrack[trackIdx++];
                    layerEl.appendChild(createBallElement(b, LOWER_COORDS[i].x, LOWER_COORDS[i].y));
                }
            } else {
                // Upper ring has 18 track balls (indices 12 & 13 are blocked by carriage)
                let trackIdx = 0;
                for (let i = 0; i < 20; i++) {
                    if (i === 12 || i === 13) continue;
                    const b = upperTrack[trackIdx++];
                    layerEl.appendChild(createBallElement(b, UPPER_COORDS[i].x, UPPER_COORDS[i].y));
                }
                // Lower ring has all 20 balls active
                for (let i = 0; i < 20; i++) {
                    const b = lowerRing[i];
                    layerEl.appendChild(createBallElement(b, LOWER_COORDS[i].x, LOWER_COORDS[i].y));
                }
            }

            // 3. Render Carriage Structure (Clickable to shift between loops)
            const carriageEl = document.createElement("div");
            const carriageY = (platformPos === "upper") ? (CY_TOP + R) : (CY_BOT - R);
            carriageEl.style.cssText = `
                position: absolute;
                left: 222px;
                top: ${carriageY - 20}px;
                width: 76px;
                height: 40px;
                pointer-events: auto;
                cursor: pointer;
                transition: top 0.35s cubic-bezier(0.4, 0, 0.2, 1);
                z-index: 5;
            `;
            carriageEl.title = "Tap to Shift Carriage between Rings";
            carriageEl.onclick = () => toggleCarriage();

            // Tray border, metallic frame, and direction arrow
            carriageEl.innerHTML = `
                <div style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; border-radius: 8px; border: 2px solid #fbbf24; background: rgba(15, 23, 42, 0.9); box-shadow: 0 0 14px rgba(251, 191, 36, 0.45); display: flex; align-items: center; justify-content: space-around; padding: 2px; box-sizing: border-box;">
                    <div style="width: 26px; height: 26px; border-radius: 50%; border: 1.5px dashed rgba(251, 191, 36, 0.5);"></div>
                    <div style="width: 26px; height: 26px; border-radius: 50%; border: 1.5px dashed rgba(251, 191, 36, 0.5);"></div>
                </div>
                <div style="position: absolute; left: 50%; transform: translateX(-50%); ${platformPos === "upper" ? "bottom: -15px;" : "top: -15px;"} color: #fbbf24; font-size: 15px; font-weight: 900; filter: drop-shadow(0 0 6px #fbbf24); pointer-events: none;">
                    ${platformPos === "upper" ? "▼" : "▲"}
                </div>
            `;
            layerEl.appendChild(carriageEl);

            // 4. Render Stopper Block in Inactive Ring (Only lock symbol, middle placed)
            const stopperEl = document.createElement("div");
            const stopperY = (platformPos === "upper") ? (CY_BOT - R) : (CY_TOP + R);
            stopperEl.style.cssText = `
                position: absolute;
                left: 236px;
                top: ${stopperY - 17}px;
                width: 48px;
                height: 34px;
                border-radius: 8px;
                box-sizing: border-box;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                z-index: 8;
                pointer-events: none;
                transition: top 0.35s cubic-bezier(0.4, 0, 0.2, 1);
            `;

            if (platformPos === "upper") {
                stopperEl.style.background = "linear-gradient(180deg, #991b1b, #450a0a)";
                stopperEl.style.border = "2px solid #ef4444";
                stopperEl.style.boxShadow = "0 0 12px rgba(239, 68, 68, 0.55)";
                stopperEl.innerHTML = `🔒`;
            } else {
                stopperEl.style.background = "linear-gradient(180deg, #075985, #082f49)";
                stopperEl.style.border = "2px solid #38bdf8";
                stopperEl.style.boxShadow = "0 0 12px rgba(56, 189, 248, 0.55)";
                stopperEl.innerHTML = `🔒`;
            }
            layerEl.appendChild(stopperEl);

            // 5. Update Center Clockwise Button Lock States
            updateControlsState();
        }

        function updateControlsState() {
            if (platformPos === "upper") {
                btnIceCw.disabled = false;
                btnIceCw.style.opacity = "1";
                btnIceCw.style.cursor = "pointer";
                btnIceCw.style.boxShadow = "0 0 12px rgba(56, 189, 248, 0.55)";

                btnFireCw.disabled = true;
                btnFireCw.style.opacity = "0.2";
                btnFireCw.style.cursor = "not-allowed";
                btnFireCw.style.boxShadow = "none";
            } else {
                btnFireCw.disabled = false;
                btnFireCw.style.opacity = "1";
                btnFireCw.style.cursor = "pointer";
                btnFireCw.style.boxShadow = "0 0 12px rgba(239, 68, 68, 0.55)";

                btnIceCw.disabled = true;
                btnIceCw.style.opacity = "0.2";
                btnIceCw.style.cursor = "not-allowed";
                btnIceCw.style.boxShadow = "none";
            }
        }

        function showMsg(txt, color = "gold") {
            msgEl.innerHTML = `<span style="color: var(--${color});">${txt}</span>`;
            setTimeout(() => {
                if (msgEl.innerHTML.includes(txt)) msgEl.innerHTML = "";
            }, 2400);
        }

        function toggleCarriage() {
            if (platformPos === "upper") {
                // Carry balls at indices 13 & 12 down into lower ring indices 2 & 3
                const platform = [upperRing[13], upperRing[12]];
                upperTrack = upperRing.filter((_, idx) => idx !== 12 && idx !== 13);
                upperRing = null;
                lowerRing = [...lowerTrack.slice(0, 2), platform[0], platform[1], ...lowerTrack.slice(2)];
                lowerTrack = null;
                platformPos = "lower";
            } else {
                // Carry balls at indices 2 & 3 up into upper ring indices 13 & 12
                const platform = [lowerRing[2], lowerRing[3]];
                lowerTrack = lowerRing.filter((_, idx) => idx !== 2 && idx !== 3);
                lowerRing = null;
                upperRing = [...upperTrack.slice(0, 12), platform[1], platform[0], ...upperTrack.slice(12)];
                upperTrack = null;
                platformPos = "upper";
            }
            shell.incrementMoves();
            render();
            checkWin();
        }

        function rotateUpper(dir) {
            if (platformPos !== "upper") {
                showMsg("Upper ring is locked while carriage is in lower ring!", "crimson");
                return;
            }
            if (dir === "cw") {
                upperRing = [upperRing[19], ...upperRing.slice(0, 19)];
            } else {
                upperRing = [...upperRing.slice(1), upperRing[0]];
            }
            shell.incrementMoves();
            render();
            checkWin();
        }

        function rotateLower(dir) {
            if (platformPos !== "lower") {
                showMsg("Lower ring is locked while carriage is in upper ring!", "crimson");
                return;
            }
            if (dir === "cw") {
                lowerRing = [lowerRing[19], ...lowerRing.slice(0, 19)];
            } else {
                lowerRing = [...lowerRing.slice(1), lowerRing[0]];
            }
            shell.incrementMoves();
            render();
            checkWin();
        }

        function checkWin() {
            let uTrack, lTrack, plat;
            if (platformPos === "upper") {
                plat = [upperRing[13], upperRing[12]];
                uTrack = upperRing.filter((_, idx) => idx !== 12 && idx !== 13);
                lTrack = lowerTrack;
            } else {
                plat = [lowerRing[2], lowerRing[3]];
                lTrack = lowerRing.filter((_, idx) => idx !== 2 && idx !== 3);
                uTrack = upperTrack;
            }

            const topAllBlue = uTrack.length === 18 && uTrack.every(b => b === "blue");
            const botAllRed = lTrack.length === 18 && lTrack.every(b => b === "red");
            const platWhite = plat.length === 2 && plat.every(b => b === "white");

            if (topAllBlue && botAllRed && platWhite) {
                msgEl.innerHTML = `<span style="color: var(--emerald); font-weight: 800; font-size: 15px;">✓ Complete! Elemental harmony restored across Ice and Fire!</span>`;
                setTimeout(() => shell.completeLevel(), 900);
                return true;
            }
            return false;
        }

        // Wire Event Listeners (Clockwise only)
        btnIceCw.onclick = () => rotateUpper("cw");
        btnFireCw.onclick = () => rotateLower("cw");

        shell.onReset = () => {
            platformPos = INITIAL_PLATFORM_POS;
            upperRing = [...INITIAL_UPPER_RING];
            lowerTrack = [...INITIAL_LOWER_TRACK];
            upperTrack = null;
            lowerRing = null;
            msgEl.innerHTML = "";
            render();
        };

        render();
    }
};

// ─────────────────────────────────────────────────────────
// LEVEL 37: CIRCULAR SEATING ARRANGEMENT (8 Seats)
// ─────────────────────────────────────────────────────────
window.PuzzleEngines.seatingLogic = {
    init: (container, puzzle, shell) => {
        const names = puzzle.config.names || ["Harvey", "Jennie", "Peter", "Joyce", "Lia", "Rick", "Kenny", "Mark"];

        // 8 seat assignments (0 to 7 corresponding to Seat 1 to Seat 8)
        let seats = Array(8).fill(null);
        let selectedName = null;

        // Seat layout coordinates around table (width: 480, height: 320)
        // Clockwise: 1 (West), 2 (Top-L), 3 (Top-C), 4 (Top-R), 5 (East), 6 (Bot-R), 7 (Bot-C), 8 (Bot-L)
        const SEAT_POSITIONS = [
            { x: 30,  y: 130 }, // Seat 1
            { x: 120, y: 15 },  // Seat 2
            { x: 210, y: 15 },  // Seat 3
            { x: 300, y: 15 },  // Seat 4
            { x: 390, y: 130 }, // Seat 5
            { x: 300, y: 245 }, // Seat 6
            { x: 210, y: 245 }, // Seat 7
            { x: 120, y: 245 }  // Seat 8
        ];

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 580px; margin: 0 auto; gap: 14px;">
                <!-- Clues Box (Exact Problem Statement) -->
                <div style="width: 100%; max-width: 520px; background: rgba(14, 27, 48, 0.9); border: 1px solid var(--panel-border); border-radius: 12px; padding: 14px 18px; font-size: 13px; color: rgba(255,255,255,0.92); line-height: 1.6; box-shadow: 0 4px 16px rgba(0,0,0,0.4); text-align: left; box-sizing: border-box;">
                    <div style="font-weight: 800; font-size: 14px; color: #fff; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                        From the clues given below, can work out where everyone sits?
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px; font-size: 12.5px; color: #e2e8f0;">
                        <div>(1) Harvey has a higher seat number than Jennie.</div>
                        <div>(2) Peter is across from Harvey.</div>
                        <div>(3) Neither Joyce nor Lia is in seat 8.</div>
                        <div>(4) Rick is across from Kenny, and Rick is also next to Joyce.</div>
                        <div>(5) Lia is next to Kenny.</div>
                        <div>(6) Jennie is at Seat 4 and next to Harvey.</div>
                        <div>(7) Peter is next to Lia.</div>
                        <div>(8) Mark has the remaining seat.</div>
                    </div>
                </div>

                <!-- Table Arena with Mobile Scroll Safety -->
                <div class="pq-maze-scroll-wrap" style="width: 100%; max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; box-sizing: border-box; text-align: center; padding: 4px;">
                    <div style="display: inline-block; min-width: 480px; text-align: left; margin: 0 auto;">
                        <div style="position: relative; width: 480px; height: 320px; background: #06111f; border: 2px solid var(--panel-border); border-radius: 16px; box-shadow: inset 0 0 40px rgba(0,0,0,0.85); overflow: hidden; user-select: none;">
                            <!-- Central Wooden Dining Table -->
                            <div style="position: absolute; left: 110px; top: 95px; width: 260px; height: 130px; background: linear-gradient(180deg, #381a08 0%, #200e04 100%); border: 3px solid #78350f; border-radius: 20px; box-shadow: inset 0 0 25px rgba(0,0,0,0.8), 0 8px 24px rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center;">
                                <div style="font-size: 28px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">🍽️</div>
                            </div>

                            <!-- 8 Circular Chairs -->
                            ${SEAT_POSITIONS.map((pos, idx) => `
                                <button class="pq-seat-slot" data-seat="${idx}" type="button" style="position: absolute; left: ${pos.x}px; top: ${pos.y}px; width: 60px; height: 60px; border-radius: 50%; background: #0c1a30; border: 2px solid var(--panel-border); color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.5); padding: 0;">
                                    <span style="font-size: 10px; font-weight: 900; color: var(--gold); line-height: 1;">#${idx + 1}</span>
                                    <span class="pq-seat-name" style="font-size: 11px; font-weight: 800; color: rgba(255,255,255,0.4); max-width: 52px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px;">Empty</span>
                                </button>
                            `).join("")}
                        </div>
                    </div>
                </div>

                <!-- Guest Selection Bank -->
                <div style="display: flex; flex-direction: column; align-items: center; gap: 10px; width: 100%; max-width: 520px;">
                    <div id="pq-guest-chips-container" style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; width: 100%;"></div>

                    <div style="display: flex; gap: 12px; justify-content: center; margin-top: 4px;">
                        <button id="pq-seating-reset" class="pq-hud-btn" type="button" style="padding: 7px 16px; font-size: 12px; font-weight: 800; color: var(--crimson); border-color: rgba(239, 68, 68, 0.4);">
                            ↺ RESET SEATS
                        </button>
                        <button id="pq-seating-check" class="pq-btn pq-btn-gold" type="button" style="padding: 7px 24px; font-size: 13px; font-weight: 900;">
                            VERIFY SEATING ▶
                        </button>
                    </div>
                </div>

                <div id="pq-seating-msg" style="min-height: 22px; font-size: 13px; font-weight: 700; text-align: center;"></div>
            </div>
        `;

        const msgEl = container.querySelector("#pq-seating-msg");
        const chipsContainer = container.querySelector("#pq-guest-chips-container");

        function renderChips() {
            chipsContainer.innerHTML = names.map(name => {
                const isPlaced = seats.includes(name);
                const isSelected = selectedName === name;
                return `
                    <button class="pq-hud-btn pq-name-chip" data-name="${name}" type="button" style="padding: 6px 14px; font-size: 12px; font-weight: 800; border-radius: 8px; transition: all 0.15s ease; ${isPlaced ? 'opacity: 0.45; text-decoration: line-through; border-color: rgba(255,255,255,0.15);' : ''} ${isSelected ? 'border-color: var(--gold); color: var(--gold); box-shadow: 0 0 10px rgba(251, 191, 36, 0.5); transform: translateY(-1px);' : ''}">
                        ${name}
                    </button>
                `;
            }).join("");

            chipsContainer.querySelectorAll(".pq-name-chip").forEach(chip => {
                chip.onclick = () => {
                    const n = chip.dataset.name;
                    if (selectedName === n) {
                        selectedName = null;
                    } else {
                        selectedName = n;
                    }
                    renderChips();
                };
            });
        }

        function renderSeats() {
            container.querySelectorAll(".pq-seat-slot").forEach(slot => {
                const seatIdx = Number(slot.dataset.seat);
                const assigned = seats[seatIdx];
                const label = slot.querySelector(".pq-seat-name");
                if (assigned) {
                    label.textContent = assigned;
                    label.style.color = "#ffffff";
                    slot.style.background = "rgba(8, 47, 73, 0.9)";
                    slot.style.borderColor = "var(--cyan)";
                    slot.style.boxShadow = "0 0 12px rgba(56, 189, 248, 0.45)";
                } else {
                    label.textContent = "Empty";
                    label.style.color = "rgba(255,255,255,0.4)";
                    slot.style.background = "#0c1a30";
                    slot.style.borderColor = "var(--panel-border)";
                    slot.style.boxShadow = "0 4px 12px rgba(0,0,0,0.5)";
                }
            });
            renderChips();
        }

        container.querySelectorAll(".pq-seat-slot").forEach(slot => {
            slot.onclick = () => {
                const seatIdx = Number(slot.dataset.seat);
                if (selectedName) {
                    // Place selected guest in this seat (replaces whoever is there)
                    seats = seats.map(s => s === selectedName ? null : s);
                    seats[seatIdx] = selectedName;
                    selectedName = null;
                    shell.incrementMoves();
                    renderSeats();
                } else if (seats[seatIdx]) {
                    // Clicking occupied seat unseats the guest
                    seats[seatIdx] = null;
                    shell.incrementMoves();
                    renderSeats();
                }
            };
        });

        container.querySelector("#pq-seating-reset").onclick = () => {
            seats = Array(8).fill(null);
            selectedName = null;
            msgEl.innerHTML = "";
            renderSeats();
        };

        container.querySelector("#pq-seating-check").onclick = () => {
            if (seats.some(s => s === null)) {
                msgEl.innerHTML = `<span style="color: var(--crimson);">All 8 seats must be assigned!</span>`;
                return;
            }

            const seatOf = (person) => seats.indexOf(person) + 1; // 1 to 8
            const harvey = seatOf("Harvey");
            const jennie = seatOf("Jennie");
            const peter = seatOf("Peter");
            const joyce = seatOf("Joyce");
            const lia = seatOf("Lia");
            const rick = seatOf("Rick");
            const kenny = seatOf("Kenny");
            const mark = seatOf("Mark");

            const isNextTo = (s1, s2) => {
                const diff = Math.abs(s1 - s2);
                return diff === 1 || diff === 7;
            };

            const isAcross = (s1, s2) => {
                const min = Math.min(s1, s2);
                const max = Math.max(s1, s2);
                return (
                    (min === 1 && max === 5) ||
                    (min === 2 && max === 8) ||
                    (min === 3 && max === 7) ||
                    (min === 4 && max === 6)
                );
            };

            // Check all 8 deductive clues
            const c1 = harvey > jennie;
            const c2 = isAcross(peter, harvey);
            const c3 = joyce !== 8 && lia !== 8;
            const c4 = isAcross(rick, kenny) && isNextTo(rick, joyce);
            const c5 = isNextTo(lia, kenny);
            const c6 = jennie === 4 && isNextTo(jennie, harvey);
            const c7 = isNextTo(peter, lia);
            const c8 = mark >= 1 && mark <= 8;

            if (c1 && c2 && c3 && c4 && c5 && c6 && c7 && c8) {
                msgEl.innerHTML = `<span style="color: var(--emerald); font-weight: 800; font-size: 14px;">✓ Complete! Perfect table seating deduction!</span>`;
                setTimeout(() => shell.completeLevel(), 900);
            } else {
                msgEl.innerHTML = `<span style="color: var(--crimson);">Seating violates one or more clues! Re-check opposite and adjacent conditions.</span>`;
            }
        };

        shell.onReset = () => {
            seats = Array(8).fill(null);
            selectedName = null;
            if (msgEl) msgEl.innerHTML = "";
            renderSeats();
        };

        renderSeats();
    }
};

// ─────────────────────────────────────────────────────────
// LEVEL 39 & 49: SLIDING NUMBERS (4×4 & 5×5)
// ─────────────────────────────────────────────────────────
window.PuzzleEngines.slidingTile = {
    init: (container, puzzle, shell) => {
        const size = puzzle.config.gridSize || 4;
        let board = [];

        if (puzzle.config.initialBoard) {
            board = puzzle.config.initialBoard.map(row => [...row]);
        } else {
            // Generate solvable scrambled board for 4x4
            let flat = Array.from({ length: size * size - 1 }, (_, i) => i + 1);
            flat.push(null);
            // Simple solvable shuffle
            board = [];
            for (let r = 0; r < size; r++) {
                board.push(flat.slice(r * size, (r + 1) * size));
            }
            // Perform random valid slides to guarantee solvability
            for (let i = 0; i < 40; i++) {
                // Find null
                let nr = 0, nc = 0;
                for (let r = 0; r < size; r++) {
                    for (let c = 0; c < size; c++) {
                        if (board[r][c] === null) { nr = r; nc = c; }
                    }
                }
                const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                const validDirs = dirs.filter(([dr, dc]) => nr + dr >= 0 && nr + dr < size && nc + dc >= 0 && nc + dc < size);
                const [dr, dc] = validDirs[Math.floor(Math.random() * validDirs.length)];
                board[nr][nc] = board[nr + dr][nc + dc];
                board[nr + dr][nc + dc] = null;
            }
        }

        const titleHtml = (size === 4) ? "" : `
                <div style="font-size: 13px; font-weight: 800; color: var(--gold); text-align: center;">
                    ${size}×${size} SLIDING NUMBERS
                </div>
        `;

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 500px; margin: 0 auto; gap: 14px;">
                ${titleHtml}
                <p style="font-size: 12px; color: rgba(255,255,255,0.75); margin: 0; text-align: center;">
                    Slide tiles into ascending order (1 to ${size * size - 1}) with empty space at bottom-right.
                </p>

                <!-- Board Grid -->
                <div id="pq-sliding-grid" style="display: grid; grid-template-columns: repeat(${size}, 1fr); gap: 6px; width: ${size * 64}px; height: ${size * 64}px; max-width: 100%; aspect-ratio: 1; background: #0c182b; border: 2px solid var(--panel-border); border-radius: 12px; padding: 8px; box-sizing: border-box;"></div>

                <div id="pq-sliding-msg" style="min-height: 22px; font-size: 13px; font-weight: 700; text-align: center;"></div>
            </div>
        `;

        const gridEl = container.querySelector("#pq-sliding-grid");
        const msgEl = container.querySelector("#pq-sliding-msg");

        function renderBoard() {
            gridEl.innerHTML = "";
            for (let r = 0; r < size; r++) {
                for (let c = 0; c < size; c++) {
                    const val = board[r][c];
                    const tile = document.createElement("button");
                    tile.className = "pq-slide-tile";

                    if (val === null) {
                        tile.style.cssText = `
                            background: transparent; border: none; cursor: default;
                        `;
                    } else {
                        tile.style.cssText = `
                            background: linear-gradient(135deg, #1e3a5f, #0f2442);
                            border: 2px solid var(--cyan); border-radius: 8px;
                            color: #ffffff; font-weight: 900; font-size: ${size === 5 ? "16px" : "18px"};
                            display: flex; align-items: center; justify-content: center;
                            cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                            transition: transform 0.1s ease;
                        `;
                        tile.textContent = val;
                        tile.onclick = () => trySlide(r, c);
                    }
                    gridEl.appendChild(tile);
                }
            }
        }

        function trySlide(r, c) {
            const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            for (const [dr, dc] of dirs) {
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === null) {
                    board[nr][nc] = board[r][c];
                    board[r][c] = null;
                    shell.incrementMoves();
                    renderBoard();
                    checkWin();
                    return;
                }
            }
        }

        function checkWin() {
            let expected = 1;
            for (let r = 0; r < size; r++) {
                for (let c = 0; c < size; c++) {
                    if (r === size - 1 && c === size - 1) {
                        if (board[r][c] !== null) return false;
                    } else {
                        if (board[r][c] !== expected) return false;
                        expected++;
                    }
                }
            }
            msgEl.innerHTML = `<span style="color: var(--emerald);">✓ Complete! All tiles sorted in order!</span>`;
            setTimeout(() => shell.completeLevel(), 900);
            return true;
        }

        renderBoard();
    }
};

// ─────────────────────────────────────────────────────────
// LEVEL 40: ARCHAEOLOGICAL WORD SEARCH (62240.jpg)
// ─────────────────────────────────────────────────────────
window.PuzzleEngines.wordSearch = {
    init: (container, puzzle, shell) => {
        const rawGrid = [
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
            "IEAARTRTIRTETEIARTIRE",
            "ETRRAATIIRIEIRRETRIRA",
            "RERETTITERTEIEEIAEETI",
            "IEAAAEERTAEEEEEARREAA",
            "EEREERARAIRTTRRAAIITR",
            "RRTRITEIRRERRRIIRRIAE",
            "EAIEEARREIRRETATEIEET",
            "EEIEIIETARAEARITTATRR",
            "IRERETEETIARTIARTATRA",
            "TETRRTIRAEIEEAIERREET"
        ];

        const targetWords = puzzle.config.words || [
            "arrear", "rarer", "rearer", "airier", "eerie",
            "reiterate", "irritate", "terraria", "attire", "retreat",
            "aerate", "errata", "tiara", "trait", "retiree", "terrier"
        ];

        const foundWords = new Set();
        const glowingCells = new Set();
        let glowingTimer = null;
        let selectedStart = null;

        function findWordCoordinates(word) {
            const w = word.toUpperCase();
            const dirs = [
                [0, 1], [0, -1], [1, 0], [-1, 0],
                [1, 1], [1, -1], [-1, 1], [-1, -1]
            ];
            for (let r = 0; r < rawGrid.length; r++) {
                for (let c = 0; c < rawGrid[r].length; c++) {
                    for (const [dr, dc] of dirs) {
                        let match = true;
                        const coords = [];
                        for (let i = 0; i < w.length; i++) {
                            const nr = r + dr * i;
                            const nc = c + dc * i;
                            if (nr < 0 || nr >= rawGrid.length || nc < 0 || nc >= rawGrid[r].length || rawGrid[nr][nc] !== w[i]) {
                                match = false;
                                break;
                            }
                            coords.push({ r: nr, c: nc });
                        }
                        if (match) {
                            return coords;
                        }
                    }
                }
            }
            return null;
        }

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 680px; margin: 0 auto; gap: 12px;">
                <div style="font-size: 14px; font-weight: 800; color: var(--gold); text-align: center; letter-spacing: 0.8px;">
                    WORD SEARCH
                </div>
                <div style="font-size: 11px; color: var(--cyan); text-align: center;">
                    Words can be horizontal, vertical, or diagonal in forwards or reverse order.
                </div>

                <div style="display: flex; gap: 16px; width: 100%; flex-wrap: wrap; justify-content: center; align-items: flex-start;">
                    <!-- Grid Column with message directly below -->
                    <div style="display: flex; flex-direction: column; align-items: center; max-width: 100%;">
                        <!-- 20x21 Grid with horizontal scroll wrap on mobile, border enclosing all 20 rows and 21 columns -->
                        <div class="pq-ws-scroll-wrapper" style="width: 100%; max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; padding: 4px 0 6px; box-sizing: border-box;">
                            <div style="display: flex; justify-content: center; min-width: 100%; width: max-content; padding: 0 4px; box-sizing: border-box;">
                                <div id="pq-ws-grid" style="display: grid; grid-template-columns: repeat(21, 18px); grid-template-rows: repeat(20, 18px); gap: 2px; background: #071529; padding: 6px; border: 2px solid var(--panel-border); border-radius: 8px; width: max-content; box-sizing: border-box; font-family: monospace; font-size: 11px; font-weight: bold; user-select: none;"></div>
                            </div>
                        </div>
                        <div id="pq-ws-msg" style="min-height: 24px; font-size: 13px; font-weight: 700; text-align: center; margin-top: 6px; width: 100%;"></div>
                    </div>

                    <!-- Target Words Checklist -->
                    <div style="flex: 1; min-width: 180px; max-width: 220px; background: rgba(14, 27, 48, 0.7); border: 1px solid var(--panel-border); border-radius: 8px; padding: 10px; font-size: 11px;">
                        <div style="font-weight: 800; color: var(--gold); margin-bottom: 6px;">TARGET WORDS (<span id="pq-ws-found-count">0</span> / ${targetWords.length})</div>
                        <div id="pq-ws-wordlist" style="display: flex; flex-direction: column; gap: 4px; max-height: 340px; overflow-y: auto;">
                            ${targetWords.map(w => `
                                <div class="pq-ws-item" data-word="${w.toLowerCase()}" style="color: rgba(255,255,255,0.7); display: flex; align-items: center; gap: 4px;">
                                    <span>○</span> ${w.toUpperCase()}
                                </div>
                            `).join("")}
                        </div>
                    </div>
                </div>
            </div>
        `;

        const gridEl = container.querySelector("#pq-ws-grid");
        const msgEl = container.querySelector("#pq-ws-msg");
        const foundCountEl = container.querySelector("#pq-ws-found-count");

        function renderGrid() {
            gridEl.innerHTML = "";
            for (let r = 0; r < rawGrid.length; r++) {
                for (let c = 0; c < rawGrid[r].length; c++) {
                    const char = rawGrid[r][c];
                    const cell = document.createElement("div");
                    cell.className = "pq-ws-cell";
                    const key = `${r},${c}`;
                    const isSelected = selectedStart && selectedStart.r === r && selectedStart.c === c;
                    const isGlowing = glowingCells.has(key);

                    cell.style.width = "18px";
                    cell.style.height = "18px";
                    cell.style.lineHeight = "18px";
                    cell.style.fontSize = "11px";
                    cell.style.boxSizing = "border-box";
                    cell.style.display = "flex";
                    cell.style.alignItems = "center";
                    cell.style.justifyContent = "center";
                    cell.style.borderRadius = "3px";
                    cell.style.cursor = "pointer";

                    if (isGlowing) {
                        cell.classList.add("glowing");
                    } else if (isSelected) {
                        cell.style.background = "var(--gold)";
                        cell.style.color = "#000";
                        cell.style.fontWeight = "900";
                        cell.style.boxShadow = "0 0 10px var(--gold-glow)";
                    } else {
                        cell.style.background = "rgba(255,255,255,0.03)";
                        cell.style.color = "#cbd5e1";
                        cell.style.transition = "background 0.1s ease";
                    }
                    cell.textContent = char;

                    cell.onclick = () => onCellClick(r, c);
                    gridEl.appendChild(cell);
                }
            }
        }

        function onCellClick(r, c) {
            if (!selectedStart) {
                selectedStart = { r, c };
                renderGrid();
            } else {
                const start = selectedStart;
                const end = { r, c };
                selectedStart = null;

                // Check straight line in 8 directions
                const dr = Math.sign(end.r - start.r);
                const dc = Math.sign(end.c - start.c);
                const lenR = Math.abs(end.r - start.r);
                const lenC = Math.abs(end.c - start.c);

                if (lenR !== 0 && lenC !== 0 && lenR !== lenC) {
                    msgEl.innerHTML = `<span style="color: var(--crimson);">Selection must be horizontal, vertical, or diagonal!</span>`;
                    renderGrid();
                    return;
                }

                const length = Math.max(lenR, lenC) + 1;
                let word = "";
                for (let i = 0; i < length; i++) {
                    const cr = start.r + dr * i;
                    const cc = start.c + dc * i;
                    word += rawGrid[cr][cc];
                }

                const match = targetWords.find(w => w.toUpperCase() === word || w.toUpperCase() === word.split("").reverse().join(""));
                if (match && !foundWords.has(match.toLowerCase())) {
                    foundWords.add(match.toLowerCase());
                    shell.incrementMoves();
                    foundCountEl.textContent = foundWords.size;

                    // Do not show green markings inside grid (words are struck off in checklist)
                    const item = container.querySelector(`.pq-ws-item[data-word="${match.toLowerCase()}"]`);
                    if (item) {
                        item.style.color = "var(--emerald)";
                        item.style.textDecoration = "line-through";
                        item.querySelector("span").textContent = "✓";
                    }

                    msgEl.innerHTML = `<span style="color: var(--emerald);">Found "${match.toUpperCase()}"!</span>`;
                    renderGrid();

                    if (foundWords.size === targetWords.length) {
                        msgEl.innerHTML = `<span style="color: var(--emerald);">✓ ALL 16 WORDS DISCOVERED! Master Archaeologist!</span>`;
                        setTimeout(() => shell.completeLevel(), 900);
                    }
                } else if (match && foundWords.has(match.toLowerCase())) {
                    msgEl.innerHTML = `<span style="color: var(--gold);">Already found "${match.toUpperCase()}"!</span>`;
                    renderGrid();
                } else {
                    msgEl.innerHTML = `<span style="color: var(--crimson);">No target word matches "${word}".</span>`;
                    renderGrid();
                }
            }
        }

        // Hint hook:
        // "after user click got it after hint's use, glow a word which is not found by user and then cut it out of the target words list. Glow it for 5 seconds."
        shell.onHintDismissed = () => {
            const unfound = targetWords.filter(w => !foundWords.has(w.toLowerCase()));
            if (unfound.length === 0) return;

            const wordToReveal = unfound[0];
            const coords = findWordCoordinates(wordToReveal);
            if (!coords) return;

            // Cut it out of the target words list & mark as found
            foundWords.add(wordToReveal.toLowerCase());
            foundCountEl.textContent = foundWords.size;

            const item = container.querySelector(`.pq-ws-item[data-word="${wordToReveal.toLowerCase()}"]`);
            if (item) {
                item.style.color = "var(--emerald)";
                item.style.textDecoration = "line-through";
                item.querySelector("span").textContent = "✓";
            }

            // Glow the revealed word on the grid for 5 seconds (no permanent green markings)
            glowingCells.clear();
            for (const pt of coords) {
                glowingCells.add(`${pt.r},${pt.c}`);
            }

            msgEl.innerHTML = `<span style="color: var(--gold);">Hint Revealed: "${wordToReveal.toUpperCase()}"!</span>`;
            renderGrid();

            if (glowingTimer) clearTimeout(glowingTimer);
            glowingTimer = setTimeout(() => {
                glowingCells.clear();
                renderGrid();
            }, 5000);

            if (foundWords.size === targetWords.length) {
                msgEl.innerHTML = `<span style="color: var(--emerald);">✓ ALL 16 WORDS DISCOVERED! Master Archaeologist!</span>`;
                setTimeout(() => shell.completeLevel(), 1200);
            }
        };

        shell.onReset = () => {
            if (glowingTimer) clearTimeout(glowingTimer);
            window.PuzzleEngines.wordSearch.init(container, puzzle, shell);
        };
        shell.cleanup = () => {
            if (glowingTimer) clearTimeout(glowingTimer);
        };

        renderGrid();
    }
};

// ─────────────────────────────────────────────────────────
// LEVEL 43: EIGHT QUEENS DOMINATION (Total Board Coverage)
// ─────────────────────────────────────────────────────────
window.PuzzleEngines.queensDomination = {
    init: (container, puzzle, shell) => {
        const boardSize = 8;
        let queens = [];

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 520px; margin: 0 auto; gap: 14px;">
                <div style="display: flex; justify-content: space-between; width: 100%; max-width: 360px; font-size: 13px; font-weight: 800; color: var(--cyan); background: rgba(0,0,0,0.3); padding: 8px 14px; border-radius: 8px; border: 1px solid var(--panel-border);">
                    <span>Queens Placed: <strong id="pq-dom-queens" style="color: #fff;">0 / 8</strong></span>
                    <span>Squares Covered: <strong id="pq-dom-covered" style="color: var(--gold);">0 / 64</strong></span>
                </div>

                <!-- 8x8 Chessboard -->
                <div id="pq-dom-board" class="pq-chess-board" style="width: 340px; height: 340px;"></div>

                <div style="display: flex; gap: 10px;">
                    <button id="pq-dom-clear" class="pq-hud-btn" type="button">CLEAR BOARD</button>
                    <button id="pq-dom-submit" class="pq-btn pq-btn-gold" type="button">SUBMIT COVERAGE</button>
                </div>
                <div id="pq-dom-msg" style="min-height: 22px; font-size: 13px; font-weight: 700; text-align: center;"></div>
            </div>
        `;

        const boardEl = container.querySelector("#pq-dom-board");
        const queensEl = container.querySelector("#pq-dom-queens");
        const coveredEl = container.querySelector("#pq-dom-covered");
        const msgEl = container.querySelector("#pq-dom-msg");

        function getAttackingQueenIndices() {
            const attacking = new Set();
            for (let i = 0; i < queens.length; i++) {
                for (let j = i + 1; j < queens.length; j++) {
                    const [r1, c1] = queens[i];
                    const [r2, c2] = queens[j];
                    if (r1 === r2 || c1 === c2 || Math.abs(r1 - r2) === Math.abs(c1 - c2)) {
                        attacking.add(i);
                        attacking.add(j);
                    }
                }
            }
            return attacking;
        }

        function calculateCoverage() {
            const covered = Array.from({ length: 8 }, () => Array(8).fill(false));
            for (const [qr, qc] of queens) {
                for (let r = 0; r < 8; r++) {
                    for (let c = 0; c < 8; c++) {
                        if (r === qr || c === qc || Math.abs(r - qr) === Math.abs(c - qc)) {
                            covered[r][c] = true;
                        }
                    }
                }
            }

            let count = 0;
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    if (covered[r][c]) count++;
                }
            }
            return { covered, count };
        }

        function renderBoard() {
            boardEl.innerHTML = "";
            const { covered, count } = calculateCoverage();
            const attackingIndices = getAttackingQueenIndices();

            queensEl.textContent = `${queens.length} / 8`;
            coveredEl.textContent = `${count} / 64`;

            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const queenIdx = queens.findIndex(([qr, qc]) => qr === r && qc === c);
                    const isQueen = queenIdx !== -1;
                    const isAttacking = isQueen && attackingIndices.has(queenIdx);
                    const isCovered = covered[r][c];
                    const isLight = (r + c) % 2 === 0;

                    const cell = document.createElement("div");
                    cell.className = `pq-chess-cell ${isLight ? "light" : "dark"}`;
                    cell.style.position = "relative";
                    cell.style.cursor = "pointer";

                    if (isCovered && !isQueen) {
                        cell.style.boxShadow = "inset 0 0 10px rgba(56, 189, 248, 0.4)";
                    }

                    if (isQueen) {
                        cell.innerHTML = "♛";
                        cell.style.fontSize = "26px";
                        if (isAttacking) {
                            cell.style.color = "#ef4444";
                            cell.style.textShadow = "0 0 10px rgba(239, 68, 68, 0.9)";
                            cell.style.background = "rgba(239, 68, 68, 0.35)";
                        } else {
                            cell.style.color = "var(--gold)";
                            cell.style.textShadow = "0 0 10px var(--gold)";
                        }
                    }

                    cell.onclick = () => {
                        const existingIdx = queens.findIndex(([qr, qc]) => qr === r && qc === c);
                        if (existingIdx !== -1) {
                            queens.splice(existingIdx, 1);
                            shell.incrementMoves();
                            msgEl.innerHTML = "";
                        } else if (queens.length < 8) {
                            queens.push([r, c]);
                            shell.incrementMoves();
                            msgEl.innerHTML = "";
                        } else {
                            msgEl.innerHTML = `<span style="color: var(--crimson);">Maximum 8 queens allowed! Tap a queen to remove it.</span>`;
                            return;
                        }
                        renderBoard();
                    };

                    boardEl.appendChild(cell);
                }
            }
        }

        renderBoard();

        container.querySelector("#pq-dom-clear").onclick = () => {
            queens = [];
            msgEl.innerHTML = "";
            renderBoard();
        };

        container.querySelector("#pq-dom-submit").onclick = () => {
            const { count } = calculateCoverage();
            const attackingIndices = getAttackingQueenIndices();

            if (queens.length !== 8) {
                msgEl.innerHTML = `<span style="color: var(--crimson);">You must place exactly 8 Queens (currently ${queens.length})!</span>`;
            } else if (attackingIndices.size > 0) {
                msgEl.innerHTML = `<span style="color: var(--crimson);">Queens are attacking each other! Queens are not allowed to attack each other.</span>`;
            } else if (count !== 64) {
                msgEl.innerHTML = `<span style="color: var(--crimson);">Only ${count} / 64 squares are covered. ${64 - count} squares remain unattacked!</span>`;
            } else {
                msgEl.innerHTML = `<span style="color: var(--emerald);">✓ Complete! All 64 squares dominated with 8 non-attacking queens!</span>`;
                setTimeout(() => shell.completeLevel(), 900);
            }
        };
    }
};

// ─────────────────────────────────────────────────────────
// LEVEL 50: KNIGHT'S TOUR (64 Squares from A1)
// ─────────────────────────────────────────────────────────
window.PuzzleEngines.knightsTour = {
    init: (container, puzzle, shell) => {
        // Path of visited squares: array of [r, c]
        // Start at A1: row 7, col 0 (or row 0, col 0)
        let visitedPath = [[7, 0]];
        let showHints = false;

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 520px; margin: 0 auto; gap: 14px;">
                <div style="font-size: 13px; font-weight: 800; color: var(--gold); text-align: center;">
                    GUIDE THE KNIGHT TO VISIT ALL 64 SQUARES
                </div>

                <div style="display: flex; justify-content: center; width: 100%; max-width: 360px; font-size: 13px; font-weight: 800; color: var(--cyan); background: rgba(0,0,0,0.3); padding: 8px 14px; border-radius: 8px; border: 1px solid var(--panel-border);">
                    <span>Squares Visited: <strong id="pq-tour-count" style="color: #fff;">1 / 64</strong></span>
                </div>

                <!-- 8x8 Chessboard -->
                <div id="pq-tour-board" class="pq-chess-board" style="width: 340px; height: 340px;"></div>

                <div style="display: flex; gap: 10px;">
                    <button id="pq-tour-reset" class="pq-hud-btn" type="button">Restart from a1</button>
                </div>
                <div id="pq-tour-msg" style="min-height: 22px; font-size: 13px; font-weight: 700; text-align: center;"></div>
            </div>
        `;

        const boardEl = container.querySelector("#pq-tour-board");
        const countEl = container.querySelector("#pq-tour-count");
        const msgEl = container.querySelector("#pq-tour-msg");

        const knightMoves = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];

        function isVisited(r, c) {
            return visitedPath.some(([vr, vc]) => vr === r && vc === c);
        }

        function getValidMoves(r, c) {
            return knightMoves
                .map(([dr, dc]) => [r + dr, c + dc])
                .filter(([nr, nc]) => nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !isVisited(nr, nc));
        }

        function renderBoard() {
            boardEl.innerHTML = "";
            countEl.textContent = `${visitedPath.length} / 64`;

            const [curR, curC] = visitedPath[visitedPath.length - 1];
            const validNextMoves = getValidMoves(curR, curC);

            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const isCur = r === curR && c === curC;
                    const pathIdx = visitedPath.findIndex(([vr, vc]) => vr === r && vc === c);
                    const isValidNext = validNextMoves.some(([nr, nc]) => nr === r && nc === c);
                    const isLight = (r + c) % 2 === 0;

                    const cell = document.createElement("div");
                    cell.className = `pq-chess-cell ${isLight ? "light" : "dark"}`;
                    cell.style.position = "relative";
                    cell.style.fontSize = "12px";
                    cell.style.fontWeight = "bold";

                    if (isCur) {
                        cell.innerHTML = "♞";
                        cell.style.color = "var(--gold)";
                        cell.style.fontSize = "26px";
                        cell.style.background = "rgba(234, 179, 8, 0.4)";
                    } else if (pathIdx !== -1) {
                        cell.textContent = pathIdx + 1;
                        cell.style.color = "var(--cyan)";
                        cell.style.background = "rgba(56, 189, 248, 0.15)";
                    } else if (isValidNext) {
                        cell.style.cursor = "pointer";
                        cell.style.background = "rgba(16, 185, 129, 0.25)";
                        cell.style.boxShadow = "inset 0 0 10px rgba(16, 185, 129, 0.6)";

                        if (showHints) {
                            // Warnsdorff heuristic degree (number of onward moves)
                            const onwards = getValidMoves(r, c).length;
                            cell.textContent = onwards;
                            cell.style.color = "#34d399";
                        }

                        cell.onclick = () => {
                            visitedPath.push([r, c]);
                            shell.incrementMoves();
                            renderBoard();

                            if (visitedPath.length === 64) {
                                msgEl.innerHTML = `<span style="color: var(--emerald);">✓ ULTIMATE TRIUMPH! 64-SQUARE KNIGHT'S TOUR COMPLETED!</span>`;
                                setTimeout(() => shell.completeLevel(), 1200);
                            } else if (getValidMoves(r, c).length === 0) {
                                msgEl.innerHTML = `<span style="color: var(--crimson);">Knight is trapped! Restart from a1 to try a new path.</span>`;
                            }
                        };
                    }

                    boardEl.appendChild(cell);
                }
            }
        }

        const tourResetBtn = container.querySelector("#pq-tour-reset");
        if (tourResetBtn) {
            tourResetBtn.onclick = () => {
                visitedPath = [[7, 0]];
                msgEl.innerHTML = "";
                renderBoard();
            };
        }

        shell.onReset = () => {
            visitedPath = [[7, 0]];
            if (msgEl) msgEl.innerHTML = "";
            renderBoard();
        };

        renderBoard();
    }
};

