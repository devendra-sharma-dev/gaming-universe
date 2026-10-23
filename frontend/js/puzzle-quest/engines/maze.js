"use strict";

/**
 * ENGINE: Mazes
 * Level 5 (Key & Lock Maze - 16×16)
 * Level 27 (Grand Labyrinth - 40×20 Exact Image Maze)
 * Level 47 (Fog of War Labyrinth - 25×25)
 */

window.PuzzleEngines = window.PuzzleEngines || {};

let currentActiveMazeId = 0;

window.PuzzleEngines.maze = {
    init: (container, puzzle, shell) => {
        // Increment active maze ID to render any older instances completely inert
        currentActiveMazeId++;
        const myMazeId = currentActiveMazeId;

        // Remove any existing window keydown listener
        if (window.__pq_maze_keydown_handler) {
            window.removeEventListener("keydown", window.__pq_maze_keydown_handler);
            window.__pq_maze_keydown_handler = null;
        }

        const mode = puzzle.config.mode || (puzzle.level === 27 ? "grandMaze" : (puzzle.level === 5 ? "keyAndLock" : "standard"));

        if (mode === "grandMaze") {
            initGrandMaze(container, puzzle, shell, myMazeId);
        } else {
            initStandardMaze(container, puzzle, shell, mode, myMazeId);
        }
    }
};

/**
 * ─────────────────────────────────────────────────────────────
 * LEVEL 27: GRAND LABYRINTH (40×20 EXACT ARCHAEOLOGICAL MAZE)
 * ─────────────────────────────────────────────────────────────
 */
const DEFAULT_GRAND_MAZE = {
    rows: 20,
    cols: 40,
    start: [16, 0],
    exit: [5, 39],
    hConn: "111101111110111111111011111011111101111111111101011111110110101000000111110110111101001001111100111001100100010100000111011011011011001101111100110001010001011011101110000000100101001110111000001000111111111000000001011011111111000100000011110101010100010011111110110000100010000110000011110100001111101000100101100001100010100111100000111000000110010101001111001100011110110101100100011001010000110001001111111011100100110000010000101100010110110011110000010011010100100011000001101011001100100001001001100110111100100011111000101101000010000110111111010000111011110101110000000010110111110010001110101101000100000000101000110100110011001111010101001011011000101110001111110011110111110001111110000011011011011110101110110100001101110110010111101111111011111111001011101111011111",
    vConn: "0000100001000010000001100101110010001001100001011010000001100101011011100001101100101010011100001100001000110111001111011001000110001101110010000110001101111110110000100000111111111010110010100011111011110001000001111111010010010000001101111111100011011100011011100000011011111011110111001110111010010111010011111001101110111100011100110000110110001011110011011101110001100110000100100110010011111101111111001101110000100000011111100101101101111001111000010111000110111001001001111001000111110100001110110111111111110011010000001111100000111100001111111011100100010011010100011000001100111111111011100100011011100010000111111111101100110111001111000100110000100001110001000111101010011000000011100001000011100000110111011000101100001100000001111100110000001001"
};

