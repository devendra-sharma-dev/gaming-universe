"use strict";

/**
 * ENGINE: Water Pouring Challenge
 * Level 14: 3L & 5L Vessels • Measure 4L in 5L Vessel
 */

window.PuzzleEngines = window.PuzzleEngines || {};

window.PuzzleEngines.waterPouring = {
    init: (container, puzzle, shell) => {
        let currentA = 0; // 3L
        let currentB = 0; // 5L
        const capA = 3;
        const capB = 5;

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 580px; margin: 0 auto;">
                <div style="font-size: 14px; font-weight: 800; color: var(--gold); margin-bottom: 8px;">
                    MEASURE EXACTLY <span style="color:var(--cyan); font-size:18px;">4 LITRES</span> OF WATER
                </div>

                <div class="pq-water-scroll-wrapper">
                    <div class="pq-water-scene">
                        <!-- Vessel A (3L) -->
                        <div class="pq-vessel">
                            <div class="pq-vessel-glass" id="glass-a" style="height: 150px; width: 80px;">
                                <div class="pq-vessel-liquid" id="liquid-a" style="height: 0%;"></div>
                            </div>
                            <span style="font-size: 14px; font-weight: 900; color: #ffffff;">3L BUCKET</span>
                            <strong id="vol-a" style="font-size: 18px; color: var(--cyan); font-family: monospace;">0 / 3 L</strong>
                            <div style="display: flex; gap: 6px; margin-top: 6px;">
                                <button id="btn-fill-a" class="pq-hud-btn" type="button">FILL</button>
                                <button id="btn-empty-a" class="pq-hud-btn" type="button">EMPTY</button>
                            </div>
                        </div>

                        <!-- Transfer Controls -->
                        <div style="display: flex; flex-direction: column; gap: 10px; align-self: center;">
                            <button id="btn-pour-ab" class="pq-btn pq-btn-secondary" type="button" style="padding: 10px 16px;">
                                POUR A ➔ B
                            </button>
                            <button id="btn-pour-ba" class="pq-btn pq-btn-secondary" type="button" style="padding: 10px 16px;">
                                POUR B ➔ A
                            </button>
                        </div>

                        <!-- Vessel B (5L) -->
                        <div class="pq-vessel">
                            <div class="pq-vessel-glass" id="glass-b" style="height: 220px; width: 100px;">
                                <div class="pq-vessel-liquid" id="liquid-b" style="height: 0%;"></div>
                            </div>
                            <span style="font-size: 14px; font-weight: 900; color: #ffffff;">5L BUCKET</span>
                            <strong id="vol-b" style="font-size: 18px; color: var(--cyan); font-family: monospace;">0 / 5 L</strong>
                            <div style="display: flex; gap: 6px; margin-top: 6px;">
                                <button id="btn-fill-b" class="pq-hud-btn" type="button">FILL</button>
                                <button id="btn-empty-b" class="pq-hud-btn" type="button">EMPTY</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="pq-water-feedback" style="min-height: 24px; font-size: 14px; font-weight: 700; margin-top: 14px;"></div>
            </div>
        `;

        const liquidA = container.querySelector("#liquid-a");
        const liquidB = container.querySelector("#liquid-b");
        const volA = container.querySelector("#vol-a");
        const volB = container.querySelector("#vol-b");
        const feedbackEl = container.querySelector("#pq-water-feedback");

        function render() {
            liquidA.style.height = `${(currentA / capA) * 100}%`;
            liquidB.style.height = `${(currentB / capB) * 100}%`;
            volA.innerText = `${currentA} / 3 L`;
            volB.innerText = `${currentB} / 5 L`;

            if (currentB === 4) {
                feedbackEl.innerHTML = `<span style="color:var(--emerald);">✓ Target achieved! Exactly 4 Litres measured in the 5L vessel!</span>`;
                setTimeout(() => {
                    shell.completeLevel();
                }, 800);
            }
        }

        container.querySelector("#btn-fill-a").onclick = () => {
            currentA = capA;
            shell.incrementMoves();
            render();
        };

        container.querySelector("#btn-empty-a").onclick = () => {
            currentA = 0;
            shell.incrementMoves();
            render();
        };

        container.querySelector("#btn-fill-b").onclick = () => {
            currentB = capB;
            shell.incrementMoves();
            render();
        };

        container.querySelector("#btn-empty-b").onclick = () => {
            currentB = 0;
            shell.incrementMoves();
            render();
        };

        container.querySelector("#btn-pour-ab").onclick = () => {
            const transfer = Math.min(currentA, capB - currentB);
            currentA -= transfer;
            currentB += transfer;
            shell.incrementMoves();
            render();
        };

        container.querySelector("#btn-pour-ba").onclick = () => {
            const transfer = Math.min(currentB, capA - currentA);
            currentB -= transfer;
            currentA += transfer;
            shell.incrementMoves();
            render();
        };

        render();

        shell.onReset = () => {
            currentA = 0;
            currentB = 0;
            render();
            feedbackEl.innerText = "";
        };
    }
};

