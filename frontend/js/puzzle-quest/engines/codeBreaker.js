"use strict";

/**
 * ENGINE: Code Breaker (Crack the Code)
 * Level 12: 3-Digit Deductive Combination Lock
 */

window.PuzzleEngines = window.PuzzleEngines || {};

window.PuzzleEngines.codeBreaker = {
    init: (container, puzzle, shell) => {
        const clues = puzzle.config.clues;
        const answer = puzzle.config.answer;
        let digits = [0, 0, 0];

        container.innerHTML = `
            <div style="max-width: 600px; width: 100%; margin: 0 auto; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 20px;">
                <!-- Dials -->
                <div style="background: rgba(14, 27, 48, 0.75); border: 1px solid var(--panel-border); border-radius: 14px; padding: 24px; width: 100%; box-sizing: border-box;">
                    <div style="font-size: 13px; font-weight: 800; color: var(--gold); margin-bottom: 16px;">
                        ENTER COMBINATION TO UNLOCK
                    </div>

                    <div style="display: flex; justify-content: center; gap: 20px; margin-bottom: 20px;">
                        ${[0, 1, 2].map(i => `
                            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                                <button class="pq-btn pq-btn-secondary pq-dial-btn" data-dial="${i}" data-dir="1" style="padding: 6px 14px; font-size: 18px;">▲</button>
                                <div class="pq-dial-val" id="dial-val-${i}" style="width: 64px; height: 72px; background: #030a16; border: 2px solid var(--cyan); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 36px; font-weight: 900; color: #ffffff; font-family: monospace; box-shadow: inset 0 0 12px rgba(0, 200, 255, 0.2);">
                                    0
                                </div>
                                <button class="pq-btn pq-btn-secondary pq-dial-btn" data-dial="${i}" data-dir="-1" style="padding: 6px 14px; font-size: 18px;">▼</button>
                            </div>
                        `).join("")}
                    </div>

                    <button id="pq-code-check" class="pq-btn pq-btn-gold pq-btn-large" type="button">
                        TRY COMBINATION 🔓
                    </button>
                </div>

                <!-- Clues List -->
                <div style="background: rgba(14, 27, 48, 0.6); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 18px; width: 100%; box-sizing: border-box; text-align: left;">
                    <div style="font-size: 12px; font-weight: 800; color: var(--cyan); margin-bottom: 12px; text-transform: uppercase;">
                        DEDUCTIVE CLUES:
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        ${clues.map((clue, idx) => `
                            <div class="pq-clue-item" id="clue-item-${idx}" style="display: flex; align-items: center; gap: 12px; padding: 8px 12px; background: rgba(255, 255, 255, 0.03); border-radius: 8px; font-size: 13px;">
                                <span style="font-family: monospace; font-size: 18px; font-weight: 900; color: var(--gold); letter-spacing: 2px;">${clue.guess}</span>
                                <span style="color: rgba(255, 255, 255, 0.85);">${clue.text}</span>
                            </div>
                        `).join("")}
                    </div>
                </div>

                <div id="pq-code-feedback" style="min-height: 24px; font-size: 14px; font-weight: 700;"></div>
            </div>
        `;

        const feedbackEl = container.querySelector("#pq-code-feedback");
        const dialValEls = [0, 1, 2].map(i => container.querySelector(`#dial-val-${i}`));

        function updateDials() {
            dialValEls.forEach((el, i) => {
                el.innerText = digits[i];
            });
        }

        container.querySelectorAll(".pq-dial-btn").forEach(btn => {
            btn.onclick = () => {
                if (feedbackEl) feedbackEl.innerHTML = "";
                const dial = Number(btn.dataset.dial);
                const dir = Number(btn.dataset.dir);
                digits[dial] = (digits[dial] + dir + 10) % 10;
                updateDials();
            };
        });

        container.querySelector("#pq-code-check").onclick = () => {
            shell.incrementMoves();
            const currentCode = digits.join("");

            if (currentCode === answer) {
                feedbackEl.innerHTML = `<div style="display: inline-block; color: var(--emerald); border-bottom: 2px solid var(--emerald); padding: 4px 12px; font-size: 13px; font-weight: 700;">✓ Correct! Vault unlocked!</div>`;
                setTimeout(() => {
                    shell.completeLevel();
                }, 900);
            } else {
                feedbackEl.innerHTML = `<div style="display: inline-block; color: var(--crimson); border-bottom: 2px solid var(--crimson); padding: 4px 12px; font-size: 13px; font-weight: 700;">Incorrect combination. Try again.</div>`;
            }
        };

        function resetState() {
            digits = [0, 0, 0];
            updateDials();
            if (feedbackEl) feedbackEl.innerHTML = "";
        }

        shell.onReset = resetState;

        updateDials();
    }
};