function initGrandMaze(container, puzzle, shell, myMazeId) {
    const config = puzzle.config || {};
    const rows = config.rows || DEFAULT_GRAND_MAZE.rows;
    const cols = config.cols || DEFAULT_GRAND_MAZE.cols;
    const start = config.start || DEFAULT_GRAND_MAZE.start;
    const exit = config.exit || DEFAULT_GRAND_MAZE.exit;
    const hConn = config.hConn || DEFAULT_GRAND_MAZE.hConn;
    const vConn = config.vConn || DEFAULT_GRAND_MAZE.vConn;

    const isFog = Boolean(config.fogOfWar || puzzle.level === 47);
    const sightRadius = config.sightRadius || 3;
    const hasKeyReq = Boolean(config.hasKey || puzzle.level === 47);
    const keyPos = config.keyPos || [0, 0];

    const hasH = (r, c) => (r >= 0 && r < rows && c >= 0 && c < cols - 1) && hConn[r * (cols - 1) + c] === "1";
    const hasV = (r, c) => (r >= 0 && r < rows - 1 && c >= 0 && c < cols) && vConn[r * cols + c] === "1";

    let playerPos = [start[0], start[1]];
    const visited = new Set([`${start[0]},${start[1]}`]);
    let moves = 0;
    let isWon = false;
    let hasKey = !hasKeyReq;

    // Revealed cells for proximity fog of war
    const revealed = Array.from({ length: rows }, () => Array(cols).fill(!isFog));

    function updateFog() {
        if (!isFog) return;
        const [pr, pc] = playerPos;
        for (let dr = -sightRadius; dr <= sightRadius; dr++) {
            for (let dc = -sightRadius; dc <= sightRadius; dc++) {
                const nr = pr + dr;
                const nc = pc + dc;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                    if (Math.hypot(dr, dc) <= sightRadius + 0.5) {
                        revealed[nr][nc] = true;
                    }
                }
            }
        }
    }

    updateFog();

    const cellSize = 15; // Crisp 15x15px cell

    container.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; box-sizing: border-box;">
            <div class="pq-maze-scroll-wrap" id="pq-grand-scroll">
                <div style="display: block; margin: 0 auto; width: max-content; padding: 0 16px; box-sizing: border-box;">
                    <div class="pq-maze-grid" id="pq-grand-grid" style="grid-template-columns: repeat(${cols}, ${cellSize}px); grid-template-rows: repeat(${rows}, ${cellSize}px); width: ${cols * cellSize}px; height: ${rows * cellSize}px; margin: 0 auto;">
                        <!-- Cells injected by JS -->
                    </div>
                </div>
            </div>

            <div id="pq-maze-status-msg" style="min-height: 22px; font-size: 13px; font-weight: 700; text-align: center; margin: 6px 0;"></div>

            <!-- Directional Touch D-Pad for Mobile & Desktop -->
            <div class="pq-maze-dpad">
                <button class="pq-btn pq-btn-secondary pq-maze-dpad-btn" data-dir="up" type="button">▲</button>
                <div class="pq-maze-dpad-row">
                    <button class="pq-btn pq-btn-secondary pq-maze-dpad-btn" data-dir="left" type="button">◀</button>
                    <button class="pq-btn pq-btn-secondary pq-maze-dpad-btn" data-dir="down" type="button">▼</button>
                    <button class="pq-btn pq-btn-secondary pq-maze-dpad-btn" data-dir="right" type="button">▶</button>
                </div>
            </div>

            <div style="font-size: 12px; color: rgba(255, 255, 255, 0.6); margin-top: 10px;">
                Use <strong>Arrow Keys / WASD</strong>, the <strong>D-Pad buttons</strong>, or click adjacent cells to navigate.
            </div>
        </div>
    `;

    const gridEl = container.querySelector("#pq-grand-grid");
    const statusMsgEl = container.querySelector("#pq-maze-status-msg");
    const cells = [];

    // Pre-create cell elements
    for (let r = 0; r < rows; r++) {
        cells[r] = [];
        for (let c = 0; c < cols; c++) {
            const cell = document.createElement("div");
            cell.className = "pq-maze-cell";
            cell.dataset.r = r;
            cell.dataset.c = c;

            // Border walls
            if (r === 0 || !hasV(r - 1, c)) cell.classList.add("w-top");
            if (r === rows - 1 || !hasV(r, c)) cell.classList.add("w-bottom");
            if (c === 0) {
                if (r !== start[0]) cell.classList.add("w-left");
            } else if (!hasH(r, c - 1)) {
                cell.classList.add("w-left");
            }

            if (c === cols - 1) {
                if (r !== exit[0]) cell.classList.add("w-right");
            } else if (!hasH(r, c)) {
                cell.classList.add("w-right");
            }

            if (r === start[0] && c === start[1]) {
                cell.classList.add("start-cell");
            }
            if (r === exit[0] && c === exit[1]) {
                cell.classList.add("exit");
                cell.innerText = hasKeyReq ? "🔒" : "🏁";
            }
            if (hasKeyReq && r === keyPos[0] && c === keyPos[1]) {
                cell.innerText = "🔑";
            }

            cell.onclick = () => onCellClick(r, c);
            gridEl.appendChild(cell);
            cells[r][c] = cell;
        }
    }

    function render() {
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = cells[r][c];
                const key = `${r},${c}`;
                const isPlayer = (r === playerPos[0] && c === playerPos[1]);
                const isStart = (r === start[0] && c === start[1]);
                const isExit = (r === exit[0] && c === exit[1]);
                const isKeyCell = hasKeyReq && (r === keyPos[0] && c === keyPos[1]);
                const isHint = Boolean(activeHintPath && activeHintPath.has(key));
                const isRevealed = !isFog || revealed[r][c] || isHint;

                if (!isRevealed) {
                    cell.classList.add("fog");
                    cell.innerText = "";
                    cell.classList.remove("hint-gold", "player", "breadcrumb");
                    continue;
                }

                cell.classList.remove("fog");

                if (isHint && !isExit && !isStart && (!isKeyCell || hasKey)) {
                    cell.classList.add("hint-gold");
                } else {
                    cell.classList.remove("hint-gold");
                }

                if (isPlayer) {
                    cell.classList.add("player");
                    cell.innerText = "🧙";
                } else {
                    cell.classList.remove("player");
                    if (isKeyCell && !hasKey) {
                        cell.innerText = "🔑";
                    } else if (isExit) {
                        cell.innerText = (hasKeyReq && !hasKey) ? "🔒" : "🏁";
                    } else if (isStart) {
                        cell.innerText = "🟢";
                    } else {
                        cell.innerText = "";
                    }
                }

                if (visited.has(key) && !isPlayer && !isExit && !isStart && (!isKeyCell || hasKey)) {
                    cell.classList.add("breadcrumb");
                } else {
                    cell.classList.remove("breadcrumb");
                }
            }
        }

        // Auto-scroll player cell into view smoothly on mobile screens
        const activeCell = cells[playerPos[0]][playerPos[1]];
        if (activeCell && typeof activeCell.scrollIntoView === "function") {
            activeCell.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
        }
    }

    function canMove(r, c, dr, dc) {
        if (dr === -1) return r > 0 && hasV(r - 1, c);
        if (dr === 1) return r < rows - 1 && hasV(r, c);
        if (dc === -1) return c > 0 && hasH(r, c - 1);
        if (dc === 1) return c < cols - 1 && hasH(r, c);
        return false;
    }

    function tryMove(dr, dc) {
        if (currentActiveMazeId !== myMazeId || !container.isConnected || isWon) return;
        const [r, c] = playerPos;
        if (!canMove(r, c, dr, dc)) return;

        const nr = r + dr;
        const nc = c + dc;

        // Block moving into exit if key is required and not collected
        if (hasKeyReq && !hasKey && nr === exit[0] && nc === exit[1]) {
            if (statusMsgEl) {
                statusMsgEl.innerHTML = `<span style="color: var(--gold);">🔒 The gate is locked!</span>`;
            }
            if (typeof shell.playTone === "function") {
                try { shell.playTone(220, "sawtooth", 0.15, 0.1); } catch (e) {}
            }
            return;
        }

        playerPos = [nr, nc];
        visited.add(`${nr},${nc}`);
        moves++;
        shell.incrementMoves();

        // Key pickup
        if (hasKeyReq && !hasKey && nr === keyPos[0] && nc === keyPos[1]) {
            hasKey = true;
            if (statusMsgEl) {
                statusMsgEl.innerHTML = `<span style="color: var(--emerald);">🔑 Golden Key collected! Head to the exit gate on the right!</span>`;
            }
            if (typeof shell.playTone === "function") {
                try {
                    shell.playTone(523.25, "sine", 0.1, 0.08);
                    setTimeout(() => shell.playTone(659.25, "sine", 0.1, 0.08), 80);
                    setTimeout(() => shell.playTone(783.99, "sine", 0.2, 0.12), 160);
                } catch (e) {}
            }
        }

        updateFog();
        render();

        if (nr === exit[0] && nc === exit[1]) {
            if (hasKeyReq && !hasKey) return;
            isWon = true;
            if (statusMsgEl) {
                statusMsgEl.innerHTML = `<span style="color: var(--emerald);">✓ Triumph! The gate is unlocked and you escaped!</span>`;
            }
            setTimeout(() => {
                if (currentActiveMazeId === myMazeId) {
                    shell.completeLevel();
                }
            }, 400);
        }
    }

    function onCellClick(r, c) {
        if (currentActiveMazeId !== myMazeId || !container.isConnected) return;
        const dr = r - playerPos[0];
        const dc = c - playerPos[1];
        if (Math.abs(dr) + Math.abs(dc) === 1) {
            tryMove(dr, dc);
        }
    }

    // Controls
    const handleKeyDown = (e) => {
        if (currentActiveMazeId !== myMazeId || !container.isConnected) {
            window.removeEventListener("keydown", handleKeyDown);
            return;
        }
        if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") { e.preventDefault(); tryMove(-1, 0); }
        if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") { e.preventDefault(); tryMove(1, 0); }
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { e.preventDefault(); tryMove(0, -1); }
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { e.preventDefault(); tryMove(0, 1); }
    };

    window.__pq_maze_keydown_handler = handleKeyDown;
    window.addEventListener("keydown", handleKeyDown);

    // D-Pad buttons
    const dpadButtons = container.querySelectorAll(".pq-maze-dpad-btn");
    dpadButtons.forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            if (currentActiveMazeId !== myMazeId || !container.isConnected) return;
            const dir = btn.dataset.dir;
            if (dir === "up") tryMove(-1, 0);
            if (dir === "down") tryMove(1, 0);
            if (dir === "left") tryMove(0, -1);
            if (dir === "right") tryMove(0, 1);
        };
    });

    // BFS Solver for golden hint path
    function bfsPath(from, to) {
        const queue = [[from[0], from[1], [`${from[0]},${from[1]}`]]];
        const seen = new Set([`${from[0]},${from[1]}`]);

        while (queue.length > 0) {
            const [r, c, path] = queue.shift();
            if (r === to[0] && c === to[1]) {
                return path;
            }
            const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            for (const [dr, dc] of dirs) {
                if (canMove(r, c, dr, dc)) {
                    const nr = r + dr;
                    const nc = c + dc;
                    const key = `${nr},${nc}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        queue.push([nr, nc, [...path, key]]);
                    }
                }
            }
        }
        return [];
    }

    function getSolutionPath() {
        if (!hasKeyReq || hasKey) {
            return new Set(bfsPath(playerPos, exit));
        } else {
            const toKey = bfsPath(playerPos, keyPos);
            const toExit = bfsPath(keyPos, exit);
            return new Set([...toKey, ...toExit]);
        }
    }

    let activeHintPath = null;
    let hintPathTimeout = null;

    // Hint hook: reveal full solution path in golden color for 2 seconds
    shell.onHintDismissed = () => {
        activeHintPath = getSolutionPath();
        render();

        if (typeof shell.playTone === "function") {
            try {
                shell.playTone(660, "triangle", 0.2, 0.1);
                setTimeout(() => shell.playTone(880, "triangle", 0.3, 0.15), 100);
            } catch (e) {}
        }

        if (hintPathTimeout) clearTimeout(hintPathTimeout);
        hintPathTimeout = setTimeout(() => {
            activeHintPath = null;
            render();
            hintPathTimeout = null;
        }, 2000);
    };

    // Reset hook: reset user to starting position
    shell.onReset = () => {
        playerPos = [start[0], start[1]];
        visited.clear();
        visited.add(`${start[0]},${start[1]}`);
        isWon = false;
        hasKey = !hasKeyReq;
        if (isFog) {
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    revealed[r][c] = false;
                }
            }
            updateFog();
        }
        if (hintPathTimeout) {
            clearTimeout(hintPathTimeout);
            hintPathTimeout = null;
        }
        activeHintPath = null;
        if (statusMsgEl) statusMsgEl.innerHTML = "";
        render();
        const startCell = cells[start[0]][start[1]];
        if (startCell && typeof startCell.scrollIntoView === "function") {
            startCell.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
        }
    };

    shell.cleanup = () => {
        if (hintPathTimeout) {
            clearTimeout(hintPathTimeout);
            hintPathTimeout = null;
        }
        if (window.__pq_maze_keydown_handler) {
            window.removeEventListener("keydown", window.__pq_maze_keydown_handler);
            window.__pq_maze_keydown_handler = null;
        }
    };

    render();
}

