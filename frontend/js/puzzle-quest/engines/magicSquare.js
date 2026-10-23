"use strict";

/**
 * ENGINE: 3×3 Magic Square (The Impossible Grid)
 * Level 13: Place digits 1–9 once; all rows, cols, diagonals sum to 15.
 */

window.PuzzleEngines = window.PuzzleEngines || {};

window.PuzzleEngines.magicSquare = {
    init: (container, puzzle, shell) => {
        let board = [
            [null, null, null],
            [null, null, null],
            [null, null, null]
        ];

        let selectedNumber = null;

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 500px; margin: 0 auto;">
                <div style="font-size: 13px; font-weight: 800; color: var(--gold); margin-bottom: 16px;">
                    EACH ROW, COLUMN, AND DIAGONAL MUST EQUAL 15
                </div>

                <!-- 3x3 Grid with Sums -->
                <div style="position: relative; display: grid; grid-template-columns: repeat(3, 76px); gap: 10px; padding: 16px; background: rgba(14, 27, 48, 0.7); border: 2px solid var(--panel-border); border-radius: 14px;">
                    ${[0, 1, 2].map(r => [0, 1, 2].map(c => `
                        <div class="pq-magic-cell" id="magic-cell-${r}-${c}" data-r="${r}" data-c="${c}" style="width: 76px; height: 76px; background: #030914; border: 2px solid rgba(0, 200, 255, 0.3); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 900; color: #ffffff; cursor: pointer; user-select: none; transition: all 0.15s;">
                        </div>
                    `).join("")).join("")}
                </div>

                <!-- Live Sums Overview -->
                <div id="pq-magic-sums" style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin: 16px 0; font-size: 12px; font-weight: 800;">
                    <!-- Injected by JS -->
                </div>

                <!-- Available Tokens (1 to 9) -->
                <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-top: 10px;">
                    ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => `
                        <button class="pq-magic-token" id="token-${num}" data-num="${num}" type="button" style="width: 44px; height: 44px; border-radius: 8px; background: #1e3a5f; border: 2px solid var(--cyan); color: #ffffff; font-size: 20px; font-weight: 900; cursor: pointer; transition: all 0.15s;">
                            ${num}
                        </button>
                    `).join("")}
                </div>

                <div style="font-size: 12px; color: rgba(255, 255, 255, 0.6); margin-top: 14px;">
                    Select a number token, then tap an empty cell. Tap placed numbers to clear them.
                </div>
            </div>
        `;

        const cellEls = container.querySelectorAll(".pq-magic-cell");
        const tokenEls = container.querySelectorAll(".pq-magic-token");
        const sumsEl = container.querySelector("#pq-magic-sums");

        function getPlacedNumbers() {
            return board.flat().filter(x => x !== null);
        }

        function render() {
            const placed = getPlacedNumbers();

            // Update cells
            cellEls.forEach(cell => {
                const r = Number(cell.dataset.r);
                const c = Number(cell.dataset.c);
                const val = board[r][c];
                cell.innerText = val !== null ? val : "";
                if (val !== null) {
                    cell.style.background = "linear-gradient(135deg, #1e3a5f 0%, #0c213c 100%)";
                    cell.style.borderColor = "var(--cyan)";
                } else {
                    cell.style.background = "#030914";
                    cell.style.borderColor = "rgba(0, 200, 255, 0.3)";
                }
            });

            // Update token buttons
            tokenEls.forEach(token => {
                const num = Number(token.dataset.num);
                const isUsed = placed.includes(num);
                const isSelected = selectedNumber === num;

                if (isUsed) {
                    token.style.opacity = "0.25";
                    token.style.cursor = "not-allowed";
                    token.style.borderColor = "rgba(255,255,255,0.1)";
                } else if (isSelected) {
                    token.style.opacity = "1";
                    token.style.cursor = "pointer";
                    token.style.background = "var(--gold)";
                    token.style.color = "#000";
                    token.style.borderColor = "var(--gold)";
                    token.style.boxShadow = "0 0 14px var(--gold-glow)";
                } else {
                    token.style.opacity = "1";
                    token.style.cursor = "pointer";
                    token.style.background = "#1e3a5f";
                    token.style.color = "#fff";
                    token.style.borderColor = "var(--cyan)";
                    token.style.boxShadow = "none";
                }
            });

            // Calculate sums
            const rowSums = [0, 1, 2].map(r => (board[r][0] || 0) + (board[r][1] || 0) + (board[r][2] || 0));
            const colSums = [0, 1, 2].map(c => (board[0][c] || 0) + (board[1][c] || 0) + (board[2][c] || 0));
            const d1Sum = (board[0][0] || 0) + (board[1][1] || 0) + (board[2][2] || 0);
            const d2Sum = (board[0][2] || 0) + (board[1][1] || 0) + (board[2][0] || 0);

            const is15 = (sum) => sum === 15;
            const badge = (label, sum) => `
                <span style="padding: 4px 8px; border-radius: 6px; background: ${is15(sum) ? 'rgba(0, 230, 118, 0.2)' : 'rgba(255, 255, 255, 0.06)'}; border: 1px solid ${is15(sum) ? 'var(--emerald)' : 'rgba(255, 255, 255, 0.12)'}; color: ${is15(sum) ? 'var(--emerald)' : 'var(--silver)'};">
                    ${label}: <strong>${sum}</strong>
                </span>
            `;

            sumsEl.innerHTML = `
                ${badge("R1", rowSums[0])} ${badge("R2", rowSums[1])} ${badge("R3", rowSums[2])}
                ${badge("C1", colSums[0])} ${badge("C2", colSums[1])} ${badge("C3", colSums[2])}
                ${badge("D1", d1Sum)} ${badge("D2", d2Sum)}
            `;

            // Check win
            if (placed.length === 9) {
                const all15 = [...rowSums, ...colSums, d1Sum, d2Sum].every(s => s === 15);
                if (all15) {
                    setTimeout(() => {
                        shell.completeLevel();
                    }, 600);
                }
            }
        }

        tokenEls.forEach(token => {
            token.onclick = () => {
                const num = Number(token.dataset.num);
                const placed = getPlacedNumbers();
                if (placed.includes(num)) return;
                selectedNumber = selectedNumber === num ? null : num;
                render();
            };
        });

        cellEls.forEach(cell => {
            cell.onclick = () => {
                const r = Number(cell.dataset.r);
                const c = Number(cell.dataset.c);

                if (selectedNumber !== null) {
                    board[r][c] = selectedNumber;
                    selectedNumber = null;
                    shell.incrementMoves();
                    render();
                } else if (board[r][c] !== null) {
                    // Clear cell
                    board[r][c] = null;
                    render();
                }
            };
        });

        render();

        shell.onReset = () => {
            board = [
                [null, null, null],
                [null, null, null],
                [null, null, null]
            ];
            selectedNumber = null;
            render();
        };
    }
};

