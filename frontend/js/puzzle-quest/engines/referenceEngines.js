"use strict";

/**
 * ENGINES FOR REFERENCE-BASED PUZZLES (Levels 16–23)
 * - Level 16: Butterfly Bucket Sort (62226.jpg)
 * - Level 17: Symbol Tile Sort (62231.jpg)
 * - Level 18: Eight-Cell Number Placement
 * - Level 19: Rotating Tiles (62225.jpg)
 * - Level 20: Number Average Wheel (62230.jpg)
 * - Level 21: Column Shuffle (62229.jpg)
 * - Level 22: Mask Logic Grid (62233.jpg)
 * - Level 23: Triangle Mosaic (62234.jpg)
 */

window.PuzzleEngines = window.PuzzleEngines || {};

// ─────────────────────────────────────────────────────────
// LEVEL 16: BUTTERFLY BUCKET SORT (62226.jpg)
// ─────────────────────────────────────────────────────────
window.PuzzleEngines.butterflySort = {
    init: (container, puzzle, shell) => {
        // Butterfly metadata:
        // Starting order in Row 0 at odd cols:
        // Col 1: Pink ('P'), Col 3: Dark Green ('G'), Col 5: Blue ('B'), Col 7: Red ('R'), Col 9: Light Green ('L')
        const BUTTERFLIES = {
            "P": { name: "Pink Butterfly", color: "#ec4899", targetCol: 3, basketKey: "pink", icon: "🦋" },
            "G": { name: "Dark Green Butterfly", color: "#16a34a", targetCol: 1, basketKey: "dark_green", icon: "🦋" },
            "B": { name: "Blue Butterfly", color: "#3b82f6", targetCol: 7, basketKey: "blue", icon: "🦋" },
            "R": { name: "Red Butterfly", color: "#ef4444", targetCol: 9, basketKey: "red", icon: "🦋" },
            "L": { name: "Light Green Butterfly", color: "#84cc16", targetCol: 5, basketKey: "light_green", icon: "🦋" }
        };

        // Baskets at bottom row (cols 0..10):
        // Col 1: Dark Green, Col 3: Pink, Col 5: Light Green, Col 7: Blue, Col 9: Red.
        // Even cols are floor/hazard.
        const BASKETS = {
            1: { key: "dark_green", color: "#16a34a", label: "Dark Green", icon: "🧺" },
            3: { key: "pink", color: "#ec4899", label: "Pink", icon: "🧺" },
            5: { key: "light_green", color: "#84cc16", label: "Light Green", icon: "🧺" },
            7: { key: "blue", color: "#3b82f6", label: "Blue", icon: "🧺" },
            9: { key: "red", color: "#ef4444", label: "Red", icon: "🧺" }
        };

        let grid = [];
        let basketsCaught = {};
        let isAnimating = false;
        let isFinished = false;

        function getFreshLayout() {
            const r0 = "EBEBSBEBSBE".split("");
            r0[1] = "P";
            r0[3] = "G";
            r0[5] = "B";
            r0[7] = "R";
            r0[9] = "L";

            return [
                r0,
                "SSESSSESESE".split(""),
                "EESESEESSEE".split(""),
                "ESESEESSESE".split(""),
                "EESESSESSES".split("")
            ];
        }

        function resetState() {
            grid = getFreshLayout();
            basketsCaught = {
                pink: false,
                dark_green: false,
                light_green: false,
                blue: false,
                red: false
            };
            isAnimating = false;
            isFinished = false;
            render();
        }

        function canShift(r, dir) {
            if (isAnimating || isFinished) return false;
            if (dir === -1) {
                return grid[r][0] === "E";
            } else if (dir === 1) {
                return grid[r][10] === "E";
            }
            return false;
        }

        function shiftRow(r, dir) {
            if (!canShift(r, dir)) return;
            const row = grid[r];
            if (dir === -1) {
                for (let c = 0; c < 10; c++) {
                    row[c] = row[c + 1];
                }
                row[10] = "E";
            } else {
                for (let c = 10; c > 0; c--) {
                    row[c] = row[c - 1];
                }
                row[0] = "E";
            }

            shell.incrementMoves();
            render();
            checkAndApplyGravity();
        }

        function checkAndApplyGravity() {
            // Check if any butterfly has an empty space below it
            let willDrop = false;
            for (let r = 4; r >= 0; r--) {
                for (let c = 0; c < 11; c++) {
                    const item = grid[r][c];
                    if (BUTTERFLIES[item]) {
                        if (r === 4) {
                            willDrop = true;
                            break;
                        } else if (grid[r + 1][c] === "E") {
                            willDrop = true;
                            break;
                        }
                    }
                }
                if (willDrop) break;
            }

            if (!willDrop) {
                checkWinCondition();
                return;
            }

            isAnimating = true;
            render();

            setTimeout(() => {
                stepGravity();
            }, 180);
        }

        function stepGravity() {
            let droppedAny = false;
            let failureResult = null;

            // Scan bottom-up
            for (let r = 4; r >= 0; r--) {
                for (let c = 0; c < 11; c++) {
                    const item = grid[r][c];
                    if (BUTTERFLIES[item]) {
                        const bInfo = BUTTERFLIES[item];
                        if (r === 4) {
                            // Falling past bottom row
                            grid[r][c] = "E";
                            droppedAny = true;
                            const basket = BASKETS[c];
                            if (basket && basket.key === bInfo.basketKey) {
                                // Match!
                                basketsCaught[bInfo.basketKey] = true;
                            } else {
                                failureResult = basket
                                    ? `${bInfo.name} dropped into the wrong basket (${basket.label})!`
                                    : `${bInfo.name} dropped onto the floor!`;
                            }
                        } else if (grid[r + 1][c] === "E") {
                            // Fall down 1 cell
                            grid[r + 1][c] = item;
                            grid[r][c] = "E";
                            droppedAny = true;
                        }
                    }
                }
            }

            render();

            if (failureResult) {
                isFinished = true;
                isAnimating = false;
                render();
                const msgEl = container.querySelector("#pq-butterfly-msg");
                if (msgEl) {
                    msgEl.innerHTML = `<span style="color:var(--crimson);">${failureResult}</span>`;
                }
                setTimeout(() => {
                    shell.failLevel(failureResult);
                }, 700);
                return;
            }

            if (droppedAny) {
                setTimeout(() => {
                    stepGravity();
                }, 160);
            } else {
                isAnimating = false;
                render();
                checkWinCondition();
            }
        }

        function checkWinCondition() {
            const allCaught = Object.values(basketsCaught).every(v => v === true);
            if (allCaught && !isFinished) {
                isFinished = true;
                const msgEl = container.querySelector("#pq-butterfly-msg");
                if (msgEl) {
                    msgEl.innerHTML = `<span style="color:var(--emerald);">✓ Perfect! All 5 butterflies sorted into their matching baskets!</span>`;
                }
                setTimeout(() => {
                    shell.completeLevel();
                }, 800);
            }
        }

        function render() {
            const allCaught = Object.values(basketsCaught).every(v => v === true);
            let html = `
                <div class="pq-butterfly-scroll-wrapper">
                    <div class="pq-butterfly-scene">
                        <!-- 5 Rail Rows -->
                        <div class="pq-butterfly-rails">
            `;

            for (let r = 0; r < 5; r++) {
                const canLeft = canShift(r, -1);
                const canRight = canShift(r, 1);

                html += `
                    <div class="pq-butterfly-row" data-row="${r}">
                        <button class="pq-hud-btn pq-butterfly-arrow-btn" data-row="${r}" data-dir="-1" ${canLeft ? "" : "disabled"} title="Shift Row ${r + 1} Left">◀</button>
                        <div class="pq-butterfly-track">
                `;

                for (let c = 0; c < 11; c++) {
                    const cell = grid[r][c];
                    let content = "";
                    if (cell === "S") {
                        content = `<div class="pq-butterfly-sphere" title="Sphere"></div>`;
                    } else if (BUTTERFLIES[cell]) {
                        const b = BUTTERFLIES[cell];
                        content = `<div class="pq-butterfly-token" style="background:${b.color}; box-shadow: 0 0 10px ${b.color};" title="${b.name}">🦋</div>`;
                    }

                    html += `
                        <div class="pq-butterfly-cell ${cell === 'E' ? 'pq-butterfly-empty' : ''}" data-row="${r}" data-col="${c}">
                            ${content}
                        </div>
                    `;
                }

                html += `
                        </div>
                        <button class="pq-hud-btn pq-butterfly-arrow-btn" data-row="${r}" data-dir="1" ${canRight ? "" : "disabled"} title="Shift Row ${r + 1} Right">▶</button>
                    </div>
                `;
            }

            html += `
                        </div>

                        <!-- Bottom Floor & Baskets Row -->
                        <div class="pq-butterfly-baskets-wrapper">
                            <div class="pq-butterfly-arrow-spacer"></div>
                            <div class="pq-butterfly-baskets-grid">
            `;

            for (let c = 0; c < 11; c++) {
                const basket = BASKETS[c];
                if (basket) {
                    const caught = basketsCaught[basket.key];
                    html += `
                        <div class="pq-butterfly-basket-cell ${caught ? 'pq-butterfly-basket-caught' : ''}" style="--basket-color: ${basket.color};" title="Bucket: ${basket.label}">
                            <div class="pq-butterfly-basket-icon" style="color: ${basket.color};">${caught ? '🦋' : '🧺'}</div>
                            <div class="pq-butterfly-basket-tag" style="background: ${basket.color};"></div>
                        </div>
                    `;
                } else {
                    html += `
                        <div class="pq-butterfly-floor-cell" title="Floor (Hazard)">
                            <div class="pq-butterfly-floor-hazard">✕</div>
                        </div>
                    `;
                }
            }

            html += `
                            </div>
                            <div class="pq-butterfly-arrow-spacer"></div>
                        </div>
                    </div>
                </div>
                <div id="pq-butterfly-msg" class="pq-butterfly-status-msg"></div>
            `;

            container.innerHTML = html;

            // Bind click handlers for arrow buttons
            container.querySelectorAll(".pq-butterfly-arrow-btn").forEach(btn => {
                btn.onclick = () => {
                    const r = parseInt(btn.dataset.row, 10);
                    const dir = parseInt(btn.dataset.dir, 10);
                    shiftRow(r, dir);
                };
            });
        }

        // Register onReset hook for shell integration
        shell.onReset = resetState;

        // Initialize state
        resetState();
    }
};

