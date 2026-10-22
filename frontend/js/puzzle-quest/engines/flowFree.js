"use strict";

/**
 * ENGINE: Flow Free
 * Level 15 (5×5 Quick Flow, 5 color pairs)
 * Level 45 (7×7 Master Flow, 6 color pairs)
 */

window.PuzzleEngines = window.PuzzleEngines || {};

window.PuzzleEngines.flowFree = {
    init: (container, puzzle, shell) => {
        const size = puzzle.config.size || 5;
        const pairs = puzzle.config.pairs;
        const totalCells = size * size;

        // Board grid cells: each cell has { color, symbol, isEndpoint }
        // Paths: map of color -> array of [r, c]
        let paths = {};
        pairs.forEach(p => paths[p.color] = []);

        let activeColor = null;
        let isDrawing = false;

        const isDense = size >= 10;
        const gap = isDense ? 2 : 4;
        const maxBoardWidth = isDense ? 360 : 340;
        const cellSize = Math.min(Math.floor((maxBoardWidth - (size - 1) * gap) / size), 56);
        const radius = Math.max(2, Math.round(cellSize * 0.15));
        const fontSize = Math.max(10, Math.round(cellSize * 0.45));

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; width: 100%;">
                <div style="display: flex; gap: 16px; margin-bottom: 12px; font-size: 13px; font-weight: 800;">
                    <span style="color:var(--gold);">CONNECTED: <strong id="pq-flow-connected" style="color:#fff;">0</strong> / ${pairs.length}</span>
                    <span style="color:var(--cyan);">BOARD COVER: <strong id="pq-flow-cover" style="color:#fff;">0%</strong></span>
                </div>

                <div class="pq-flow-grid" id="pq-flow-board" style="display: grid; grid-template-columns: repeat(${size}, ${cellSize}px); grid-template-rows: repeat(${size}, ${cellSize}px); gap: ${gap}px; background: #030a16; border: 3px solid var(--panel-border); border-radius: 12px; padding: 6px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6); user-select: none; touch-action: none; max-width: 100%; box-sizing: content-box;">
                    <!-- Cells injected by JS -->
                </div>

                <div style="font-size: 12px; color: rgba(255, 255, 255, 0.6); margin-top: 14px;">
                    Drag from a colored dot to its match. Connect all pairs and cover 100% of the board!
                </div>
            </div>
        `;

        const boardEl = container.querySelector("#pq-flow-board");
        const connEl = container.querySelector("#pq-flow-connected");
        const coverEl = container.querySelector("#pq-flow-cover");

        function getEndpoint(r, c) {
            for (const p of pairs) {
                if ((p.a[0] === r && p.a[1] === c) || (p.b[0] === r && p.b[1] === c)) {
                    return p;
                }
            }
            return null;
        }

        function getCellColor(r, c) {
            const ep = getEndpoint(r, c);
            if (ep) return ep.color;
            for (const [col, path] of Object.entries(paths)) {
                if (path.some(([pr, pc]) => pr === r && pc === c)) {
                    return col;
                }
            }
            return null;
        }

        // Build grid cells once
        const cellEls = [];
        for (let r = 0; r < size; r++) {
            cellEls[r] = [];
            for (let c = 0; c < size; c++) {
                const cell = document.createElement("div");
                cell.className = "pq-flow-cell";
                cell.dataset.r = r;
                cell.dataset.c = c;
                cell.style.width = `${cellSize}px`;
                cell.style.height = `${cellSize}px`;
                cell.style.borderRadius = `${radius}px`;
                cell.style.display = "flex";
                cell.style.alignItems = "center";
                cell.style.justifyContent = "center";
                cell.style.fontSize = `${fontSize}px`;
                cell.style.fontWeight = "900";
                cell.style.cursor = "pointer";
                cell.style.transition = "background-color 0.1s";

                const ep = getEndpoint(r, c);
                if (ep) {
                    cell.style.background = ep.color;
                    cell.style.color = ep.color === "#ffffff" ? "#000000" : "#ffffff";
                    cell.style.boxShadow = `0 0 10px ${ep.color}`;
                    cell.innerText = ep.symbol || "●";
                } else {
                    cell.style.background = "#0d1b30";
                }

                cellEls[r][c] = cell;
                boardEl.appendChild(cell);
            }
        }

        function updateBoard() {
            let coveredCount = 0;
            let connectedCount = 0;

            for (let r = 0; r < size; r++) {
                for (let c = 0; c < size; c++) {
                    const cell = cellEls[r][c];
                    const ep = getEndpoint(r, c);
                    const color = getCellColor(r, c);

                    if (ep) {
                        cell.style.background = ep.color;
                        cell.style.color = ep.color === "#ffffff" ? "#000000" : "#ffffff";
                        cell.style.boxShadow = `0 0 10px ${ep.color}`;
                        cell.innerText = ep.symbol || "●";
                        coveredCount++;
                    } else if (color) {
                        cell.style.background = color;
                        cell.style.opacity = "0.75";
                        cell.style.borderRadius = isDense ? "2px" : "4px";
                        cell.style.boxShadow = "none";
                        cell.innerText = "";
                        coveredCount++;
                    } else {
                        cell.style.background = "#0d1b30";
                        cell.style.opacity = "1";
                        cell.style.borderRadius = `${radius}px`;
                        cell.style.boxShadow = "none";
                        cell.innerText = "";
                    }
                }
            }

            // Check how many pairs are connected
            for (const p of pairs) {
                const path = paths[p.color];
                if (path.length > 0) {
                    const start = path[0];
                    const end = path[path.length - 1];
                    const touchesA = (start[0] === p.a[0] && start[1] === p.a[1]) || (end[0] === p.a[0] && end[1] === p.a[1]);
                    const touchesB = (start[0] === p.b[0] && start[1] === p.b[1]) || (end[0] === p.b[0] && end[1] === p.b[1]);
                    if (touchesA && touchesB) {
                        connectedCount++;
                    }
                }
            }

            connEl.innerText = connectedCount;
            const pct = Math.round((coveredCount / totalCells) * 100);
            coverEl.innerText = `${pct}%`;

            // Win condition: all connected AND 100% covered!
            if (connectedCount === pairs.length && coveredCount === totalCells) {
                setTimeout(() => {
                    shell.completeLevel();
                }, 600);
            }
        }

        function handleMoveTo(r, c) {
            if (!isDrawing || !activeColor) return;
            const path = paths[activeColor];
            if (path.length === 0) return;

            const last = path[path.length - 1];
            const dr = Math.abs(r - last[0]);
            const dc = Math.abs(c - last[1]);

            // Must be orthogonally adjacent
            if (dr + dc === 1) {
                // Check if hitting another pair's endpoint
                const ep = getEndpoint(r, c);
                if (ep && ep.color !== activeColor) return;

                // Check if cell already used by another color's path
                for (const [col, p] of Object.entries(paths)) {
                    if (col !== activeColor && p.some(([pr, pc]) => pr === r && pc === c)) {
                        return;
                    }
                }

                // If moving back to previous cell in own path: erase tail
                if (path.length > 1 && path[path.length - 2][0] === r && path[path.length - 2][1] === c) {
                    path.pop();
                    updateBoard();
                    return;
                }

                // If cell is not already in own path
                if (!path.some(([pr, pc]) => pr === r && pc === c)) {
                    path.push([r, c]);
                    shell.incrementMoves();
                    updateBoard();

                    // If reached matching endpoint, stop drawing
                    if (ep && ep.color === activeColor && (r !== path[0][0] || c !== path[0][1])) {
                        isDrawing = false;
                        activeColor = null;
                    }
                }
            }
        }

        boardEl.onpointerdown = (e) => {
            const target = e.target.closest(".pq-flow-cell");
            if (!target) return;
            e.preventDefault();
            const r = Number(target.dataset.r);
            const c = Number(target.dataset.c);
            const ep = getEndpoint(r, c);
            if (ep) {
                activeColor = ep.color;
                isDrawing = true;
                paths[activeColor] = [[r, c]];
                updateBoard();
            } else {
                const color = getCellColor(r, c);
                if (color) {
                    paths[color] = [];
                    updateBoard();
                }
            }
        };

        boardEl.onpointermove = (e) => {
            if (!isDrawing || !activeColor) return;
            const el = document.elementFromPoint(e.clientX, e.clientY);
            const cell = el ? el.closest(".pq-flow-cell") : null;
            if (cell && cell.dataset && cell.dataset.r !== undefined) {
                handleMoveTo(Number(cell.dataset.r), Number(cell.dataset.c));
            }
        };

        const stopDrawing = () => {
            isDrawing = false;
            activeColor = null;
        };

        window.addEventListener("pointerup", stopDrawing);
        window.addEventListener("pointercancel", stopDrawing);

        updateBoard();

        shell.onReset = () => {
            pairs.forEach(p => paths[p.color] = []);
            activeColor = null;
            isDrawing = false;
            updateBoard();
        };

        shell.cleanup = () => {
            window.removeEventListener("pointerup", stopDrawing);
            window.removeEventListener("pointercancel", stopDrawing);
        };
    }
};

