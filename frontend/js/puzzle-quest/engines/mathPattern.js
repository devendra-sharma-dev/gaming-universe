"use strict";

/**
 * ENGINE: Math Pattern & Visual Calculation
 * Powers of 5 (Level 1), Number Chain (Level 24), Rook Count (Level 29)
 */

window.PuzzleEngines = window.PuzzleEngines || {};

window.PuzzleEngines.mathPattern = {
    init: (container, puzzle, shell) => {
        const isLevel1 = puzzle.level === 1;

        const promptHtml = isLevel1 ? `
            <div style="display: inline-grid; grid-template-columns: auto auto; gap: 8px 16px; text-align: left; font-family: 'Courier New', Courier, monospace; font-size: 21px; font-weight: 800; color: var(--cyan); background: rgba(0, 0, 0, 0.35); padding: 20px 36px; border-radius: 12px; border: 1px solid var(--panel-border); box-shadow: inset 0 0 20px rgba(0,0,0,0.5); margin: 4px 0 22px;">
                <span style="color: rgba(255,255,255,0.7); text-align: right;">If</span>
                <span>1 = 5,</span>
                <span></span>
                <span>2 = 25,</span>
                <span></span>
                <span>3 = 125,</span>
                <span></span>
                <span>4 = 625,</span>
                <span style="color: var(--gold); text-align: right;">then</span>
                <span style="color: var(--gold); font-weight: 900;">5 = ?</span>
            </div>
        ` : `
            <div style="font-size: 26px; font-weight: 900; color: #ffffff; margin: 16px 0; font-family: monospace; letter-spacing: 2px;">
                ${puzzle.config.prompt}
            </div>
        `;

        const helperText = "Enter your answer below and press Submit.";

        container.innerHTML = `
            <div style="max-width: 540px; width: 100%; margin: 0 auto; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 20px;">
                <div style="background: rgba(14, 27, 48, 0.75); border: 1px solid var(--panel-border); border-radius: 14px; padding: 26px 24px; width: 100%; box-sizing: border-box;">
                    ${promptHtml}
                    <p style="font-size: 14px; color: rgba(255, 255, 255, 0.75); margin: 0 0 20px;">
                        ${helperText}
                    </p>
                    <div style="display: flex; justify-content: center; gap: 12px; margin-bottom: 16px;">
                        <input id="pq-math-input" class="pq-input" type="text" placeholder="Your Answer" style="width: 200px;" autocomplete="off" />
                        <button id="pq-math-submit" class="pq-btn pq-btn-gold" type="button">SUBMIT</button>
                    </div>
                    <div id="pq-math-feedback" style="min-height: 24px; font-size: 13px; font-weight: 700;"></div>
                </div>
            </div>
        `;

        const input = container.querySelector("#pq-math-input");
        const submitBtn = container.querySelector("#pq-math-submit");
        const feedback = container.querySelector("#pq-math-feedback");

        input.focus();

        const checkAnswer = () => {
            const val = input.value.trim().replace(/,/g, "");
            if (puzzle.level !== 1 && puzzle.level !== 4) {
                shell.incrementMoves();
            }

            if (val === String(puzzle.config.answer) || (puzzle.config.acceptedAnswers && puzzle.config.acceptedAnswers.includes(val))) {
                feedback.innerHTML = `<span style="color: var(--emerald);">✓ Correct! ${puzzle.config.explanation || ""}</span>`;
                setTimeout(() => {
                    shell.completeLevel();
                }, 900);
            } else {
                feedback.innerHTML = `<span style="color: var(--crimson);">✗ Incorrect. Re-examine the pattern and try again!</span>`;
                input.select();
            }
        };

        submitBtn.onclick = checkAnswer;
        input.onkeydown = (e) => {
            if (e.key === "Enter") checkAnswer();
        };
    }
};