// ─────────────────────────────────────────────────────────
// LEVEL 17: SYMBOL TILE SORT (62231.jpg)
// ─────────────────────────────────────────────────────────
window.PuzzleEngines.symbolSort = {
    init: (container, puzzle, shell) => {
        // 5x5 Grid representation.
        // Symbols:
        // H: Headphone (Green / bio-hazard triple loop)
        // F: Fish (Red)
        // T: Timer / Hourglass (Yellow/Gold)
        // I: Infinity (Blue)
        // G: Greyed out static obstacle
        // E: Empty movable slot
        //
        // Target Zones:
        // Leftmost 3 cells + center of 2nd col:
        // (1,0), (2,0), (3,0), and (2,1) => H (Headphone)
        //
        // Rightmost 3 cells + center of 4th col:
        // (1,4), (2,4), (3,4), and (2,3) => T (Timer)
        //
        // Topmost 3 cells + center of 2nd row:
        // (0,1), (0,2), (0,3), and (1,2) => F (Fish)
        //
        // Bottommost 3 cells + center of 4th row:
        // (4,1), (4,2), (4,3), and (3,2) => I (Infinity)

        const SYMBOL_CONFIG = {
            "H": {
                name: "Headphone",
                char: "☊",
                color: "#22c55e",
                bgTint: "rgba(34, 197, 94, 0.16)",
                borderTint: "rgba(34, 197, 94, 0.45)"
            },
            "F": {
                name: "Fish",
                char: "🐟",
                color: "#ef4444",
                bgTint: "rgba(239, 68, 68, 0.16)",
                borderTint: "rgba(239, 68, 68, 0.45)"
            },
            "T": {
                name: "Timer",
                char: "⌛",
                color: "#eab308",
                bgTint: "rgba(234, 179, 8, 0.16)",
                borderTint: "rgba(234, 179, 8, 0.45)"
            },
            "I": {
                name: "Infinity",
                char: "∞",
                color: "#38bdf8",
                bgTint: "rgba(56, 189, 248, 0.16)",
                borderTint: "rgba(56, 189, 248, 0.45)"
            }
        };

        const TARGET_MAP = {
            // Headphone targets (green)
            "1,0": "H", "2,0": "H", "3,0": "H", "2,1": "H",
            // Fish targets (red)
            "0,1": "F", "0,2": "F", "0,3": "F", "1,2": "F",
            // Timer targets (yellow)
            "1,4": "T", "2,4": "T", "3,4": "T", "2,3": "T",
            // Infinity targets (blue)
            "4,1": "I", "4,2": "I", "4,3": "I", "3,2": "I"
        };

        const INITIAL_LAYOUT = [
            ["G", "H", "T", "I", "G"],
            ["T", "E", "F", "H", "F"],
            ["E", "I", "G", "E", "I"],
            ["H", "F", "E", "I", "T"],
            ["G", "T", "H", "F", "G"]
        ];

        let board = [];
        let isComplete = false;
        let highlightedMove = null; // { from: [r,c], to: [r,c] }

        function calculateOptimalMove() {
            // Find an adjacent move from a non-target or non-optimal position towards its domain
            const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            const TARGET_SLOTS = {
                H: [[1,0], [2,0], [3,0], [2,1]],
                F: [[0,1], [0,2], [0,3], [1,2]],
                T: [[1,4], [2,4], [3,4], [2,3]],
                I: [[4,1], [4,2], [4,3], [3,2]]
            };

            function heuristic(b) {
                let cost = 0;
                for (let r = 0; r < 5; r++) {
                    for (let c = 0; c < 5; c++) {
                        const tile = b[r][c];
                        if (TARGET_SLOTS[tile]) {
                            let minDist = 999;
                            for (const [tr, tc] of TARGET_SLOTS[tile]) {
                                const d = Math.abs(r - tr) + Math.abs(c - tc);
                                if (d < minDist) minDist = d;
                            }
                            cost += minDist * 2;
                            if (TARGET_MAP[`${r},${c}`] === tile) cost -= 3;
                        }
                    }
                }
                return cost;
            }

            const candidates = [];
            for (let r = 0; r < 5; r++) {
                for (let c = 0; c < 5; c++) {
                    if (board[r][c] === "E") {
                        for (const [dr, dc] of dirs) {
                            const nr = r + dr;
                            const nc = c + dc;
                            if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5) {
                                const tile = board[nr][nc];
                                if (tile !== "G" && tile !== "E") {
                                    const nextB = board.map(row => [...row]);
                                    nextB[r][c] = tile;
                                    nextB[nr][nc] = "E";
                                    candidates.push({
                                        from: [nr, nc],
                                        to: [r, c],
                                        tile,
                                        h: heuristic(nextB)
                                    });
                                }
                            }
                        }
                    }
                }
            }

            if (candidates.length === 0) return null;
            candidates.sort((a, b) => a.h - b.h);
            return candidates[0];
        }

        // Register shell hook when hint modal is dismissed
        shell.onHintDismissed = () => {
            const opt = calculateOptimalMove();
            if (opt) {
                highlightedMove = { from: opt.from, to: opt.to };
                render();
            }
        };

        function resetBoard() {
            board = INITIAL_LAYOUT.map(row => [...row]);
            isComplete = false;
            highlightedMove = null;
            render();
        }

        function checkWin() {
            for (let r = 0; r < 5; r++) {
                for (let c = 0; c < 5; c++) {
                    const key = `${r},${c}`;
                    const target = TARGET_MAP[key];
                    if (target) {
                        if (board[r][c] !== target) {
                            return false;
                        }
                    }
                }
            }
            return true;
        }

        function executeMove(fromR, fromC, toR, toC) {
            if (isComplete) return false;
            const tile = board[fromR][fromC];
            if (tile === "G" || tile === "E") return false;
            if (board[toR][toC] !== "E") return false;

            // Must be orthogonally adjacent
            const dist = Math.abs(fromR - toR) + Math.abs(fromC - toC);
            if (dist !== 1) return false;

            board[toR][toC] = tile;
            board[fromR][fromC] = "E";
            highlightedMove = null; // Clear hint highlight once moved
            shell.incrementMoves();
            render();

            if (checkWin()) {
                isComplete = true;
                const msgEl = container.querySelector("#pq-symbol-msg");
                if (msgEl) {
                    msgEl.innerHTML = `<span style="color:var(--emerald);">✓ Complete! All ancient symbols sorted into their sacred domains!</span>`;
                }
                setTimeout(() => {
                    shell.completeLevel();
                }, 800);
            }
            return true;
        }

        function render() {
            let html = `
                <div class="pq-symbol-scroll-wrapper">
                    <div class="pq-symbol-scene">
                        <div class="pq-symbol-board-frame">
                            <div class="pq-symbol-grid" id="pq-symbol-grid">
            `;

            for (let r = 0; r < 5; r++) {
                for (let c = 0; c < 5; c++) {
                    const key = `${r},${c}`;
                    const tile = board[r][c];
                    const targetSym = TARGET_MAP[key];
                    const isCenter = (r === 2 && c === 2);
                    const isCorner = ((r === 0 || r === 4) && (c === 0 || c === 4));

                    const isHintFrom = highlightedMove && highlightedMove.from[0] === r && highlightedMove.from[1] === c;
                    const isHintTo = highlightedMove && highlightedMove.to[0] === r && highlightedMove.to[1] === c;
                    const hintClass = (isHintFrom || isHintTo) ? "pq-symbol-hint-highlight" : "";

                    if (isCenter) {
                        html += `
                            <div class="pq-symbol-cell pq-symbol-cell-center" title="Central Relic Core">
                                <div class="pq-symbol-center-gem">
                                    <div class="pq-symbol-gem-inner">✦</div>
                                </div>
                            </div>
                        `;
                    } else if (isCorner) {
                        html += `
                            <div class="pq-symbol-cell pq-symbol-cell-corner" title="Fixed Corner Pillar">
                                <div class="pq-symbol-corner-ornament">◈</div>
                            </div>
                        `;
                    } else {
                        // Playable mechanism cell
                        const targetCfg = targetSym ? SYMBOL_CONFIG[targetSym] : null;
                        const cellStyle = targetCfg
                            ? `background: ${targetCfg.bgTint}; border-color: ${targetCfg.borderTint};`
                            : ``;

                        // Watermark / ghost symbol in background showing supposed symbol
                        const ghostHtml = targetCfg
                            ? `<div class="pq-symbol-ghost" style="color: ${targetCfg.color};">${targetCfg.char}</div>`
                            : ``;

                        let tileHtml = "";
                        if (tile !== "E" && tile !== "G") {
                            const symCfg = SYMBOL_CONFIG[tile];
                            const isAtTarget = targetSym === tile;

                            tileHtml = `
                                <div class="pq-symbol-tile ${isAtTarget ? 'pq-symbol-tile-matched' : ''}" 
                                     style="color: ${symCfg.color}; --tile-glow: ${symCfg.color};"
                                     data-row="${r}"
                                     data-col="${c}"
                                     data-symbol="${tile}">
                                    <span class="pq-symbol-tile-char">${symCfg.char}</span>
                                </div>
                            `;
                        }

                        html += `
                            <div class="pq-symbol-cell pq-symbol-cell-slot ${hintClass}" 
                                 style="${cellStyle}" 
                                 data-row="${r}" 
                                 data-col="${c}">
                                ${ghostHtml}
                                ${tileHtml}
                            </div>
                        `;
                    }
                }
            }

            html += `
                            </div>
                        </div>
                    </div>
                </div>
                <div id="pq-symbol-msg" class="pq-symbol-status-msg"></div>
            `;

            container.innerHTML = html;

            setupDragHandlers();
        }

        function setupDragHandlers() {
            const gridEl = container.querySelector("#pq-symbol-grid");
            if (!gridEl) return;

            let activeDrag = null; // { tileEl, startR, startC, startX, startY }

            function onPointerDown(e) {
                if (isComplete) return;
                const tileEl = e.target.closest(".pq-symbol-tile");
                if (!tileEl) return;

                const startR = parseInt(tileEl.dataset.row, 10);
                const startC = parseInt(tileEl.dataset.col, 10);

                // Check if tile has any adjacent empty slot
                const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                const hasEmptyAdjacent = dirs.some(([dr, dc]) => {
                    const nr = startR + dr;
                    const nc = startC + dc;
                    return nr >= 0 && nr < 5 && nc >= 0 && nc < 5 && board[nr][nc] === "E";
                });

                if (!hasEmptyAdjacent) return;

                e.preventDefault();
                tileEl.setPointerCapture(e.pointerId);

                activeDrag = {
                    tileEl,
                    pointerId: e.pointerId,
                    startR,
                    startC,
                    startX: e.clientX,
                    startY: e.clientY
                };

                tileEl.classList.add("pq-symbol-tile-dragging");
            }

            function onPointerMove(e) {
                if (!activeDrag || activeDrag.pointerId !== e.pointerId) return;
                const dx = e.clientX - activeDrag.startX;
                const dy = e.clientY - activeDrag.startY;

                // Restrict movement range visually to within adjacent bounds
                const clampX = Math.max(-90, Math.min(90, dx));
                const clampY = Math.max(-70, Math.min(70, dy));
                activeDrag.tileEl.style.transform = `translate(${clampX}px, ${clampY}px) scale(1.06)`;
            }

            function onPointerUp(e) {
                if (!activeDrag || activeDrag.pointerId !== e.pointerId) return;
                const { tileEl, startR, startC, startX, startY } = activeDrag;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;

                tileEl.style.transform = "";
                tileEl.classList.remove("pq-symbol-tile-dragging");
                try {
                    tileEl.releasePointerCapture(e.pointerId);
                } catch (err) {}

                activeDrag = null;

                // Threshold of 24px drag in predominant direction
                const absX = Math.abs(dx);
                const absY = Math.abs(dy);
                if (Math.max(absX, absY) > 24) {
                    let targetR = startR;
                    let targetC = startC;

                    if (absX > absY) {
                        targetC += dx > 0 ? 1 : -1;
                    } else {
                        targetR += dy > 0 ? 1 : -1;
                    }

                    if (targetR >= 0 && targetR < 5 && targetC >= 0 && targetC < 5) {
                        executeMove(startR, startC, targetR, targetC);
                    }
                }
            }

            function onPointerCancel(e) {
                if (!activeDrag || activeDrag.pointerId !== e.pointerId) return;
                activeDrag.tileEl.style.transform = "";
                activeDrag.tileEl.classList.remove("pq-symbol-tile-dragging");
                try {
                    activeDrag.tileEl.releasePointerCapture(e.pointerId);
                } catch (err) {}
                activeDrag = null;
            }

            gridEl.querySelectorAll(".pq-symbol-tile").forEach(tileEl => {
                tileEl.addEventListener("pointerdown", onPointerDown);
                tileEl.addEventListener("pointermove", onPointerMove);
                tileEl.addEventListener("pointerup", onPointerUp);
                tileEl.addEventListener("pointercancel", onPointerCancel);
            });
        }

        shell.onReset = resetBoard;
        resetBoard();
    }
};

