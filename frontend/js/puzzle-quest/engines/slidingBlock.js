"use strict";

/**
 * ENGINE: Sliding Block (Unblock Me Style)
 * Level 6 (5×5 Quick Escape)
 * Level 44 (6×6 Master Escape)
 */

window.PuzzleEngines = window.PuzzleEngines || {};

window.PuzzleEngines.slidingBlock = {
    init: (container, puzzle, shell) => {
        const boardSize = puzzle.config.boardSize || 5;
        const exitRow = puzzle.config.exitRow || 2;
        const targetId = puzzle.config.targetBlockId || "target";

        // Deep copy starting blocks
        let blocks = JSON.parse(JSON.stringify(puzzle.config.blocks));
        const cellSize = Math.min(360 / boardSize, 70);

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; width: 100%;">
                <div style="font-size: 13px; font-weight: 800; color: var(--gold); margin-bottom: 12px;">
                    SLIDE BLOCKS ALONG THEIR TRACK TO FREE THE RED BLOCK
                </div>

                <div class="pq-unblock-board" id="pq-unblock-board" style="width: ${boardSize * cellSize}px; height: ${boardSize * cellSize}px; box-sizing: content-box;">
                    <div class="pq-unblock-exit-notch" style="top: ${exitRow * cellSize}px; height: ${cellSize}px;"></div>
                </div>

                <div style="font-size: 12px; color: rgba(255, 255, 255, 0.6); margin-top: 14px;">
                    Click or drag a block along its axis to move it into free space.
                </div>
            </div>
        `;

        const boardEl = container.querySelector("#pq-unblock-board");

        function getOccupiedGrid(excludeId = null) {
            const grid = Array.from({ length: boardSize }, () => Array(boardSize).fill(null));
            for (const b of blocks) {
                if (b.id === excludeId) continue;
                for (let i = 0; i < b.length; i++) {
                    const r = b.orientation === "h" ? b.row : b.row + i;
                    const c = b.orientation === "h" ? b.col + i : b.col;
                    if (r >= 0 && r < boardSize && c >= 0 && c < boardSize) {
                        grid[r][c] = b.id;
                    }
                }
            }
            return grid;
        }

        function render() {
            // Remove existing block elements
            const existingEls = boardEl.querySelectorAll(".pq-unblock-block");
            existingEls.forEach(el => el.remove());

            for (const b of blocks) {
                const blockEl = document.createElement("div");
                blockEl.className = `pq-unblock-block ${b.id === targetId ? "target" : ""}`;
                blockEl.dataset.id = b.id;

                const w = b.orientation === "h" ? b.length * cellSize - 4 : cellSize - 4;
                const h = b.orientation === "v" ? b.length * cellSize - 4 : cellSize - 4;

                blockEl.style.width = `${w}px`;
                blockEl.style.height = `${h}px`;
                blockEl.style.top = `${b.row * cellSize + 2}px`;
                blockEl.style.left = `${b.col * cellSize + 2}px`;
                if (b.color && b.id !== targetId) {
                    blockEl.style.background = b.color;
                    blockEl.style.border = `2px solid rgba(255,255,255,0.25)`;
                }
                if (b.id === targetId) {
                    blockEl.innerHTML = `<span style="font-size: 18px; font-weight: 900; letter-spacing: 2px; color: #fff; pointer-events: none; user-select: none;">❯❯❯</span>`;
                }

                setupDrag(blockEl, b);
                boardEl.appendChild(blockEl);
            }
        }

        function setupDrag(element, block) {
            let startCoord = 0;
            let currentCoord = 0;
            let initialOffset = 0;
            let isDragging = false;

            const onPointerDown = (e) => {
                e.preventDefault();
                isDragging = true;
                element.setPointerCapture(e.pointerId);

                const isH = block.orientation === "h";
                startCoord = isH ? e.clientX : e.clientY;
                initialOffset = isH ? block.col * cellSize : block.row * cellSize;

                element.style.zIndex = "10";
                element.style.transition = "none";
            };

            const onPointerMove = (e) => {
                if (!isDragging) return;
                const isH = block.orientation === "h";
                currentCoord = isH ? e.clientX : e.clientY;
                const delta = currentCoord - startCoord;

                // Calculate minimum and maximum allowed pixel positions
                const grid = getOccupiedGrid(block.id);
                let minStep = 0;
                let maxStep = 0;

                if (isH) {
                    // Check how far left we can go
                    let c = block.col - 1;
                    while (c >= 0 && grid[block.row][c] === null) {
                        minStep--;
                        c--;
                    }
                    // Check how far right we can go
                    c = block.col + block.length;
                    while (c < boardSize && grid[block.row][c] === null) {
                        maxStep++;
                        c++;
                    }

                    const minPx = minStep * cellSize;
                    const maxPx = maxStep * cellSize;
                    const clampedDelta = Math.max(minPx, Math.min(maxPx, delta));
                    element.style.left = `${initialOffset + clampedDelta + 2}px`;
                } else {
                    // Check how far up we can go
                    let r = block.row - 1;
                    while (r >= 0 && grid[r][block.col] === null) {
                        minStep--;
                        r--;
                    }
                    // Check how far down we can go
                    r = block.row + block.length;
                    while (r < boardSize && grid[r][block.col] === null) {
                        maxStep++;
                        r++;
                    }

                    const minPx = minStep * cellSize;
                    const maxPx = maxStep * cellSize;
                    const clampedDelta = Math.max(minPx, Math.min(maxPx, delta));
                    element.style.top = `${initialOffset + clampedDelta + 2}px`;
                }
            };

            const onPointerUp = (e) => {
                if (!isDragging) return;
                isDragging = false;
                try {
                    element.releasePointerCapture(e.pointerId);
                } catch (_) {}

                element.style.zIndex = "";
                element.style.transition = "all 0.15s ease-out";

                const isH = block.orientation === "h";
                currentCoord = isH ? e.clientX : e.clientY;
                const delta = currentCoord - startCoord;
                const cellDelta = Math.round(delta / cellSize);

                const grid = getOccupiedGrid(block.id);
                if (isH) {
                    let steps = 0;
                    if (cellDelta > 0) {
                        let c = block.col + block.length;
                        while (steps < cellDelta && c < boardSize && grid[block.row][c] === null) {
                            steps++;
                            c++;
                        }
                    } else if (cellDelta < 0) {
                        let c = block.col - 1;
                        while (steps > cellDelta && c >= 0 && grid[block.row][c] === null) {
                            steps--;
                            c--;
                        }
                    }

                    if (steps !== 0) {
                        block.col += steps;
                        shell.incrementMoves();
                        checkWin();
                    }
                } else {
                    let steps = 0;
                    if (cellDelta > 0) {
                        let r = block.row + block.length;
                        while (steps < cellDelta && r < boardSize && grid[r][block.col] === null) {
                            steps++;
                            r++;
                        }
                    } else if (cellDelta < 0) {
                        let r = block.row - 1;
                        while (steps > cellDelta && r >= 0 && grid[r][block.col] === null) {
                            steps--;
                            r--;
                        }
                    }

                    if (steps !== 0) {
                        block.row += steps;
                        shell.incrementMoves();
                    }
                }

                render();
            };

            element.addEventListener("pointerdown", onPointerDown);
            element.addEventListener("pointermove", onPointerMove);
            element.addEventListener("pointerup", onPointerUp);
            element.addEventListener("pointercancel", onPointerUp);
        }

        function checkWin() {
            const target = blocks.find(b => b.id === targetId);
            if (target && target.row === exitRow && target.col + target.length >= boardSize) {
                setTimeout(() => {
                    shell.completeLevel();
                }, 400);
            }
        }

        render();

        shell.onReset = () => {
            blocks = JSON.parse(JSON.stringify(puzzle.config.blocks));
            render();
        };
    }
};