window.PuzzleEngines.numberChain = {
    init: (container, puzzle, shell) => {
        container.innerHTML = `
            <div style="max-width: 620px; width: 100%; margin: 0 auto; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px;">
                <div style="background: rgba(14, 27, 48, 0.75); border: 1px solid var(--panel-border); border-radius: 14px; padding: 22px 16px; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; align-items: center;">
                    
                    <!-- SVG Diagram -->
                    <div style="display:flex; justify-content:center; width: 100%; max-width: 520px; overflow-x: auto; -webkit-overflow-scrolling: touch;">
                        <svg viewBox="0 0 520 440" style="width: 100%; max-width: 500px; height: auto;" preserveAspectRatio="xMidYMid meet">
                            <!-- Defs for arrows -->
                            <defs>
                                <marker id="pq-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#38bdf8" />
                                </marker>
                            </defs>

                            <!-- Converging Arrow Lines -->
                            <line x1="66" y1="56" x2="92" y2="82" stroke="#38bdf8" stroke-width="2.5" marker-end="url(#pq-arrow)" />
                            <line x1="154" y1="56" x2="128" y2="82" stroke="#38bdf8" stroke-width="2.5" marker-end="url(#pq-arrow)" />

                            <line x1="126" y1="116" x2="152" y2="142" stroke="#38bdf8" stroke-width="2.5" marker-end="url(#pq-arrow)" />
                            <line x1="214" y1="116" x2="188" y2="142" stroke="#38bdf8" stroke-width="2.5" marker-end="url(#pq-arrow)" />

                            <line x1="186" y1="176" x2="212" y2="202" stroke="#38bdf8" stroke-width="2.5" marker-end="url(#pq-arrow)" />
                            <line x1="274" y1="176" x2="248" y2="202" stroke="#38bdf8" stroke-width="2.5" marker-end="url(#pq-arrow)" />

                            <line x1="246" y1="236" x2="272" y2="262" stroke="#38bdf8" stroke-width="2.5" marker-end="url(#pq-arrow)" />
                            <line x1="334" y1="236" x2="308" y2="262" stroke="#38bdf8" stroke-width="2.5" marker-end="url(#pq-arrow)" />

                            <line x1="306" y1="296" x2="332" y2="322" stroke="#38bdf8" stroke-width="2.5" marker-end="url(#pq-arrow)" />
                            <line x1="394" y1="296" x2="368" y2="322" stroke="#38bdf8" stroke-width="2.5" marker-end="url(#pq-arrow)" />

                            <line x1="366" y1="356" x2="392" y2="382" stroke="#38bdf8" stroke-width="2.5" marker-end="url(#pq-arrow)" />
                            <line x1="454" y1="356" x2="428" y2="382" stroke="#38bdf8" stroke-width="2.5" marker-end="url(#pq-arrow)" />

                            <!-- Feeder and Spine Circles (all r=22 equal size) -->
                            <!-- Feeder: 72 -->
                            <circle cx="50" cy="40" r="22" fill="#0f294a" stroke="#38bdf8" stroke-width="2.5" />
                            <text x="50" y="40" font-size="15" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="central">72</text>

                            <!-- Feeder: 99 -->
                            <circle cx="170" cy="40" r="22" fill="#0f294a" stroke="#38bdf8" stroke-width="2.5" />
                            <text x="170" y="40" font-size="15" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="central">99</text>

                            <!-- Spine: 27 -->
                            <circle cx="110" cy="100" r="22" fill="#1e3a5f" stroke="#00d2ff" stroke-width="2.5" />
                            <text x="110" y="100" font-size="15" font-weight="bold" fill="#00e5ff" text-anchor="middle" dominant-baseline="central">27</text>

                            <!-- Feeder: 45 -->
                            <circle cx="230" cy="100" r="22" fill="#0f294a" stroke="#38bdf8" stroke-width="2.5" />
                            <text x="230" y="100" font-size="15" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="central">45</text>

                            <!-- Spine: 18 -->
                            <circle cx="170" cy="160" r="22" fill="#1e3a5f" stroke="#00d2ff" stroke-width="2.5" />
                            <text x="170" y="160" font-size="15" font-weight="bold" fill="#00e5ff" text-anchor="middle" dominant-baseline="central">18</text>

                            <!-- Feeder: 39 -->
                            <circle cx="290" cy="160" r="22" fill="#0f294a" stroke="#38bdf8" stroke-width="2.5" />
                            <text x="290" y="160" font-size="15" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="central">39</text>

                            <!-- Spine: 21 -->
                            <circle cx="230" cy="220" r="22" fill="#1e3a5f" stroke="#00d2ff" stroke-width="2.5" />
                            <text x="230" y="220" font-size="15" font-weight="bold" fill="#00e5ff" text-anchor="middle" dominant-baseline="central">21</text>

                            <!-- Feeder: 36 -->
                            <circle cx="350" cy="220" r="22" fill="#0f294a" stroke="#38bdf8" stroke-width="2.5" />
                            <text x="350" y="220" font-size="15" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="central">36</text>

                            <!-- Target ? Spine Node -->
                            <circle cx="290" cy="280" r="22" fill="#d97706" stroke="#f5c518" stroke-width="3" />
                            <text x="290" y="280" font-size="18" font-weight="900" fill="#ffffff" text-anchor="middle" dominant-baseline="central">?</text>

                            <!-- Feeder: 28 -->
                            <circle cx="410" cy="280" r="22" fill="#0f294a" stroke="#38bdf8" stroke-width="2.5" />
                            <text x="410" y="280" font-size="15" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="central">28</text>

                            <!-- Spine: 13 -->
                            <circle cx="350" cy="340" r="22" fill="#1e3a5f" stroke="#00d2ff" stroke-width="2.5" />
                            <text x="350" y="340" font-size="15" font-weight="bold" fill="#00e5ff" text-anchor="middle" dominant-baseline="central">13</text>

                            <!-- Feeder: 21 -->
                            <circle cx="470" cy="340" r="22" fill="#0f294a" stroke="#38bdf8" stroke-width="2.5" />
                            <text x="470" y="340" font-size="15" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="central">21</text>

                            <!-- Spine: 7 -->
                            <circle cx="410" cy="400" r="22" fill="#1e3a5f" stroke="#00d2ff" stroke-width="2.5" />
                            <text x="410" y="400" font-size="15" font-weight="bold" fill="#00e5ff" text-anchor="middle" dominant-baseline="central">7</text>
                        </svg>
                    </div>

                    <div style="display: flex; justify-content: center; gap: 12px; margin-top: 18px;">
                        <input id="pq-chain-input" class="pq-input" type="number" placeholder="Enter ?" style="width: 140px;" />
                        <button id="pq-chain-submit" class="pq-btn pq-btn-gold" type="button">SUBMIT</button>
                    </div>
                    <div id="pq-chain-feedback" style="min-height: 24px; margin-top: 10px; font-size: 13px; font-weight: 700;"></div>
                </div>
            </div>
        `;

        const input = container.querySelector("#pq-chain-input");
        const submitBtn = container.querySelector("#pq-chain-submit");
        const feedback = container.querySelector("#pq-chain-feedback");

        input.focus();

        const checkAnswer = () => {
            const val = Number(input.value);
            shell.incrementMoves();

            if (val === 12) {
                feedback.innerHTML = `<span style="color: var(--emerald);">✓ 12 is correct! Masterfully solved!</span>`;
                setTimeout(() => {
                    shell.completeLevel();
                }, 1000);
            } else {
                feedback.innerHTML = `<span style="color: var(--crimson);">✗ Incorrect. Try again!</span>`;
                input.select();
            }
        };

        submitBtn.onclick = checkAnswer;
        input.onkeydown = (e) => {
            if (e.key === "Enter") checkAnswer();
        };
    }
};