// ─────────────────────────────────────────────────────────
// LEVEL 18: EIGHT-CELL NUMBER PLACEMENT
// ─────────────────────────────────────────────────────────
window.PuzzleEngines.eightCells = {
    init: (container, puzzle, shell) => {
        // 8 cells:
        //       [0] [1]
        //   [2] [3] [4] [5]
        //       [6] [7]
        let placed = Array(8).fill(null);
        let selectedNum = null;

        const adjacency = {
            0: [1, 2, 3, 4],
            1: [0, 3, 4, 5],
            2: [0, 3, 6],
            3: [0, 1, 2, 4, 6, 7],
            4: [0, 1, 3, 5, 6, 7],
            5: [1, 4, 7],
            6: [2, 3, 4, 7],
            7: [3, 4, 5, 6]
        };

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 520px; margin: 0 auto;">
                <div style="font-size: 13px; font-weight: 800; color: var(--gold); margin-bottom: 14px;">
                    CONSECUTIVE NUMBERS CANNOT TOUCH (HORIZONTALLY, VERTICALLY, OR DIAGONALLY)
                </div>

                <!-- Hexagon / Cross Layout -->
                <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; margin: 10px 0;">
                    <!-- Row 1 (2 cells) -->
                    <div style="display: flex; gap: 10px;">
                        <div class="pq-8cell" data-idx="0"></div>
                        <div class="pq-8cell" data-idx="1"></div>
                    </div>
                    <!-- Row 2 (4 cells) -->
                    <div style="display: flex; gap: 10px;">
                        <div class="pq-8cell" data-idx="2"></div>
                        <div class="pq-8cell" data-idx="3"></div>
                        <div class="pq-8cell" data-idx="4"></div>
                        <div class="pq-8cell" data-idx="5"></div>
                    </div>
                    <!-- Row 3 (2 cells) -->
                    <div style="display: flex; gap: 10px;">
                        <div class="pq-8cell" data-idx="6"></div>
                        <div class="pq-8cell" data-idx="7"></div>
                    </div>
                </div>

                <!-- Available tokens (1-8) -->
                <div style="display: flex; gap: 8px; margin-top: 16px;">
                    ${[1, 2, 3, 4, 5, 6, 7, 8].map(n => `
                        <button class="pq-8num-btn" id="num-btn-${n}" data-num="${n}" type="button" style="width: 44px; height: 44px; border-radius: 8px; background: #1e3a5f; border: 2px solid var(--cyan); color: #fff; font-size: 20px; font-weight: 900; cursor: pointer;">
                            ${n}
                        </button>
                    `).join("")}
                </div>

                <div id="pq-8cell-feedback" style="min-height: 24px; margin-top: 14px; font-size: 13px; font-weight: 700;"></div>
            </div>
        `;

        const cellEls = container.querySelectorAll(".pq-8cell");
        const numBtns = container.querySelectorAll(".pq-8num-btn");
        const feedbackEl = container.querySelector("#pq-8cell-feedback");

        cellEls.forEach(el => {
            el.style.width = "64px";
            el.style.height = "64px";
            el.style.borderRadius = "10px";
            el.style.background = "#030914";
            el.style.border = "2px solid rgba(0, 200, 255, 0.35)";
            el.style.display = "flex";
            el.style.alignItems = "center";
            el.style.justifyContent = "center";
            el.style.fontSize = "28px";
            el.style.fontWeight = "900";
            el.style.color = "#ffffff";
            el.style.cursor = "pointer";
            el.style.userSelect = "none";
        });

        function getConflicts() {
            const conflictCells = new Set();
            for (let i = 0; i < 8; i++) {
                const val = placed[i];
                if (val === null) continue;
                for (const neighbor of adjacency[i]) {
                    const nVal = placed[neighbor];
                    if (nVal !== null && Math.abs(val - nVal) === 1) {
                        conflictCells.add(i);
                        conflictCells.add(neighbor);
                    }
                }
            }
            return conflictCells;
        }

        function render() {
            const conflicts = getConflicts();
            const placedList = placed.filter(x => x !== null);

            cellEls.forEach(el => {
                const idx = Number(el.dataset.idx);
                const val = placed[idx];
                el.innerText = val !== null ? val : "";

                if (conflicts.has(idx)) {
                    el.style.borderColor = "var(--crimson)";
                    el.style.background = "rgba(239, 68, 68, 0.25)";
                    el.style.boxShadow = "0 0 10px rgba(239, 68, 68, 0.4)";
                } else if (val !== null) {
                    el.style.borderColor = "var(--cyan)";
                    el.style.background = "#142742";
                    el.style.boxShadow = "none";
                } else {
                    el.style.borderColor = "rgba(0, 200, 255, 0.35)";
                    el.style.background = "#030914";
                    el.style.boxShadow = "none";
                }
            });

            numBtns.forEach(btn => {
                const n = Number(btn.dataset.num);
                const isUsed = placedList.includes(n);
                const isSel = selectedNum === n;

                if (isUsed) {
                    btn.style.opacity = "0.2";
                    btn.style.cursor = "not-allowed";
                } else if (isSel) {
                    btn.style.opacity = "1";
                    btn.style.background = "var(--gold)";
                    btn.style.color = "#000";
                    btn.style.borderColor = "var(--gold)";
                } else {
                    btn.style.opacity = "1";
                    btn.style.background = "#1e3a5f";
                    btn.style.color = "#fff";
                    btn.style.borderColor = "var(--cyan)";
                }
            });

            if (conflicts.size > 0) {
                feedbackEl.innerHTML = `<span style="color:var(--crimson);">Conflict detected! Red cells contain consecutive numbers that are touching.</span>`;
            } else if (placedList.length === 8) {
                feedbackEl.innerHTML = `<span style="color:var(--emerald);">✓ Complete! All 8 numbers arranged without any consecutive neighbors touching!</span>`;
                setTimeout(() => {
                    shell.completeLevel();
                }, 800);
            } else {
                feedbackEl.innerText = "";
            }
        }

        numBtns.forEach(btn => {
            btn.onclick = () => {
                const n = Number(btn.dataset.num);
                if (placed.includes(n)) return;
                selectedNum = selectedNum === n ? null : n;
                render();
            };
        });

        cellEls.forEach(cell => {
            cell.onclick = () => {
                const idx = Number(cell.dataset.idx);
                if (selectedNum !== null) {
                    placed[idx] = selectedNum;
                    selectedNum = null;
                    shell.incrementMoves();
                    render();
                } else if (placed[idx] !== null) {
                    // Clear cell
                    placed[idx] = null;
                    render();
                }
            };
        });

        render();

        shell.onReset = () => {
            placed = Array(8).fill(null);
            selectedNum = null;
            render();
        };
    }
};

// ─────────────────────────────────────────────────────────
// LEVEL 19: ROTATING TILES (62225.jpg)
// ─────────────────────────────────────────────────────────
window.PuzzleEngines.rotatingTiles = {
    init: (container, puzzle, shell) => {
        // 5x5 board of 5 colors/symbols:
        // 0: Pink swirl (P)
        // 1: Orange crescent (O)
        // 2: Light blue tri-dot (LB)
        // 3: Green circle (G)
        // 4: Dark blue eye (DB)
        const symbols = ["🌀", "🌙", "☘️", "🟢", "👁️"];
        const colors = ["#ec4899", "#f97316", "#06b6d4", "#22c55e", "#1d4ed8"];

        // Target 5x5 configuration from reference image 62225.jpg:
        // Row 1: Green, Green, Pink, Dark Blue, Dark Blue
        // Row 2: Green, Green, Pink, Dark Blue, Dark Blue
        // Row 3: Pink, Pink, Pink, Pink, Pink
        // Row 4: Orange, Orange, Pink, Light Blue, Light Blue
        // Row 5: Orange, Orange, Pink, Light Blue, Light Blue
        const targetGrid = [
            [3, 3, 0, 4, 4],
            [3, 3, 0, 4, 4],
            [0, 0, 0, 0, 0],
            [1, 1, 0, 2, 2],
            [1, 1, 0, 2, 2]
        ];

        // Specific starting layout requested:
        // P   O   O   LB  G
        // DB  LB  P   O   DB
        // P   G   P   DB  LB
        // G   DB  P   P   O
        // P   LB  P   P   G
        const initialGrid = [
            [0, 1, 1, 2, 3],
            [4, 2, 0, 1, 4],
            [0, 3, 0, 4, 2],
            [3, 4, 0, 0, 1],
            [0, 2, 0, 0, 3]
        ];

        let grid = initialGrid.map(row => [...row]);
        let hintedDial = null; // { r, c }

        function rotateClockwise(r, c) {
            // Rotates 2x2 cluster: (r, c), (r, c+1), (r+1, c+1), (r+1, c)
            const temp = grid[r][c];
            grid[r][c] = grid[r + 1][c];
            grid[r + 1][c] = grid[r + 1][c + 1];
            grid[r + 1][c + 1] = grid[r][c + 1];
            grid[r][c + 1] = temp;
        }

        const TARGET_SLOTS = {
            3: [[0,0], [0,1], [1,0], [1,1]], // Green
            4: [[0,3], [0,4], [1,3], [1,4]], // Dark Blue
            0: [[0,2], [1,2], [2,0], [2,1], [2,2], [2,3], [2,4], [3,2], [4,2]], // Pink
            1: [[3,0], [3,1], [4,0], [4,1]], // Orange
            2: [[3,3], [3,4], [4,3], [4,4]]  // Light Blue
        };

        function evaluateBoard(b) {
            let cost = 0;
            for (let r = 0; r < 5; r++) {
                for (let c = 0; c < 5; c++) {
                    const color = b[r][c];
                    const slots = TARGET_SLOTS[color];
                    let minDist = 999;
                    for (const [tr, tc] of slots) {
                        const d = Math.abs(r - tr) + Math.abs(c - tc);
                        if (d < minDist) minDist = d;
                    }
                    cost += minDist;
                    if (b[r][c] === targetGrid[r][c]) cost -= 3;
                }
            }
            return cost;
        }

        function calculateOptimalDial() {
            let bestDial = null;
            let bestCost = Infinity;

            for (let r = 0; r < 4; r++) {
                for (let c = 0; c < 4; c++) {
                    // Try rotating this dial clockwise
                    rotateClockwise(r, c);
                    const cost = evaluateBoard(grid);
                    // Undo rotation
                    rotateClockwise(r, c);
                    rotateClockwise(r, c);
                    rotateClockwise(r, c);

                    if (cost < bestCost) {
                        bestCost = cost;
                        bestDial = { r, c };
                    }
                }
            }

            return bestDial;
        }

        shell.onHintDismissed = () => {
            hintedDial = calculateOptimalDial();
            render();
        };

        const cellSize = 54;

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 680px; margin: 0 auto;">
                <div style="font-size: 13px; font-weight: 800; color: var(--gold); margin-bottom: 14px;">
                    CLICK ROTATION BUTTONS BETWEEN TILES TO MATCH THE TARGET PATTERN
                </div>

                <div style="display: flex; gap: 24px; align-items: center; flex-wrap: wrap; justify-content: center;">
                    <!-- Active 5x5 Grid with 16 Dials -->
                    <div style="position: relative; width: ${5 * cellSize}px; height: ${5 * cellSize}px; background: #030a16; border: 3px solid var(--panel-border); border-radius: 12px; padding: 4px; box-sizing: content-box;">
                        <div id="pq-rot-grid" style="display: grid; grid-template-columns: repeat(5, ${cellSize}px); grid-template-rows: repeat(5, ${cellSize}px);">
                            <!-- 25 tiles -->
                        </div>

                        <!-- 16 Rotation Dials (between 2x2 cells) -->
                        ${[0, 1, 2, 3].map(r => [0, 1, 2, 3].map(c => `
                            <button class="pq-rot-dial" data-r="${r}" data-c="${c}" id="pq-rot-dial-${r}-${c}" type="button" style="position: absolute; top: ${(r + 1) * cellSize - 14}px; left: ${(c + 1) * cellSize - 14}px; width: 28px; height: 28px; border-radius: 50%; background: #ffffff; color: #000; font-size: 14px; font-weight: 900; border: 2px solid var(--gold); box-shadow: 0 0 8px rgba(0,0,0,0.7); cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10; transition: all 0.2s ease;">
                                ↻
                            </button>
                        `).join("")).join("")}
                    </div>

                    <!-- Target Preview -->
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                        <span style="font-size: 11px; font-weight: 800; color: var(--cyan); text-transform: uppercase;">TARGET PATTERN</span>
                        <div style="display: grid; grid-template-columns: repeat(5, 24px); grid-template-rows: repeat(5, 24px); gap: 2px; background: #030a16; border: 2px solid var(--panel-border); border-radius: 8px; padding: 4px;">
                            ${targetGrid.flat().map(sym => `
                                <div style="width: 24px; height: 24px; border-radius: 3px; background: ${colors[sym]};"></div>
                            `).join("")}
                        </div>
                    </div>
                </div>

                <div id="pq-rot-msg" style="min-height: 24px; margin-top: 14px; font-size: 13px; font-weight: 700;"></div>
            </div>
        `;

        const gridEl = container.querySelector("#pq-rot-grid");
        const dials = container.querySelectorAll(".pq-rot-dial");
        const msgEl = container.querySelector("#pq-rot-msg");

        function render() {
            gridEl.innerHTML = "";
            let matches = 0;

            for (let r = 0; r < 5; r++) {
                for (let c = 0; c < 5; c++) {
                    const cell = document.createElement("div");
                    const sym = grid[r][c];
                    if (sym === targetGrid[r][c]) matches++;

                    cell.style.width = `${cellSize}px`;
                    cell.style.height = `${cellSize}px`;
                    cell.style.display = "flex";
                    cell.style.alignItems = "center";
                    cell.style.justifyContent = "center";
                    cell.style.fontSize = "24px";
                    cell.style.border = "1px solid rgba(255, 255, 255, 0.1)";
                    cell.style.background = colors[sym];
                    cell.innerText = symbols[sym];

                    gridEl.appendChild(cell);
                }
            }

            // Update dial hint glow
            dials.forEach(dial => {
                const r = Number(dial.dataset.r);
                const c = Number(dial.dataset.c);
                if (hintedDial && hintedDial.r === r && hintedDial.c === c) {
                    dial.classList.add("pq-rot-dial-hint");
                } else {
                    dial.classList.remove("pq-rot-dial-hint");
                }
            });

            if (matches === 25) {
                msgEl.innerHTML = `<span style="color:var(--emerald);">✓ Complete! Grid matches the ancient target pattern perfectly!</span>`;
                setTimeout(() => {
                    shell.completeLevel();
                }, 800);
            }
        }

        dials.forEach(dial => {
            dial.onclick = () => {
                const r = Number(dial.dataset.r);
                const c = Number(dial.dataset.c);
                rotateClockwise(r, c);
                hintedDial = null; // Clear hint on move
                shell.incrementMoves();
                render();
            };
        });

        shell.onReset = () => {
            grid = initialGrid.map(row => [...row]);
            hintedDial = null;
            render();
        };

        render();
    }
};

