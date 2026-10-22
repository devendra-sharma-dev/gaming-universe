"use strict";

/**
 * ENGINE: Tower of Hanoi
 * Level 2 (3 disks, limit 7)
 * Level 10 (4 disks, limit 15)
 * Level 25 (5 disks, limit 31)
 */

window.PuzzleEngines = window.PuzzleEngines || {};

window.PuzzleEngines.hanoi = {
    init: (container, puzzle, shell) => {
        const numDisks = puzzle.config.disks || 3;
        const maxMoves = puzzle.config.maxMoves || (Math.pow(2, numDisks) - 1);

        // State: pegs[0] = Left, pegs[1] = Middle, pegs[2] = Right
        // Peg arrays hold disk numbers [numDisks, ..., 1] (bottom to top)
        let pegs = [
            Array.from({ length: numDisks }, (_, i) => numDisks - i),
            [],
            []
        ];

        let selectedPeg = null;
        let movesCount = 0;

        const minArenaWidth = numDisks >= 5 ? '620px' : (numDisks === 4 ? '520px' : '440px');

        container.innerHTML = `
            <div class="pq-hanoi-scroll-wrapper">
                <div style="display: flex; flex-direction: column; align-items: center; width: max-content; min-width: 100%; margin: 0 auto; box-sizing: border-box; padding: 0 16px;">
                    <div class="pq-hanoi-container" id="pq-hanoi-arena" style="width: ${minArenaWidth}; min-width: ${minArenaWidth};">
                        <div class="pq-hanoi-peg" data-peg="0"></div>
                        <div class="pq-hanoi-peg" data-peg="1"></div>
                        <div class="pq-hanoi-peg" data-peg="2"></div>
                    </div>

                    <div class="pq-hanoi-labels-row" style="width: ${minArenaWidth}; min-width: ${minArenaWidth};">
                        <div class="pq-hanoi-label-col" data-peg="0">LEFT (START)</div>
                        <div class="pq-hanoi-label-col" data-peg="1">MIDDLE</div>
                        <div class="pq-hanoi-label-col" data-peg="2">RIGHT (TARGET)</div>
                    </div>

                    <div id="pq-hanoi-msg" style="min-height: 20px; font-size: 13px; font-weight: 700; color: var(--silver); margin-top: 20px; text-align: center;">
                        Select the Left peg to pick up the top disk, then select a destination peg.
                    </div>
                </div>
            </div>
        `;

        const arena = container.querySelector("#pq-hanoi-arena");
        const msgDisplay = container.querySelector("#pq-hanoi-msg");
        const pegElements = container.querySelectorAll(".pq-hanoi-peg");
        const labelCols = container.querySelectorAll(".pq-hanoi-label-col");

        function render() {
            pegElements.forEach((pegEl, pegIdx) => {
                // Clear existing disk elements
                const existingDisks = pegEl.querySelectorAll(".pq-hanoi-disk");
                existingDisks.forEach(d => d.remove());

                const labelCol = container.querySelector(`.pq-hanoi-label-col[data-peg="${pegIdx}"]`);
                if (selectedPeg === pegIdx) {
                    pegEl.classList.add("selected");
                    if (labelCol) labelCol.classList.add("selected");
                } else {
                    pegEl.classList.remove("selected");
                    if (labelCol) labelCol.classList.remove("selected");
                }

                const diskList = pegs[pegIdx];
                diskList.forEach((diskNum, i) => {
                    const diskEl = document.createElement("div");
                    diskEl.className = `pq-hanoi-disk pq-disk-${diskNum}`;
                    diskEl.innerText = diskNum;

                    // If top disk and peg is selected, float up
                    if (selectedPeg === pegIdx && i === diskList.length - 1) {
                        diskEl.classList.add("selected");
                    }
                    pegEl.appendChild(diskEl);
                });
            });

            shell.setMoves(movesCount);
        }

        function onPegClick(pegIdx) {
            msgDisplay.innerText = "";

            if (selectedPeg === null) {
                // Picking up top disk
                if (pegs[pegIdx].length === 0) {
                    msgDisplay.innerText = "This tower is empty. Choose a tower with disks.";
                    return;
                }
                selectedPeg = pegIdx;
                render();
            } else {
                // Placing disk onto pegIdx
                if (selectedPeg === pegIdx) {
                    // Deselect
                    selectedPeg = null;
                    render();
                    return;
                }

                const sourcePegDisks = pegs[selectedPeg];
                const targetPegDisks = pegs[pegIdx];
                const diskToMove = sourcePegDisks[sourcePegDisks.length - 1];

                // Rule check: larger disk cannot be placed on smaller disk
                if (targetPegDisks.length > 0 && targetPegDisks[targetPegDisks.length - 1] < diskToMove) {
                    msgDisplay.innerHTML = `<span style="color:var(--crimson);">Illegal Move! Cannot place disk ${diskToMove} on smaller disk ${targetPegDisks[targetPegDisks.length - 1]}.</span>`;
                    selectedPeg = null;
                    render();
                    return;
                }

                // Legal move!
                sourcePegDisks.pop();
                targetPegDisks.push(diskToMove);
                selectedPeg = null;
                movesCount++;
                render();

                // Check move limit violation
                if (movesCount > maxMoves) {
                    shell.failLevel(`Move limit exceeded! You took ${movesCount} moves, but the maximum allowed for this level is ${maxMoves}.`);
                    return;
                }

                // Check win condition: all disks on target peg (peg 2)
                if (pegs[2].length === numDisks) {
                    msgDisplay.innerHTML = `<span style="color:var(--emerald);">✓ Complete! Solved in ${movesCount} / ${maxMoves} optimal moves!</span>`;
                    setTimeout(() => {
                        shell.completeLevel();
                    }, 800);
                }
            }
        }

        pegElements.forEach((pegEl, idx) => {
            pegEl.onclick = () => onPegClick(idx);
        });

        labelCols.forEach((colEl, idx) => {
            colEl.onclick = () => onPegClick(idx);
        });

        render();

        // Register reset with shell
        shell.onReset = () => {
            pegs = [
                Array.from({ length: numDisks }, (_, i) => numDisks - i),
                [],
                []
            ];
            selectedPeg = null;
            movesCount = 0;
            render();
            msgDisplay.innerText = "Towers reset to starting state.";
        };
    }
};