window.PuzzleEngines.rookCount = {
    init: (container, puzzle, shell) => {
        // Render 8x8 chessboard showing the 2 rooks at (3,4) and (6,6)
        container.innerHTML = `
            <div style="max-width: 620px; width: 100%; margin: 0 auto; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 18px;">
                <div style="background: rgba(14, 27, 48, 0.75); border: 1px solid var(--panel-border); border-radius: 14px; padding: 20px; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; align-items: center;">
                    <div style="font-size: 14px; font-weight: 800; color: var(--gold); margin-bottom: 16px;">
                        HOW MANY SQUARES OF ANY SIZE DO NOT CONTAIN A ROOK?
                    </div>

                    <!-- Chessboard -->
                    <div class="pq-chess-board" id="pq-rook-board" style="width: 280px; height: 280px; margin-bottom: 16px;">
                        <!-- Generated by JS -->
                    </div>

                    <div style="display: flex; justify-content: center; gap: 12px;">
                        <input id="pq-rook-input" class="pq-input" type="number" placeholder="Total squares" style="width: 160px;" />
                        <button id="pq-rook-submit" class="pq-btn pq-btn-gold" type="button">SUBMIT</button>
                    </div>
                    <div id="pq-rook-feedback" style="min-height: 24px; margin-top: 10px; font-size: 13px; font-weight: 700;"></div>
                </div>
            </div>
        `;

        const boardEl = container.querySelector("#pq-rook-board");
        for (let r = 1; r <= 8; r++) {
            for (let c = 1; c <= 8; c++) {
                const cell = document.createElement("div");
                const isLight = (r + c) % 2 === 0;
                cell.className = `pq-chess-cell ${isLight ? "light" : "dark"}`;
                cell.style.fontSize = "18px";

                if ((r === 3 && c === 4) || (r === 6 && c === 6)) {
                    cell.innerHTML = "♜";
                    cell.style.color = "#dc2626";
                    cell.style.fontWeight = "bold";
                }
                boardEl.appendChild(cell);
            }
        }

        const input = container.querySelector("#pq-rook-input");
        const submitBtn = container.querySelector("#pq-rook-submit");
        const feedback = container.querySelector("#pq-rook-feedback");

        input.focus();

        const checkAnswer = () => {
            const val = Number(input.value);
            shell.incrementMoves();

            if (val === 128) {
                feedback.innerHTML = `<span style="color: var(--emerald);">✓ Correct! Total squares on 8×8 = 204. Subtracting 76 squares containing either rook leaves exactly 128 rook-free squares!</span>`;
                setTimeout(() => {
                    shell.completeLevel();
                }, 1200);
            } else {
                feedback.innerHTML = `<span style="color: var(--crimson);">✗ Incorrect. Try again!</span>`;
                input.select();
            }
        };

        submitBtn.onclick = checkAnswer;
        input.onkeydown = (e) => {
            if (e.key === "Enter") checkAnswer();
        };

        shell.onReset = () => {
            input.value = "";
            feedback.innerHTML = "";
            input.focus();
        };

        shell.cleanup = () => {
            shell.onReset = null;
        };
    }
};