// ─────────────────────────────────────────────────────────
// LEVEL 20: NUMBER AVERAGE WHEEL (62230.jpg)
// ─────────────────────────────────────────────────────────
window.PuzzleEngines.averageWheel = {
    init: (container, puzzle, shell) => {
        // Initial token values starting at top (index 0) and going clockwise:
        // 0: top center = 6
        // 1: upper right = 8
        // 2: right top = 4
        // 3: right bottom = 6
        // 4: lower right = 7
        // 5: bottom center = 5 (opposite to first 6)
        // 6: lower left = 9
        // 7: left bottom = 2
        // 8: left top = 8
        // 9: upper left = 3
        const initialTokens = [6, 8, 4, 6, 7, 5, 9, 2, 8, 3];
        let currentTokens = [...initialTokens];

        // Engraved fixed numbers clockwise starting between 6 & 8:
        // [between 0&1: 3, 1&2: 7, 2&3: 5, 3&4: 11, 4&5: 7, 5&6: 7, 6&7: 9, 7&8: 3, 8&9: 1, 9&0: 5]
        const engravedValues = [3, 7, 5, 11, 7, 7, 9, 3, 1, 5];

        // Objective: each slot value must equal the average of the two adjacent engraved numbers
        // For slot i: adjacent engraved are (i - 1 + 10)%10 and i
        const targetAverages = [
            (5 + 3) / 2,   // slot 0: 4
            (3 + 7) / 2,   // slot 1: 5
            (7 + 5) / 2,   // slot 2: 6
            (5 + 11) / 2,  // slot 3: 8
            (11 + 7) / 2,  // slot 4: 9
            (7 + 7) / 2,   // slot 5: 7
            (7 + 9) / 2,   // slot 6: 8
            (9 + 3) / 2,   // slot 7: 6
            (3 + 1) / 2,   // slot 8: 2
            (1 + 5) / 2    // slot 9: 3
        ];

        // 10 slots each with exactly 2 connected paths:
        // 0 with 7 & 3
        // 1 with 2 & 4
        // 2 with 1 & 3
        // 3 with 2 & 0
        // 4 with 1 & 5
        // 5 with 4 & 6
        // 6 with 5 & 9
        // 7 with 8 & 0
        // 8 with 9 & 7
        // 9 with 6 & 8
        const adjacency = [
            [7, 3],
            [2, 4],
            [1, 3],
            [2, 0],
            [1, 5],
            [4, 6],
            [5, 9],
            [8, 0],
            [9, 7],
            [6, 8]
        ];

        // Node coordinates on horizontal oval (Rx=230, Ry=120, cx=330, cy=190)
        const nodeCoords = [
            { x: 330, y: 70 },
            { x: 465, y: 93 },
            { x: 549, y: 153 },
            { x: 549, y: 227 },
            { x: 465, y: 287 },
            { x: 330, y: 310 },
            { x: 195, y: 287 },
            { x: 111, y: 227 },
            { x: 111, y: 153 },
            { x: 195, y: 93 }
        ];

        // Engraved fixed numbers coordinates along perimeter
        const engravedCoords = [
            { val: 3,  x: 412, y: 56 },
            { val: 7,  x: 540, y: 105 },
            { val: 5,  x: 590, y: 190 },
            { val: 11, x: 540, y: 275 },
            { val: 7,  x: 412, y: 324 },
            { val: 7,  x: 248, y: 324 },
            { val: 9,  x: 120, y: 275 },
            { val: 3,  x: 70,  y: 190 },
            { val: 1,  x: 120, y: 105 },
            { val: 5,  x: 248, y: 56 }
        ];

        // Smooth curved paths connecting the 10 edges framing the central diamond
        // Perfectly symmetrical across vertical centerline x = 330:
        // - (0, 3) and (7, 0): inside curved toward center diamond
        // - (1, 4) and (6, 9): symmetrical inward curves
        // - (3, 2) and (8, 7): symmetrical inward curves
        // - (2, 1) and (9, 8): symmetrical curves
        // - (4, 5) and (5, 6): symmetrical curves
        const curves = [
            { u: 0, v: 3, d: "M 330 70 Q 380 185 549 227" },
            { u: 3, v: 2, d: "M 549 227 Q 505 190 549 153" },
            { u: 2, v: 1, d: "M 549 153 Q 515 115 465 93" },
            { u: 1, v: 4, d: "M 465 93 Q 430 190 465 287" },
            { u: 4, v: 5, d: "M 465 287 Q 405 312 330 310" },
            { u: 5, v: 6, d: "M 330 310 Q 255 312 195 287" },
            { u: 6, v: 9, d: "M 195 287 Q 230 190 195 93" },
            { u: 9, v: 8, d: "M 195 93 Q 145 115 111 153" },
            { u: 8, v: 7, d: "M 111 153 Q 155 190 111 227" },
            { u: 7, v: 0, d: "M 111 227 Q 280 185 330 70" }
        ];

        let selectedNode = null;
        let isSolved = false;

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 680px; margin: 0 auto; user-select: none;">
                <div id="pq-wheel-svg-wrap" style="position: relative; width: 100%; max-width: 660px; filter: drop-shadow(0 16px 36px rgba(0,0,0,0.65));">
                    <svg id="pq-wheel-svg" viewBox="0 0 660 380" style="width: 100%; height: auto; display: block; overflow: visible; touch-action: none;">
                        <defs>
                            <!-- Glow Filters -->
                            <filter id="pq-blue-glow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur in="SourceGraphic" stdDeviation="4.5" result="blur" />
                                <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0.9   0 0 0 0 1   0 0 0 1 0" in="blur" result="glow" />
                                <feMerge>
                                    <feMergeNode in="glow" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                            <filter id="pq-gem-glow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
                                <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                            <filter id="pq-gold-glow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
                                <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>

                            <!-- Medallion Gradients -->
                            <radialGradient id="pq-coin-grad" cx="35%" cy="30%" r="65%">
                                <stop offset="0%" stop-color="#dfb36e" />
                                <stop offset="45%" stop-color="#9a6230" />
                                <stop offset="100%" stop-color="#4f2b10" />
                            </radialGradient>
                            <radialGradient id="pq-coin-blue-grad" cx="35%" cy="30%" r="65%">
                                <stop offset="0%" stop-color="#5599bb" />
                                <stop offset="45%" stop-color="#21405e" />
                                <stop offset="100%" stop-color="#102035" />
                            </radialGradient>
                            <radialGradient id="pq-gem-grad" cx="40%" cy="35%" r="60%">
                                <stop offset="0%" stop-color="#a0f0ff" />
                                <stop offset="40%" stop-color="#0088dd" />
                                <stop offset="100%" stop-color="#002b66" />
                            </radialGradient>

                            <!-- Floor Gradients -->
                            <radialGradient id="pq-oval-floor" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stop-color="#2a3848" />
                                <stop offset="65%" stop-color="#141e2b" />
                                <stop offset="100%" stop-color="#090f17" />
                            </radialGradient>
                            <linearGradient id="pq-rim-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stop-color="#5a6b7d" />
                                <stop offset="40%" stop-color="#2d3744" />
                                <stop offset="100%" stop-color="#151b24" />
                            </linearGradient>
                        </defs>

                        <!-- Outer Oval Stone Rim -->
                        <ellipse cx="330" cy="190" rx="318" ry="172" fill="#0c1219" stroke="#1f2d3d" stroke-width="12" />
                        <ellipse cx="330" cy="190" rx="308" ry="164" fill="url(#pq-rim-grad)" stroke="#46586d" stroke-width="3" />
                        <ellipse cx="330" cy="190" rx="296" ry="154" fill="url(#pq-oval-floor)" stroke="#1a2533" stroke-width="4" />

                        <!-- Oval Track Groove -->
                        <ellipse cx="330" cy="190" rx="230" ry="120" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="40" />
                        <ellipse cx="330" cy="190" rx="230" ry="120" fill="none" stroke="rgba(0,0,0,0.4)" stroke-width="2" stroke-dasharray="6,6" />

                        <!-- Center Diamond Mount & Gem -->
                        <!-- Golden 8-Prong Mount -->
                        <g id="pq-center-mount">
                            <line x1="292" y1="190" x2="368" y2="190" stroke="#c99738" stroke-width="6" stroke-linecap="round" />
                            <line x1="330" y1="152" x2="330" y2="228" stroke="#c99738" stroke-width="6" stroke-linecap="round" />
                            <line x1="303" y1="163" x2="357" y2="217" stroke="#b0802b" stroke-width="5" stroke-linecap="round" />
                            <line x1="303" y1="217" x2="357" y2="163" stroke="#b0802b" stroke-width="5" stroke-linecap="round" />
                            <circle cx="330" cy="190" r="32" fill="#182330" stroke="#d4af37" stroke-width="2.5" />
                        </g>

                        <!-- Central Radiant Sapphire Diamond Gem -->
                        <g id="pq-center-gem">
                            <!-- Soft Cyan Halo -->
                            <circle cx="330" cy="190" r="28" fill="rgba(0, 180, 255, 0.22)" filter="url(#pq-gem-glow)">
                                <animate attributeName="r" values="26;30;26" dur="2.8s" repeatCount="indefinite" />
                                <animate attributeName="opacity" values="0.6;1;0.6" dur="2.8s" repeatCount="indefinite" />
                            </circle>
                            <!-- Faceted Octagonal Gemstone -->
                            <polygon points="330,166 348,174 354,190 348,206 330,214 312,206 306,190 312,174" fill="url(#pq-gem-grad)" stroke="#80e5ff" stroke-width="2" filter="url(#pq-gem-glow)" />
                            <!-- Facet Reflections -->
                            <polygon points="330,172 342,179 346,190 342,201 330,208 318,201 314,190 318,179" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1.2" />
                            <line x1="330" y1="172" x2="330" y2="208" stroke="rgba(255,255,255,0.45)" stroke-width="1" />
                            <line x1="314" y1="190" x2="346" y2="190" stroke="rgba(255,255,255,0.45)" stroke-width="1" />
                        </g>

                        <!-- Curved Connection Paths Layer -->
                        <g id="pq-wheel-paths"></g>

                        <!-- Engraved Numbers Layer (Fixed, Unchangeable) -->
                        <g id="pq-wheel-engraved"></g>

                        <!-- Active Input Tokens Layer (Movable along chains) -->
                        <g id="pq-wheel-tokens"></g>
                    </svg>
                </div>

                <div id="pq-wheel-feedback" style="min-height: 24px; margin-top: 14px; font-size: 14px; font-weight: 800; text-align: center; letter-spacing: 0.5px;"></div>
            </div>
        `;

        const pathsLayer = container.querySelector("#pq-wheel-paths");
        const engravedLayer = container.querySelector("#pq-wheel-engraved");
        const tokensLayer = container.querySelector("#pq-wheel-tokens");
        const feedbackEl = container.querySelector("#pq-wheel-feedback");
        const svgEl = container.querySelector("#pq-wheel-svg");

        // Make background and non-interactive layers pass pointer events through
        pathsLayer.style.pointerEvents = "none";
        engravedLayer.style.pointerEvents = "none";
        const centerMount = container.querySelector("#pq-center-mount");
        if (centerMount) centerMount.style.pointerEvents = "none";
        const centerGem = container.querySelector("#pq-center-gem");
        if (centerGem) centerGem.style.pointerEvents = "none";

        // Render fixed engraved numbers once
        engravedCoords.forEach(item => {
            const textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
            textEl.setAttribute("x", item.x);
            textEl.setAttribute("y", item.y);
            textEl.setAttribute("text-anchor", "middle");
            textEl.setAttribute("dominant-baseline", "central");
            textEl.setAttribute("fill", "#c59a3c");
            textEl.setAttribute("font-size", "17px");
            textEl.setAttribute("font-weight", "900");
            textEl.setAttribute("font-family", "'Cinzel', Georgia, serif");
            textEl.setAttribute("opacity", "0.78");
            textEl.setAttribute("filter", "drop-shadow(1px 2px 3px rgba(0,0,0,0.85))");
            textEl.textContent = item.val;
            engravedLayer.appendChild(textEl);
        });

        function renderPaths() {
            pathsLayer.innerHTML = "";
            curves.forEach(c => {
                const isConnectedToSelected = selectedNode !== null && (c.u === selectedNode || c.v === selectedNode);

                // Base groove
                const groove = document.createElementNS("http://www.w3.org/2000/svg", "path");
                groove.setAttribute("d", c.d);
                groove.setAttribute("fill", "none");
                groove.setAttribute("stroke", "#091018");
                groove.setAttribute("stroke-width", "7");
                groove.setAttribute("stroke-linecap", "round");
                pathsLayer.appendChild(groove);

                // Conduit line
                const conduit = document.createElementNS("http://www.w3.org/2000/svg", "path");
                conduit.setAttribute("d", c.d);
                conduit.setAttribute("fill", "none");

                if (isConnectedToSelected) {
                    // Bright luminous active energy chain
                    conduit.setAttribute("stroke", "#00e5ff");
                    conduit.setAttribute("stroke-width", "4.5");
                    conduit.setAttribute("stroke-linecap", "round");
                    conduit.setAttribute("filter", "url(#pq-blue-glow)");
                    pathsLayer.appendChild(conduit);

                    // Inner bright core
                    const core = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    core.setAttribute("d", c.d);
                    core.setAttribute("fill", "none");
                    core.setAttribute("stroke", "#ffffff");
                    core.setAttribute("stroke-width", "2");
                    core.setAttribute("stroke-linecap", "round");
                    pathsLayer.appendChild(core);
                } else {
                    // Standard mystical arc
                    conduit.setAttribute("stroke", "rgba(75, 145, 215, 0.42)");
                    conduit.setAttribute("stroke-width", "2.5");
                    conduit.setAttribute("stroke-linecap", "round");
                    pathsLayer.appendChild(conduit);
                }
            });
        }

        function handleTokenClick(i) {
            if (isSolved) return;

            if (selectedNode === null) {
                // First click: select this token, highlight its 2 paths and 2 target numbers
                selectedNode = i;
                renderTokens();
            } else if (selectedNode === i) {
                // Clicked the currently selected token -> deselect (lose focus)
                selectedNode = null;
                renderTokens();
            } else if (adjacency[selectedNode].includes(i)) {
                // Clicked one of the 2 glowing target numbers -> SWAP!
                performSwap(selectedNode, i);
            } else {
                // In glowing state, clicked ANY other non-connected number -> deselect (lose focus)
                selectedNode = null;
                renderTokens();
            }
        }

        function renderTokens() {
            tokensLayer.innerHTML = "";
            renderPaths();

            currentTokens.forEach((val, i) => {
                const pos = nodeCoords[i];
                const isSelected = selectedNode === i;
                const isTarget = selectedNode !== null && adjacency[selectedNode].includes(i);
                const isCorrect = val === targetAverages[i];

                const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
                g.setAttribute("class", "pq-wheel-token");
                g.setAttribute("data-index", i);
                g.style.cursor = isSolved ? "default" : "pointer";
                g.style.pointerEvents = "all";

                // Invisible large hit-area circle ensuring reliable clicks & touch targets
                const hitArea = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                hitArea.setAttribute("cx", pos.x);
                hitArea.setAttribute("cy", pos.y);
                hitArea.setAttribute("r", "30");
                hitArea.setAttribute("fill", "transparent");
                g.appendChild(hitArea);

                // Selection Ring
                if (isSelected) {
                    const selRing = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    selRing.setAttribute("cx", pos.x);
                    selRing.setAttribute("cy", pos.y);
                    selRing.setAttribute("r", "28");
                    selRing.setAttribute("fill", "none");
                    selRing.setAttribute("stroke", "#ffd700");
                    selRing.setAttribute("stroke-width", "3.5");
                    selRing.setAttribute("filter", "url(#pq-gold-glow)");
                    g.appendChild(selRing);
                } else if (isTarget) {
                    // Valid Swap Target Pulse Ring
                    const targetRing = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    targetRing.setAttribute("cx", pos.x);
                    targetRing.setAttribute("cy", pos.y);
                    targetRing.setAttribute("r", "28");
                    targetRing.setAttribute("fill", "none");
                    targetRing.setAttribute("stroke", "#00e5ff");
                    targetRing.setAttribute("stroke-width", "2.5");
                    targetRing.setAttribute("stroke-dasharray", "4,4");
                    targetRing.setAttribute("filter", "url(#pq-blue-glow)");
                    g.appendChild(targetRing);
                }

                // Medallion Coin Outer Base
                const coin = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                coin.setAttribute("cx", pos.x);
                coin.setAttribute("cy", pos.y);
                coin.setAttribute("r", "23");
                coin.setAttribute("fill", isCorrect ? "url(#pq-coin-blue-grad)" : "url(#pq-coin-grad)");
                coin.setAttribute("stroke", isCorrect ? "#00c8ff" : "#5a3414");
                coin.setAttribute("stroke-width", "2.5");
                if (isCorrect) {
                    coin.setAttribute("filter", "url(#pq-blue-glow)");
                } else {
                    coin.setAttribute("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.6))");
                }
                g.appendChild(coin);

                // Inner Medallion Inset Ring
                const innerRing = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                innerRing.setAttribute("cx", pos.x);
                innerRing.setAttribute("cy", pos.y);
                innerRing.setAttribute("r", "19");
                if (isCorrect) {
                    innerRing.setAttribute("fill", "rgba(0, 200, 255, 0.2)");
                    innerRing.setAttribute("stroke", "#00e5ff");
                    innerRing.setAttribute("stroke-width", "1.8");
                    innerRing.setAttribute("filter", "url(#pq-blue-glow)");
                } else {
                    innerRing.setAttribute("fill", "none");
                    innerRing.setAttribute("stroke", "rgba(255, 230, 160, 0.35)");
                    innerRing.setAttribute("stroke-width", "1");
                    innerRing.setAttribute("stroke-dasharray", "2,3");
                }
                g.appendChild(innerRing);

                // Active Number
                const numText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                numText.setAttribute("x", pos.x);
                numText.setAttribute("y", pos.y);
                numText.setAttribute("text-anchor", "middle");
                numText.setAttribute("dominant-baseline", "central");
                numText.setAttribute("font-size", "21px");
                numText.setAttribute("font-weight", "900");
                numText.setAttribute("font-family", "'Cinzel', Georgia, serif");

                if (isCorrect) {
                    // Brilliant sapphire / cyan blue glow just like the diamond in between
                    numText.setAttribute("fill", "#ffffff");
                    numText.setAttribute("stroke", "#00e5ff");
                    numText.setAttribute("stroke-width", "1.2");
                    numText.setAttribute("filter", "url(#pq-blue-glow)");
                } else {
                    numText.setAttribute("fill", "#2b1404");
                    numText.setAttribute("stroke", "#edd187");
                    numText.setAttribute("stroke-width", "0.6");
                    numText.setAttribute("filter", "drop-shadow(1px 2px 2px rgba(0,0,0,0.6))");
                }
                numText.textContent = val;
                g.appendChild(numText);

                // Reliable Click-to-swap
                g.onclick = (e) => {
                    e.stopPropagation();
                    handleTokenClick(i);
                };

                // Pointer events for Drag & Drop support
                let dragStartPos = null;
                let hasDragged = false;

                g.onpointerdown = (e) => {
                    if (isSolved) return;
                    dragStartPos = { x: e.clientX, y: e.clientY };
                    hasDragged = false;
                };

                g.onpointermove = (e) => {
                    if (!dragStartPos) return;
                    if (Math.hypot(e.clientX - dragStartPos.x, e.clientY - dragStartPos.y) > 10) {
                        hasDragged = true;
                    }
                };

                g.onpointerup = (e) => {
                    if (isSolved || !dragStartPos) return;
                    if (hasDragged) {
                        const targetEl = document.elementFromPoint(e.clientX, e.clientY);
                        const tokenGroup = targetEl ? targetEl.closest(".pq-wheel-token") : null;
                        if (tokenGroup) {
                            const targetIdx = parseInt(tokenGroup.getAttribute("data-index"), 10);
                            if (!isNaN(targetIdx) && adjacency[i].includes(targetIdx)) {
                                performSwap(i, targetIdx);
                            } else if (selectedNode !== null) {
                                selectedNode = null;
                                renderTokens();
                            }
                        } else if (selectedNode !== null) {
                            selectedNode = null;
                            renderTokens();
                        }
                    }
                    dragStartPos = null;
                    hasDragged = false;
                };

                tokensLayer.appendChild(g);
            });
        }

        function performSwap(nodeA, nodeB) {
            const temp = currentTokens[nodeA];
            currentTokens[nodeA] = currentTokens[nodeB];
            currentTokens[nodeB] = temp;

            selectedNode = null;
            shell.incrementMoves();
            if (typeof shell.playTone === "function") {
                shell.playTone(480, "triangle", 0.12, 0.18);
            }

            renderTokens();
            checkWin();
        }

        // Clicking anywhere outside glowing target tokens returns them to normal state (lose focus)
        function handleBackgroundClick(e) {
            if (isSolved || selectedNode === null) return;
            const tokenGroup = e.target.closest(".pq-wheel-token");
            if (!tokenGroup) {
                selectedNode = null;
                renderTokens();
            }
        }

        svgEl.addEventListener("click", handleBackgroundClick);
        container.addEventListener("click", handleBackgroundClick);

        function checkWin() {
            const allMatched = currentTokens.every((val, i) => val === targetAverages[i]);
            if (allMatched && !isSolved) {
                isSolved = true;
                selectedNode = null;
                renderTokens();

                feedbackEl.innerHTML = `<span style="color:var(--emerald); text-shadow:0 0 10px rgba(0,255,180,0.5);">✓ Temple Seal Aligned! All Numbers Equal Adjacent Averages!</span>`;

                setTimeout(() => {
                    shell.completeLevel();
                }, 850);
            }
        }

        shell.onReset = () => {
            currentTokens = [...initialTokens];
            selectedNode = null;
            isSolved = false;
            feedbackEl.innerHTML = "";
            renderTokens();
        };

        shell.cleanup = () => {
            svgEl.removeEventListener("click", handleBackgroundClick);
            container.removeEventListener("click", handleBackgroundClick);
        };

        renderTokens();
    }
};

// ─────────────────────────────────────────────────────────
// LEVEL 21: COLUMN SHUFFLE (62229.jpg)
// ─────────────────────────────────────────────────────────
window.PuzzleEngines.columnShuffle = {
    init: (container, puzzle, shell) => {
        // Symbols:
        // 0: Hammer (🔨)
        // 1: Sword (⚔️)
        // 2: Bow (🏹)
        // 3: Boxing glove (🥊)
        const symbols = ["🔨", "⚔️", "🏹", "🥊"];
        const symbolNames = ["Hammer", "Swords", "Bow", "Boxing Glove"];
        const symbolColors = ["#f59e0b", "#38bdf8", "#c084fc", "#ef4444"];
        const symbolBgs = [
            "linear-gradient(135deg, #3d2b10, #1f1405)", // Hammer
            "linear-gradient(135deg, #162f47, #0a1624)", // Sword
            "linear-gradient(135deg, #2b1d3d, #140b20)", // Bow
            "linear-gradient(135deg, #3d1717, #1f0808)"  // Boxing Glove
        ];
        const symbolBorders = ["#b47818", "#2a6fa8", "#8b4fbc", "#b83030"];

        // Initial layout requested by user:
        // B S S B -> [2, 1, 1, 2]
        // G B H H -> [3, 2, 0, 0] (and 5th column 2nd row is empty: null)
        // H S G G -> [0, 1, 3, 3]
        // B H G S -> [2, 0, 3, 1]
        const getInitialBoard = () => [
            [2, 1, 1, 2],
            [3, 2, 0, 0, null],
            [0, 1, 3, 3],
            [2, 0, 3, 1]
        ];

        let board = getInitialBoard();
        let isSolved = false;

        container.innerHTML = `
            <div class="pq-col-shuffle-scroll-wrapper">
                <div style="display: flex; flex-direction: column; align-items: center; width: max-content; min-width: 100%; margin: 0 auto; user-select: none;">
                    <!-- Main Tablet Frame -->
                    <div style="display: flex; gap: 18px; align-items: center; background: radial-gradient(circle at 50% 30%, #1e2820 0%, #0d1410 100%); border: 4px solid #3c4f42; border-radius: 16px; padding: 18px 22px; box-shadow: inset 0 0 40px rgba(0,0,0,0.85), 0 16px 36px rgba(0,0,0,0.6);">
                        
                        <!-- Left Side: Target Row Insignia Plaques -->
                        <div style="display: flex; flex-direction: column; align-items: center; padding-top: 40px;">
                            <div id="pq-row-plaques" style="display: flex; flex-direction: column; gap: 10px;">
                                ${[0, 1, 2, 3].map(r => `
                                    <div id="pq-row-plaque-${r}" style="width: 58px; height: 58px; background: #131c16; border: 2px solid #2f4035; border-radius: 10px; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 2px 6px rgba(0,0,0,0.6); transition: all 0.3s ease;">
                                        <span style="font-size: 28px; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">${symbols[r]}</span>
                                    </div>
                                `).join("")}
                            </div>
                        </div>

                        <!-- Center & Right: 4x4 Grid + Attached 5th Slot in Row 2 -->
                        <div style="display: flex; flex-direction: column; align-items: flex-start;">
                            <!-- Top Column Down Shift Buttons Only -->
                            <div style="display: flex; gap: 10px; margin-bottom: 8px;">
                                ${[0, 1, 2, 3].map(c => `
                                    <button class="pq-col-shift-btn" data-col="${c}" type="button" style="width: 58px; height: 32px; background: #18261e; border: 1.5px solid #3d5645; border-radius: 6px; color: var(--gold); font-size: 15px; font-weight: 900; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.4); transition: all 0.15s ease;" title="Shift Column ${c + 1} Down">▼</button>
                                `).join("")}
                            </div>

                            <!-- Grid Rows Container -->
                            <div id="pq-grid-rows" style="display: flex; flex-direction: column; gap: 10px; background: #0a110d; border: 2px solid #233328; border-radius: 12px; padding: 10px; box-shadow: inset 0 4px 15px rgba(0,0,0,0.7);">
                            </div>
                        </div>

                    </div>

                    <div id="pq-col-msg" style="min-height: 24px; margin-top: 14px; font-size: 14px; font-weight: 800; text-align: center; letter-spacing: 0.5px;"></div>
                </div>
            </div>
        `;

        const gridRowsEl = container.querySelector("#pq-grid-rows");
        const msgEl = container.querySelector("#pq-col-msg");

        // Find empty slot coordinates
        function getEmptyCoords() {
            for (let r = 0; r < 4; r++) {
                const numCols = (r === 1) ? 5 : 4;
                for (let c = 0; c < numCols; c++) {
                    if (board[r][c] === null) return { r, c };
                }
            }
            return { r: 1, c: 4 };
        }

        function render() {
            gridRowsEl.innerHTML = "";
            const empty = getEmptyCoords();

            for (let r = 0; r < 4; r++) {
                const rowEl = document.createElement("div");
                rowEl.style.display = "flex";
                rowEl.style.gap = "10px";
                rowEl.style.alignItems = "center";

                const numCols = (r === 1) ? 5 : 4;

                for (let c = 0; c < numCols; c++) {
                    const sym = board[r][c];
                    const isExtraSlot = (r === 1 && c === 4);

                    const slotEl = document.createElement("div");
                    slotEl.style.width = "58px";
                    slotEl.style.height = "58px";
                    slotEl.style.position = "relative";
                    slotEl.style.borderRadius = "8px";

                    if (sym === null) {
                        // Empty slot
                        slotEl.style.background = isExtraSlot ? "rgba(255, 215, 0, 0.05)" : "rgba(0,0,0,0.55)";
                        slotEl.style.border = isExtraSlot ? "2px dashed rgba(245, 197, 24, 0.5)" : "2px dashed rgba(255,255,255,0.15)";
                        slotEl.style.display = "flex";
                        slotEl.style.alignItems = "center";
                        slotEl.style.justifyContent = "center";
                        if (isExtraSlot) {
                            slotEl.innerHTML = `<span style="font-size:10px; font-weight:900; color:rgba(245,197,24,0.6); letter-spacing:0.5px;">SLOT</span>`;
                        }
                    } else {
                        // Tile element
                        slotEl.style.background = "rgba(0,0,0,0.3)";
                        slotEl.style.border = "1px solid rgba(255,255,255,0.06)";

                        const tileEl = document.createElement("div");
                        tileEl.className = "pq-shuffle-tile";
                        tileEl.style.width = "58px";
                        tileEl.style.height = "58px";
                        tileEl.style.borderRadius = "8px";
                        tileEl.style.background = symbolBgs[sym];
                        tileEl.style.border = `2px solid ${symbolBorders[sym]}`;
                        tileEl.style.boxShadow = "inset 0 1px 3px rgba(255,255,255,0.2), 0 4px 10px rgba(0,0,0,0.5)";
                        tileEl.style.display = "flex";
                        tileEl.style.flexDirection = "column";
                        tileEl.style.alignItems = "center";
                        tileEl.style.justifyContent = "center";
                        tileEl.style.cursor = isSolved ? "default" : "grab";
                        tileEl.style.position = "relative";
                        tileEl.style.touchAction = "none";

                        tileEl.innerHTML = `
                            <span style="font-size: 30px; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6)); pointer-events: none;">${symbols[sym]}</span>
                        `;

                        // Check if tile can move horizontally into adjacent empty slot
                        const isAdjacentToEmpty = (r === empty.r && Math.abs(c - empty.c) === 1);

                        if (isAdjacentToEmpty && !isSolved) {
                            // Setup horizontal drag
                            let dragData = null;

                            tileEl.onpointerdown = (e) => {
                                if (isSolved) return;
                                e.preventDefault();
                                const direction = (empty.c > c) ? 1 : -1; // 1 = right, -1 = left
                                dragData = {
                                    r,
                                    c,
                                    emptyR: empty.r,
                                    emptyC: empty.c,
                                    startX: e.clientX,
                                    direction,
                                    moved: 0
                                };
                                tileEl.setPointerCapture(e.pointerId);
                                tileEl.style.transition = "none";
                                tileEl.style.zIndex = "25";
                                tileEl.style.cursor = "grabbing";
                            };

                            tileEl.onpointermove = (e) => {
                                if (!dragData) return;
                                const dx = e.clientX - dragData.startX;
                                const maxDist = 68; // 58px cell + 10px gap

                                let clampedDx = 0;
                                if (dragData.direction === 1) {
                                    clampedDx = Math.max(0, Math.min(maxDist, dx));
                                } else {
                                    clampedDx = Math.min(0, Math.max(-maxDist, dx));
                                }
                                dragData.moved = clampedDx;
                                tileEl.style.transform = `translateX(${clampedDx}px)`;
                            };

                            tileEl.onpointerup = (e) => {
                                if (!dragData) return;
                                try { tileEl.releasePointerCapture(e.pointerId); } catch (err) {}

                                const threshold = 24; // Drag threshold to trigger move

                                if (Math.abs(dragData.moved) >= threshold) {
                                    // Move tile into empty slot
                                    const fromR = dragData.r;
                                    const fromC = dragData.c;
                                    const toR = dragData.emptyR;
                                    const toC = dragData.emptyC;

                                    board[toR][toC] = board[fromR][fromC];
                                    board[fromR][fromC] = null;

                                    shell.incrementMoves();
                                    if (typeof shell.playTone === "function") {
                                        shell.playTone(380, "sine", 0.08, 0.1);
                                    }
                                    dragData = null;
                                    render();
                                    checkWin();
                                } else {
                                    // Snap back to origin
                                    tileEl.style.transition = "transform 0.18s ease-out";
                                    tileEl.style.transform = "translateX(0px)";
                                    tileEl.style.cursor = "grab";
                                    setTimeout(() => {
                                        tileEl.style.zIndex = "1";
                                        tileEl.style.transition = "none";
                                    }, 200);
                                    dragData = null;
                                }
                            };

                            tileEl.onpointercancel = () => {
                                if (!dragData) return;
                                tileEl.style.transition = "transform 0.18s ease-out";
                                tileEl.style.transform = "translateX(0px)";
                                tileEl.style.cursor = "grab";
                                dragData = null;
                            };
                        } else {
                            // Clicking or dragging non-adjacent tiles does nothing
                            tileEl.style.cursor = "not-allowed";
                        }

                        slotEl.appendChild(tileEl);
                    }

                    rowEl.appendChild(slotEl);
                }

                gridRowsEl.appendChild(rowEl);
            }

            // Update row plaque indicator glows
            checkRowStatus();
        }

        function checkRowStatus() {
            for (let r = 0; r < 4; r++) {
                const targetSym = r; // Row 0: Hammer, Row 1: Sword, Row 2: Bow, Row 3: Glove
                let rowComplete = true;
                for (let c = 0; c < 4; c++) {
                    if (board[r][c] !== targetSym) {
                        rowComplete = false;
                        break;
                    }
                }
                const plaque = container.querySelector(`#pq-row-plaque-${r}`);
                if (plaque) {
                    if (rowComplete) {
                        plaque.style.borderColor = "var(--emerald)";
                        plaque.style.boxShadow = "0 0 14px rgba(0, 255, 170, 0.45)";
                        plaque.style.background = "#0e2b1a";
                    } else {
                        plaque.style.borderColor = "#2f4035";
                        plaque.style.boxShadow = "inset 0 2px 6px rgba(0,0,0,0.6)";
                        plaque.style.background = "#131c16";
                    }
                }
            }
        }

        // Column downward shift buttons
        container.querySelectorAll(".pq-col-shift-btn").forEach(btn => {
            btn.onclick = () => {
                if (isSolved) return;
                const c = Number(btn.dataset.col);

                // Shift column c downward (bottom wraps to top)
                const temp = board[3][c];
                board[3][c] = board[2][c];
                board[2][c] = board[1][c];
                board[1][c] = board[0][c];
                board[0][c] = temp;

                shell.incrementMoves();
                if (typeof shell.playTone === "function") {
                    shell.playTone(430, "triangle", 0.08, 0.12);
                }
                render();
                checkWin();
            };
        });

        function checkWin() {
            let won = true;
            for (let r = 0; r < 4; r++) {
                for (let c = 0; c < 4; c++) {
                    if (board[r][c] !== r) {
                        won = false;
                        break;
                    }
                }
                if (!won) break;
            }
            // Extra 5th slot must be empty
            if (board[1][4] !== null) won = false;

            if (won && !isSolved) {
                isSolved = true;
                msgEl.innerHTML = `<span style="color:var(--emerald); text-shadow:0 0 12px rgba(0,255,170,0.6);">✓ Complete! All 4 Insignia Rows Aligned!</span>`;
                setTimeout(() => {
                    shell.completeLevel();
                }, 850);
            }
        }

        shell.onReset = () => {
            board = getInitialBoard();
            isSolved = false;
            msgEl.innerHTML = "";
            render();
        };

        shell.cleanup = () => {};

        render();
    }
};

