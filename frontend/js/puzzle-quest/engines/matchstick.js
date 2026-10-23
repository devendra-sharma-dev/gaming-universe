"use strict";

/**
 * ENGINE: Matchstick Equation
 * Level 3: 19 + 93 = 96 -> Move 1 matchstick to make 13 + 83 = 96
 */

window.PuzzleEngines = window.PuzzleEngines || {};

window.PuzzleEngines.matchstick = {
    init: (container, puzzle, shell) => {
        // Seven segment definitions for digits 0-9
        const DIGIT_SEGS = {
            "0": ["a", "b", "c", "d", "e", "f"],
            "1": ["b", "c"],
            "2": ["a", "b", "g", "e", "d"],
            "3": ["a", "b", "g", "c", "d"],
            "4": ["f", "g", "b", "c"],
            "5": ["a", "f", "g", "c", "d"],
            "6": ["a", "f", "e", "d", "c", "g"],
            "7": ["a", "b", "c"],
            "8": ["a", "b", "c", "d", "e", "f", "g"],
            "9": ["a", "b", "c", "d", "f", "g"]
        };

        // Initial equation: 19 + 93 = 96
        const initialSegments = {
            d1: new Set(["b", "c"]),                         // '1'
            d2: new Set(["a", "b", "c", "d", "f", "g"]),      // '9'
            d3: new Set(["a", "b", "c", "d", "f", "g"]),      // '9'
            d4: new Set(["a", "b", "c", "d", "g"]),           // '3'
            d5: new Set(["a", "b", "c", "d", "f", "g"]),      // '9'
            d6: new Set(["a", "f", "e", "d", "c", "g"])       // '6'
        };

        let currentSegments = {
            d1: new Set(initialSegments.d1),
            d2: new Set(initialSegments.d2),
            d3: new Set(initialSegments.d3),
            d4: new Set(initialSegments.d4),
            d5: new Set(initialSegments.d5),
            d6: new Set(initialSegments.d6)
        };

        let heldStick = false;
        let sticksMoved = 0;

        function renderDigitHtml(id) {
            return `
                <div class="pq-7seg" id="seg-${id}">
                    <div class="pq-seg pq-seg-a" data-loc="${id}" data-seg="a"></div>
                    <div class="pq-seg pq-seg-b" data-loc="${id}" data-seg="b"></div>
                    <div class="pq-seg pq-seg-c" data-loc="${id}" data-seg="c"></div>
                    <div class="pq-seg pq-seg-d" data-loc="${id}" data-seg="d"></div>
                    <div class="pq-seg pq-seg-e" data-loc="${id}" data-seg="e"></div>
                    <div class="pq-seg pq-seg-f" data-loc="${id}" data-seg="f"></div>
                    <div class="pq-seg pq-seg-g" data-loc="${id}" data-seg="g"></div>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="pq-matchstick-board">
                <div style="font-size: 13px; font-weight: 800; color: var(--gold); margin-bottom: 8px; text-align: center;">
                    MATCHSTICK STATUS: <span id="pq-stick-status" style="color: var(--cyan);">HAND EMPTY (CLICK AN ACTIVE STICK TO PICK UP)</span>
                </div>

                <div class="pq-matchstick-scroll-wrap">
                    <div class="pq-digit-group">
                        <!-- Term 1: 19 -->
                        <div class="pq-match-term">
                            ${renderDigitHtml("d1")}
                            ${renderDigitHtml("d2")}
                        </div>

                        <!-- Plus Sign -->
                        <div class="pq-match-op">
                            +
                        </div>

                        <!-- Term 2: 93 -->
                        <div class="pq-match-term">
                            ${renderDigitHtml("d3")}
                            ${renderDigitHtml("d4")}
                        </div>

                        <!-- Equals Sign -->
                        <div class="pq-match-op">
                            =
                        </div>

                        <!-- Term 3: 96 -->
                        <div class="pq-match-term">
                            ${renderDigitHtml("d5")}
                            ${renderDigitHtml("d6")}
                        </div>
                    </div>
                </div>

                <div style="display: flex; gap: 12px; margin-top: 16px; justify-content: center; flex-wrap: wrap;">
                    <button id="pq-stick-check" class="pq-btn pq-btn-gold" type="button">CHECK EQUATION</button>
                    <button id="pq-stick-reset" class="pq-btn pq-btn-secondary" type="button">RESET STICKS</button>
                </div>

                <div id="pq-stick-feedback" style="min-height: 24px; margin-top: 8px; font-size: 13px; font-weight: 700; text-align: center;"></div>
            </div>
        `;

        const statusEl = container.querySelector("#pq-stick-status");
        const feedbackEl = container.querySelector("#pq-stick-feedback");
        const allSegs = container.querySelectorAll(".pq-seg[data-loc]");

        function render() {
            allSegs.forEach(seg => {
                const loc = seg.dataset.loc;
                const s = seg.dataset.seg;
                if (currentSegments[loc] && currentSegments[loc].has(s)) {
                    seg.classList.add("active");
                } else {
                    seg.classList.remove("active");
                }
            });

            if (heldStick) {
                statusEl.innerHTML = `<span style="color:var(--gold);">HOLDING 1 STICK 🥢 (CLICK EMPTY SLOT TO PLACE)</span>`;
            } else {
                statusEl.innerHTML = `<span>HAND EMPTY (STICKS MOVED: ${sticksMoved})</span>`;
            }
        }

        allSegs.forEach(seg => {
            seg.onclick = () => {
                feedbackEl.innerText = "";
                const loc = seg.dataset.loc;
                const s = seg.dataset.seg;

                if (!heldStick) {
                    // Pick up active stick
                    if (currentSegments[loc].has(s)) {
                        currentSegments[loc].delete(s);
                        heldStick = true;
                        render();
                    }
                } else {
                    // Place stick in empty slot
                    if (!currentSegments[loc].has(s)) {
                        currentSegments[loc].add(s);
                        heldStick = false;
                        sticksMoved++;
                        shell.incrementMoves();
                        render();
                    }
                }
            };
        });

        function parseDigit(set) {
            for (const [digit, segs] of Object.entries(DIGIT_SEGS)) {
                if (segs.length === set.size && segs.every(s => set.has(s))) {
                    return Number(digit);
                }
            }
            return null;
        }

        function checkEquation() {
            if (heldStick) {
                feedbackEl.innerHTML = `<span style="color:var(--crimson);">Place the matchstick you are holding before checking!</span>`;
                return;
            }

            const d1 = parseDigit(currentSegments.d1);
            const d2 = parseDigit(currentSegments.d2);
            const d3 = parseDigit(currentSegments.d3);
            const d4 = parseDigit(currentSegments.d4);
            const d5 = parseDigit(currentSegments.d5);
            const d6 = parseDigit(currentSegments.d6);

            if (d1 === null || d2 === null || d3 === null || d4 === null || d5 === null || d6 === null) {
                feedbackEl.innerHTML = `<span style="color:var(--crimson);">The segments do not all form valid digits! Make sure each position displays a clean digit.</span>`;
                return;
            }

            const num1 = d1 * 10 + d2;
            const num2 = d3 * 10 + d4;
            const num3 = d5 * 10 + d6;

            const eqStr = `${num1} + ${num2} = ${num3}`;
            const isValidMath = num1 + num2 === num3;

            if (isValidMath && sticksMoved === 1) {
                feedbackEl.innerHTML = `<span style="color:var(--emerald);">✓ Brilliant! ${eqStr} is mathematically correct in exactly 1 stick move!</span>`;
                setTimeout(() => {
                    shell.completeLevel();
                }, 1000);
            } else if (isValidMath && sticksMoved !== 1) {
                feedbackEl.innerHTML = `<span style="color:var(--gold);">${eqStr} is correct, but you moved ${sticksMoved} sticks. You must move exactly ONE stick!</span>`;
            } else {
                feedbackEl.innerHTML = `<span style="color:var(--crimson);">✗ ${eqStr} is mathematically incorrect (${num1} + ${num2} = ${num1 + num2} ≠ ${num3}). Keep trying!</span>`;
            }
        }

        container.querySelector("#pq-stick-check").onclick = checkEquation;
        container.querySelector("#pq-stick-reset").onclick = () => {
            currentSegments = {
                d1: new Set(initialSegments.d1),
                d2: new Set(initialSegments.d2),
                d3: new Set(initialSegments.d3),
                d4: new Set(initialSegments.d4),
                d5: new Set(initialSegments.d5),
                d6: new Set(initialSegments.d6)
            };
            heldStick = false;
            sticksMoved = 0;
            render();
            feedbackEl.innerText = "Equation reset to 19 + 93 = 96.";
        };

        render();
    }
};