/**
 * ─────────────────────────────────────────────────────────────
 * LEVEL 5 (KEY & LOCK) & LEVEL 47 (FOG OF WAR) MAZE ENGINE
 * ─────────────────────────────────────────────────────────────
 */
function initStandardMaze(container, puzzle, shell, mode, myMazeId) {
    const width = puzzle.config.width || (mode === "keyAndLock" ? 16 : 10);
    const height = puzzle.config.height || (mode === "keyAndLock" ? 16 : 10);
    const sightRadius = puzzle.config.sightRadius || 3;
    const seed = puzzle.config.seed || 12345;

    // PRNG for deterministic, reliable maze generation
    let s = seed;
    const rand = () => {
        s = (s * 1664525 + 1013904223) % 4294967296;
        return s / 4294967296;
    };

    const grid = Array.from({ length: height }, () => Array(width).fill(0));

    function generateMaze() {
        for (let r = 0; r < height; r++) {
            for (let c = 0; c < width; c++) {
                grid[r][c] = 0;
            }
        }

        const stack = [[0, 0]];
        grid[0][0] = 1;

        while (stack.length > 0) {
            const [r, c] = stack[stack.length - 1];
            const neighbors = [];
            const directions = [[-2, 0], [2, 0], [0, -2], [0, 2]];

            for (const [dr, dc] of directions) {
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < height && nc >= 0 && nc < width && grid[nr][nc] === 0) {
                    neighbors.push([nr, nc, dr, dc]);
                }
            }

            if (neighbors.length > 0) {
                const [nr, nc, dr, dc] = neighbors[Math.floor(rand() * neighbors.length)];
                grid[r + dr / 2][c + dc / 2] = 1;
                grid[nr][nc] = 1;
                stack.push([nr, nc]);
            } else {
                stack.pop();
            }
        }

        // Ensure exit at bottom-right is open
        grid[height - 1][width - 1] = 1;
        grid[height - 2][width - 1] = 1;
    }

    generateMaze();

    let playerPos = [0, 0];
    let moves = 0;
    let isWon = false;
    let hasKey = (mode !== "keyAndLock");

    // Key position for Key & Lock mode: placed in distant bottom-left quadrant (dist 100 steps from start)
    let keyPos = [height - 4, 0];
    if (mode === "keyAndLock") {
        let foundKey = false;
        for (let r = height - 2; r >= 2; r--) {
            for (let c = 0; c < Math.floor(width / 2); c++) {
                if (grid[r][c] === 1 && (r !== 0 || c !== 0)) {
                    keyPos = [r, c];
                    foundKey = true;
                    break;
                }
            }
            if (foundKey) break;
        }
    }

    // Visited cells for fog of war
    const revealed = Array.from({ length: height }, () => Array(width).fill(mode !== "fogOfWar"));

    function updateFog() {
        if (mode === "fogOfWar") {
            const [pr, pc] = playerPos;
            for (let dr = -sightRadius; dr <= sightRadius; dr++) {
                for (let dc = -sightRadius; dc <= sightRadius; dc++) {
                    const nr = pr + dr;
                    const nc = pc + dc;
                    if (nr >= 0 && nr < height && nc >= 0 && nc < width) {
                        if (Math.hypot(dr, dc) <= sightRadius + 0.5) {
                            revealed[nr][nc] = true;
                        }
                    }
                }
            }
        }
    }

    updateFog();

    container.innerHTML = `
        <div class="pq-maze-container" style="display: flex; flex-direction: column; align-items: center; width: 100%; box-sizing: border-box;">
            <div class="pq-maze-scroll-wrap">
                <div class="pq-maze-grid" id="pq-maze-board">
                    <!-- Cells injected by JS -->
                </div>
            </div>

            <!-- Directional Touch D-Pad for Mobile & Desktop -->
            <div class="pq-maze-dpad">
                <button class="pq-btn pq-btn-secondary pq-maze-dpad-btn" data-dir="up" type="button" aria-label="Up">▲</button>
                <div class="pq-maze-dpad-row">
                    <button class="pq-btn pq-btn-secondary pq-maze-dpad-btn" data-dir="left" type="button" aria-label="Left">◀</button>
                    <button class="pq-btn pq-btn-secondary pq-maze-dpad-btn" data-dir="down" type="button" aria-label="Down">▼</button>
                    <button class="pq-btn pq-btn-secondary pq-maze-dpad-btn" data-dir="right" type="button" aria-label="Right">▶</button>
                </div>
            </div>

            <div class="pq-maze-help" style="font-size: 11px; color: rgba(255, 255, 255, 0.6); margin-top: 8px;">
                Use <strong>Arrow Keys / WASD</strong>, <strong>D-Pad</strong>, or tap adjacent cells to move.
            </div>
        </div>
    `;

    const boardEl = container.querySelector("#pq-maze-board");

    function updateBoardDimensions() {
        if (!boardEl) return;
        // Determine available viewport dimensions
        const vw = window.innerWidth || document.documentElement.clientWidth || 360;
        const vh = window.innerHeight || document.documentElement.clientHeight || 640;

        // In mobile viewports (< 768px), calculate cell size based on screen budget:
        // Budget = screen height - header - panel padding - dpad - controls
        let maxBoardPx = 380;
        if (vw <= 768) {
            const availW = Math.max(260, Math.min(vw - 48, 380));
            // In mobile, leave at least 260px for header + d-pad + safe margins
            const availH = Math.max(240, Math.min(vh - 280, 360));
            maxBoardPx = Math.min(availW, availH);
        }

        const calculatedCellSize = Math.max(12, Math.floor(maxBoardPx / Math.max(width, height)));
        boardEl.style.gridTemplateColumns = `repeat(${width}, ${calculatedCellSize}px)`;
        boardEl.style.gridTemplateRows = `repeat(${height}, ${calculatedCellSize}px)`;
        boardEl.style.width = `${width * calculatedCellSize}px`;
        boardEl.style.height = `${height * calculatedCellSize}px`;
    }

    updateBoardDimensions();

    function render() {
        boardEl.innerHTML = "";
        for (let r = 0; r < height; r++) {
            for (let c = 0; c < width; c++) {
                const cell = document.createElement("div");
                cell.className = "pq-maze-cell";
                cell.dataset.r = r;
                cell.dataset.c = c;

                const isRevealed = revealed[r][c];

                if (!isRevealed) {
                    cell.classList.add("fog");
                } else if (grid[r][c] === 0) {
                    cell.classList.add("wall");
                } else {
                    cell.classList.add("path");

                    if (r === playerPos[0] && c === playerPos[1]) {
                        cell.classList.add("player");
                    } else if (r === height - 1 && c === width - 1) {
                        cell.classList.add("exit");
                        // In keyAndLock mode, show locked lock until key is collected
                        if (mode === "keyAndLock" && !hasKey) {
                            cell.innerText = "🔒";
                        } else {
                            cell.innerText = "🏁";
                        }
                    } else if (mode === "keyAndLock" && !hasKey && r === keyPos[0] && c === keyPos[1]) {
                        cell.innerText = "🔑";
                    }
                }

                cell.onclick = () => onCellClick(r, c);
                boardEl.appendChild(cell);
            }
        }
    }

    function tryMove(dr, dc) {
        if (currentActiveMazeId !== myMazeId || !container.isConnected || isWon) return;
        const nr = playerPos[0] + dr;
        const nc = playerPos[1] + dc;

        if (nr < 0 || nr >= height || nc < 0 || nc >= width) return;
        if (grid[nr][nc] === 0) return; // Wall

        // Check locked exit in keyAndLock mode
        if (mode === "keyAndLock" && !hasKey && nr === height - 1 && nc === width - 1) {
            return; // Cannot enter locked exit
        }

        playerPos = [nr, nc];
        moves++;
        shell.incrementMoves();

        // Collect key
        if (mode === "keyAndLock" && !hasKey && nr === keyPos[0] && nc === keyPos[1]) {
            hasKey = true;
        }

        updateFog();
        render();

        // Win check: must be at exit AND must have collected key in keyAndLock mode
        if (nr === height - 1 && nc === width - 1) {
            if (mode === "keyAndLock" && !hasKey) {
                return;
            }

            isWon = true;
            setTimeout(() => {
                if (currentActiveMazeId === myMazeId) {
                    shell.completeLevel();
                }
            }, 400);
        }
    }

    function onCellClick(r, c) {
        if (currentActiveMazeId !== myMazeId || !container.isConnected) return;
        const dr = r - playerPos[0];
        const dc = c - playerPos[1];
        if (Math.abs(dr) + Math.abs(dc) === 1) {
            tryMove(dr, dc);
        }
    }

    const handleKeyDown = (e) => {
        if (currentActiveMazeId !== myMazeId || !container.isConnected) {
            window.removeEventListener("keydown", handleKeyDown);
            return;
        }
        if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") { e.preventDefault(); tryMove(-1, 0); }
        if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") { e.preventDefault(); tryMove(1, 0); }
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { e.preventDefault(); tryMove(0, -1); }
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { e.preventDefault(); tryMove(0, 1); }
    };

    window.__pq_maze_keydown_handler = handleKeyDown;
    window.addEventListener("keydown", handleKeyDown);

    // D-Pad buttons
    const dpadButtons = container.querySelectorAll(".pq-maze-dpad-btn");
    dpadButtons.forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            if (currentActiveMazeId !== myMazeId || !container.isConnected) return;
            const dir = btn.dataset.dir;
            if (dir === "up") tryMove(-1, 0);
            if (dir === "down") tryMove(1, 0);
            if (dir === "left") tryMove(0, -1);
            if (dir === "right") tryMove(0, 1);
        };
    });

    const handleResize = () => {
        if (currentActiveMazeId !== myMazeId || !container.isConnected) {
            window.removeEventListener("resize", handleResize);
            return;
        }
        updateBoardDimensions();
    };
    window.addEventListener("resize", handleResize);

    shell.cleanup = () => {
        window.removeEventListener("resize", handleResize);
        if (window.__pq_maze_keydown_handler) {
            window.removeEventListener("keydown", window.__pq_maze_keydown_handler);
            window.__pq_maze_keydown_handler = null;
        }
    };

    render();
}