// ─────────────────────────────────────────────────────────
// LEVEL 22: MASK LOGIC GRID (62233.jpg)
// ─────────────────────────────────────────────────────────
window.PuzzleEngines.maskLogic = {
    init: (container, puzzle, shell) => {
        // 4x4 grid of 16 masks: 4 colors x 4 emotions
        // Colors: 0: Bronze, 1: Gold, 2: Silver, 3: Wood
        // Emotions: 0: Happy, 1: Sad, 2: Surprised, 3: Angry
        const colorStyles = [
            { name: "Bronze", border: "#78716c", bg: "#44403c" },
            { name: "Gold", border: "#f59e0b", bg: "#78350f" },
            { name: "Silver", border: "#e2e8f0", bg: "#475569" },
            { name: "Wood", border: "#b45309", bg: "#451a03" }
        ];
        const emotionIcons = ["😄", "😢", "😲", "😠"];

        // Initial layout from reference (62233.jpg):
        const getInitialGrid = () => [
            [{ c: 0, e: 3 }, { c: 1, e: 0 }, { c: 2, e: 1 }, { c: 3, e: 2 }],
            [{ c: 1, e: 1 }, { c: 1, e: 2 }, { c: 0, e: 2 }, { c: 1, e: 3 }],
            [{ c: 0, e: 0 }, { c: 2, e: 2 }, { c: 2, e: 0 }, { c: 2, e: 3 }],
            [{ c: 3, e: 1 }, { c: 0, e: 1 }, { c: 3, e: 0 }, { c: 3, e: 3 }]
        ];

        let grid = getInitialGrid();
        let selected = null;

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 520px; margin: 0 auto;">
                <div style="font-size: 13px; font-weight: 800; color: var(--gold); margin-bottom: 12px;">
                    EVERY ROW AND COLUMN MUST HAVE 4 UNIQUE COLORS AND 4 UNIQUE EMOTIONS
                </div>

                <div id="pq-mask-grid" style="display: grid; grid-template-columns: repeat(4, 68px); grid-template-rows: repeat(4, 68px); gap: 8px; background: #030914; border: 3px solid var(--panel-border); border-radius: 12px; padding: 12px;">
                </div>

                <div id="pq-mask-msg" style="min-height: 24px; margin-top: 14px; font-size: 13px; font-weight: 700;"></div>
            </div>
        `;

        const gridEl = container.querySelector("#pq-mask-grid");
        const msgEl = container.querySelector("#pq-mask-msg");

        function render() {
            gridEl.innerHTML = "";

            for (let r = 0; r < 4; r++) {
                for (let c = 0; c < 4; c++) {
                    const mask = grid[r][c];
                    const colStyle = colorStyles[mask.c];
                    const cell = document.createElement("div");
                    const isSel = selected && selected[0] === r && selected[1] === c;

                    cell.style.width = "68px";
                    cell.style.height = "68px";
                    cell.style.borderRadius = "10px";
                    cell.style.background = colStyle.bg;
                    cell.style.border = `3px solid ${isSel ? 'var(--gold)' : colStyle.border}`;
                    cell.style.display = "flex";
                    cell.style.alignItems = "center";
                    cell.style.justifyContent = "center";
                    cell.style.fontSize = "30px";
                    cell.style.cursor = "pointer";
                    cell.innerText = emotionIcons[mask.e];

                    cell.onclick = () => {
                        if (!selected) {
                            selected = [r, c];
                            render();
                        } else if (selected[0] === r && selected[1] === c) {
                            selected = null;
                            render();
                        } else {
                            // Swap
                            const [sr, sc] = selected;
                            [grid[sr][sc], grid[r][c]] = [grid[r][c], grid[sr][sc]];
                            selected = null;
                            shell.incrementMoves();
                            render();
                            checkWin();
                        }
                    };

                    gridEl.appendChild(cell);
                }
            }
        }

        function checkWin() {
            // Check Graeco-Latin conditions
            let valid = true;
            for (let r = 0; r < 4; r++) {
                const colorsInRow = new Set();
                const emotsInRow = new Set();
                for (let c = 0; c < 4; c++) {
                    colorsInRow.add(grid[r][c].c);
                    emotsInRow.add(grid[r][c].e);
                }
                if (colorsInRow.size !== 4 || emotsInRow.size !== 4) valid = false;
            }

            for (let c = 0; c < 4; c++) {
                const colorsInCol = new Set();
                const emotsInCol = new Set();
                for (let r = 0; r < 4; r++) {
                    colorsInCol.add(grid[r][c].c);
                    emotsInCol.add(grid[r][c].e);
                }
                if (colorsInCol.size !== 4 || emotsInCol.size !== 4) valid = false;
            }

            if (valid) {
                msgEl.innerHTML = `<span style="color:var(--emerald);">✓ Complete! Perfect Graeco-Latin Mask Square achieved!</span>`;
                setTimeout(() => {
                    shell.completeLevel();
                }, 800);
            }
        }

        render();
    }
};

// ─────────────────────────────────────────────────────────
// LEVEL 23: TRIANGLE MOSAIC (level23-village.jpg)
// 3 Rows, 31 Pieces (Row 1: 9 pcs, Row 2: 11 pcs, Row 3: 11 pcs)
// Alternating upright (▲) and inverted (▼) triangular jigsaw pieces.
// Upright can only swap with upright; inverted only with inverted.
// ─────────────────────────────────────────────────────────
window.PuzzleEngines.triangleMosaic = {
    init: (container, puzzle, shell) => {
        // Construct the 31 slot geometry:
        // Coordinate system: 6W wide x 3H high (aspect ratio: 600 / 259.8076)
        // Row 0: 9 slots (c = 0..8, 5 up, 4 down), centered (offset 0.5W)
        // Row 1: 11 slots (c = 0..10, 6 up, 5 down), starts at x=0
        // Row 2: 11 slots (c = 0..10, 5 up, 6 down), starts at x=0 (down-first to seamlessly mesh with row 1)
        const SLOTS = [];

        // Row 0: 9 pieces
        for (let c = 0; c < 9; c++) {
            const orient = (c % 2 === 0) ? "up" : "down";
            const leftPct = ((0.5 + c * 0.5) / 6) * 100;
            const topPct = 0;
            SLOTS.push({ id: SLOTS.length, row: 0, col: c, orient, leftPct, topPct });
        }

        // Row 1: 11 pieces
        for (let c = 0; c < 11; c++) {
            const orient = (c % 2 === 0) ? "up" : "down";
            const leftPct = ((c * 0.5) / 6) * 100;
            const topPct = 100 / 3;
            SLOTS.push({ id: SLOTS.length, row: 1, col: c, orient, leftPct, topPct });
        }

        // Row 2: 11 pieces
        for (let c = 0; c < 11; c++) {
            const orient = (c % 2 === 0) ? "down" : "up";
            const leftPct = ((c * 0.5) / 6) * 100;
            const topPct = (200 / 3);
            SLOTS.push({ id: SLOTS.length, row: 2, col: c, orient, leftPct, topPct });
        }

        const upSlots = SLOTS.filter(s => s.orient === "up").map(s => s.id);
        const downSlots = SLOTS.filter(s => s.orient === "down").map(s => s.id);

        function generateScramble() {
            const upPerm = [...upSlots];
            const downPerm = [...downSlots];

            const shuffle = (arr) => {
                for (let i = arr.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [arr[i], arr[j]] = [arr[j], arr[i]];
                }
            };

            let attempts = 0;
            do {
                shuffle(upPerm);
                attempts++;
            } while (attempts < 100 && upPerm.some((val, idx) => val === upSlots[idx]));

            attempts = 0;
            do {
                shuffle(downPerm);
                attempts++;
            } while (attempts < 100 && downPerm.some((val, idx) => val === downSlots[idx]));

            const b = new Array(31);
            upSlots.forEach((slotId, idx) => {
                b[slotId] = upPerm[idx];
            });
            downSlots.forEach((slotId, idx) => {
                b[slotId] = downPerm[idx];
            });
            return b;
        }

        let board = generateScramble();
        let selected = null;
        let glowingIndices = [];
        let isComplete = false;
        const tileDataUrls = {};

        container.innerHTML = `
            <div class="pq-tri-container">
                <div class="pq-tri-scroll-wrap">
                    <div id="pq-tri-board" class="pq-tri-board"></div>
                </div>
                <div class="pq-tri-status-bar">
                    <span id="pq-tri-count" style="color: var(--cyan);">Pieces Placed: 0 / 31</span>
                    <span id="pq-tri-msg" style="color: var(--gold); font-size: 12px;"></span>
                </div>
            </div>
        `;

        const boardEl = container.querySelector("#pq-tri-board");
        const countEl = container.querySelector("#pq-tri-count");
        const msgEl = container.querySelector("#pq-tri-msg");

        // Pre-slice image into individual high-DPI triangular PNG Data URLs
        function sliceSource(source) {
            try {
                const srcW = source.naturalWidth || source.width;
                const srcH = source.naturalHeight || source.height;
                if (!srcW || !srcH) return;

                const targetAspect = 600 / 259.8076;
                let cropX = 0, cropY = 0, cropW = srcW, cropH = srcH;
                const currentAspect = srcW / srcH;
                if (currentAspect > targetAspect) {
                    cropW = srcH * targetAspect;
                    cropX = (srcW - cropW) / 2;
                } else {
                    cropH = srcW / targetAspect;
                    cropY = (srcH - cropH) / 2;
                }

                const exportW = 240;
                const exportH = 208; // 240 * (H/W) where H/W = sqrt(3)/2 ~= 0.866
                const tileCanvas = document.createElement("canvas");
                tileCanvas.width = exportW;
                tileCanvas.height = exportH;
                const tileCtx = tileCanvas.getContext("2d");

                SLOTS.forEach(slot => {
                    const boxSrcX = cropX + (slot.leftPct / 100) * cropW;
                    const boxSrcY = cropY + (slot.topPct / 100) * cropH;
                    const boxSrcW = (1 / 6) * cropW;
                    const boxSrcH = (1 / 3) * cropH;

                    tileCtx.clearRect(0, 0, exportW, exportH);
                    tileCtx.save();
                    tileCtx.beginPath();
                    if (slot.orient === "up") {
                        tileCtx.moveTo(exportW / 2, 0);
                        tileCtx.lineTo(exportW, exportH);
                        tileCtx.lineTo(0, exportH);
                    } else {
                        tileCtx.moveTo(0, 0);
                        tileCtx.lineTo(exportW, 0);
                        tileCtx.lineTo(exportW / 2, exportH);
                    }
                    tileCtx.closePath();
                    tileCtx.clip();

                    tileCtx.drawImage(source, boxSrcX, boxSrcY, boxSrcW, boxSrcH, 0, 0, exportW, exportH);

                    tileCtx.strokeStyle = "rgba(255, 255, 255, 0.4)";
                    tileCtx.lineWidth = 3;
                    tileCtx.stroke();
                    tileCtx.restore();

                    tileDataUrls[slot.id] = tileCanvas.toDataURL("image/jpeg", 0.94);
                });
            } catch (err) {
                console.warn("Level 23 slice error:", err);
            }
            render();
        }

        // Load reference image
        const imgPath = "puzzle-references/" + (puzzle.referenceAsset || (puzzle.config && puzzle.config.reference) || "level23-village.jpg");
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => sliceSource(img);
        img.onerror = () => {
            console.warn("Failed to load village image, using procedural fallbacks.");
            render();
        };
        img.src = imgPath;

        // Hint handler: find 2 currently ill-placed pieces with matching orientation
        // such that swapping them places at least one piece into its correct position
        shell.onHintDismissed = () => {
            if (isComplete) return;
            const incorrectIndices = [];
            for (let i = 0; i < 31; i++) {
                if (board[i] !== i) incorrectIndices.push(i);
            }
            if (incorrectIndices.length < 2) return;

            let foundPair = null;
            for (const i of incorrectIndices) {
                const targetSlotForPieceAtI = board.indexOf(i);
                if (targetSlotForPieceAtI !== -1 && targetSlotForPieceAtI !== i) {
                    if (board[targetSlotForPieceAtI] !== targetSlotForPieceAtI) {
                        foundPair = [i, targetSlotForPieceAtI];
                        break;
                    }
                }
            }

            if (!foundPair) {
                // Fallback to any two incorrect pieces with same orientation
                const incUp = incorrectIndices.filter(i => SLOTS[i].orient === "up");
                if (incUp.length >= 2) foundPair = [incUp[0], incUp[1]];
                else {
                    const incDown = incorrectIndices.filter(i => SLOTS[i].orient === "down");
                    if (incDown.length >= 2) foundPair = [incDown[0], incDown[1]];
                }
            }

            if (foundPair) {
                glowingIndices = foundPair;
                render();
            }
        };

        shell.onReset = () => {
            board = generateScramble();
            selected = null;
            glowingIndices = [];
            isComplete = false;
            msgEl.textContent = "";
            render();
        };

        function onPieceClick(slotIdx) {
            if (isComplete) return;

            // Clear glowing hints when player makes an interaction
            if (glowingIndices.length > 0) {
                glowingIndices = [];
            }

            if (selected === null) {
                selected = slotIdx;
                msgEl.textContent = "";
                render();
                return;
            }

            if (selected === slotIdx) {
                selected = null;
                render();
                return;
            }

            // Enforce orientation rule: Upright can only swap with Upright; Inverted only with Inverted
            const sourceSlot = SLOTS[selected];
            const targetSlot = SLOTS[slotIdx];

            if (sourceSlot.orient !== targetSlot.orient) {
                msgEl.innerHTML = `<span style="color:var(--crimson);">Cannot swap: Upright pieces swap only with upright!</span>`;
                selected = slotIdx; // Friendly switch selection to clicked piece
                render();
                return;
            }

            // Swap pieces
            const temp = board[selected];
            board[selected] = board[slotIdx];
            board[slotIdx] = temp;
            selected = null;
            msgEl.textContent = "";

            shell.incrementMoves();
            render();

            // Win condition check
            if (board.every((pId, idx) => pId === idx)) {
                isComplete = true;
                countEl.innerHTML = `<span style="color:var(--emerald);">✓ 31 / 31 Pieces Placed!</span>`;
                msgEl.innerHTML = `<span style="color:var(--emerald);">Village Mosaic Restored!</span>`;
                setTimeout(() => {
                    shell.completeLevel();
                }, 800);
            }
        }

        function render() {
            boardEl.innerHTML = "";
            let correctCount = 0;

            for (let i = 0; i < 31; i++) {
                const pieceId = board[i];
                const slot = SLOTS[i];
                if (pieceId === i) correctCount++;

                const el = document.createElement("div");
                el.className = "pq-tri-piece";
                if (selected === i) el.classList.add("selected");
                if (glowingIndices.includes(i)) el.classList.add("glowing");

                el.style.left = `${slot.leftPct}%`;
                el.style.top = `${slot.topPct}%`;
                el.style.width = `${100 / 6}%`;
                el.style.height = `${100 / 3}%`;

                const clip = slot.orient === "up"
                    ? "polygon(50% 0%, 100% 100%, 0% 100%)"
                    : "polygon(0% 0%, 100% 0%, 50% 100%)";
                el.style.clipPath = clip;
                el.style.webkitClipPath = clip;

                if (tileDataUrls[pieceId]) {
                    el.style.backgroundImage = `url("${tileDataUrls[pieceId]}")`;
                } else {
                    // Procedural fallback
                    el.style.background = slot.orient === "up"
                        ? "linear-gradient(135deg, #2563eb, #1e40af)"
                        : "linear-gradient(135deg, #d97706, #92400e)";
                }

                el.onclick = () => onPieceClick(i);
                boardEl.appendChild(el);
            }

            // Render crisp, prominent boundary overlays for glowing hint pieces
            glowingIndices.forEach(glowSlotIdx => {
                const slot = SLOTS[glowSlotIdx];
                const overlay = document.createElement("div");
                overlay.className = "pq-tri-boundary-overlay glowing";
                overlay.style.left = `${slot.leftPct}%`;
                overlay.style.top = `${slot.topPct}%`;
                overlay.style.width = `${100 / 6}%`;
                overlay.style.height = `${100 / 3}%`;

                const pts = slot.orient === "up"
                    ? "50,2 98,98 2,98"
                    : "2,2 98,2 50,98";

                overlay.innerHTML = `
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%; height:100%; display:block; overflow:visible;">
                        <polygon points="${pts}" fill="rgba(255, 215, 0, 0.28)" stroke="#ffd700" stroke-width="5" stroke-linejoin="round" />
                    </svg>
                `;
                overlay.onclick = () => onPieceClick(glowSlotIdx);
                boardEl.appendChild(overlay);
            });

            // Boundary overlay for selected piece
            if (selected !== null && !glowingIndices.includes(selected)) {
                const slot = SLOTS[selected];
                const overlay = document.createElement("div");
                overlay.className = "pq-tri-boundary-overlay selected";
                overlay.style.left = `${slot.leftPct}%`;
                overlay.style.top = `${slot.topPct}%`;
                overlay.style.width = `${100 / 6}%`;
                overlay.style.height = `${100 / 3}%`;

                const pts = slot.orient === "up"
                    ? "50,2 98,98 2,98"
                    : "2,2 98,2 50,98";

                overlay.innerHTML = `
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%; height:100%; display:block; overflow:visible;">
                        <polygon points="${pts}" fill="rgba(0, 200, 255, 0.2)" stroke="#00c8ff" stroke-width="4.5" stroke-linejoin="round" />
                    </svg>
                `;
                overlay.onclick = () => onPieceClick(selected);
                boardEl.appendChild(overlay);
            }

            if (!isComplete) {
                countEl.textContent = `Pieces Placed: ${correctCount} / 31`;
            }
        }

        render();
    }
};

