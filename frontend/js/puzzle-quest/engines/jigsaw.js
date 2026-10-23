"use strict";

/**
 * ENGINE: Jigsaw
 * Level 8 (5×5 Easy, 25 pieces)
 * Level 38 (8×8 Medium, 64 pieces)
 * Level 42 (10×10 Hard, 100 pieces)
 * 
 * Pixel-perfect sharp cutting via canvas pre-slicing.
 */

window.PuzzleEngines = window.PuzzleEngines || {};

window.PuzzleEngines.jigsaw = {
    init: (container, puzzle, shell) => {
        const size = puzzle.config.gridSize || 5;
        const totalPieces = size * size;
        const fullDataUrl = puzzle.config.image || null;

        // Piece mapping: piece[i] currently placed at cell i
        // Solved state: piece[i] === i
        let pieces = Array.from({ length: totalPieces }, (_, i) => i);

        // Shuffle with derangement (ensure no piece starts at correct spot)
        do {
            for (let i = pieces.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
            }
        } while (pieces.some((p, i) => p === i));

        let selectedIndex = null;
        let glowingIndices = null; // [idxA, idxB]
        const tileDataUrls = new Array(totalPieces).fill(null);

        // Fixed board dimensions: 360px x 360px guarantees exact integer cell sizes:
        // 5×5: 72px, 8×8: 45px, 10×10: 36px
        const cellSize = Math.floor(360 / size);
        const boardDim = cellSize * size;

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; width: 100%;">
                <div style="font-size: 13px; font-weight: 800; color: var(--gold); margin-bottom: 12px; letter-spacing: 0.5px;">
                    CORRECT PIECES: <span id="pq-jigsaw-count" style="color:var(--cyan); font-family:monospace; font-size: 16px;">0</span> / ${totalPieces}
                </div>

                <div class="pq-jigsaw-scroll-wrapper">
                    <div class="pq-jigsaw-inner-container">
                        <div class="pq-jigsaw-grid" id="pq-jigsaw-board" style="box-sizing: content-box; width:${boardDim}px; height:${boardDim}px; grid-template-columns: repeat(${size}, ${cellSize}px); grid-template-rows: repeat(${size}, ${cellSize}px);">
                            <!-- Cells injected by JS -->
                        </div>
                    </div>
                </div>

                <div style="font-size: 12px; color: rgba(255, 255, 255, 0.6); margin-top: 14px; text-align: center;">
                    Tap any piece, then tap another to swap them into place.
                </div>
            </div>
        `;

        const boardEl = container.querySelector("#pq-jigsaw-board");
        const countEl = container.querySelector("#pq-jigsaw-count");

        // Slice source image into individual tile data URLs for 100% pixel-perfect sharp cutting
        function sliceSource(source) {
            try {
                const srcW = source.naturalWidth || source.width;
                const srcH = source.naturalHeight || source.height;
                if (!srcW || !srcH) return;

                const tileW = srcW / size;
                const tileH = srcH / size;

                const tileCanvas = document.createElement("canvas");
                const exportTileW = Math.round(tileW);
                const exportTileH = Math.round(tileH);
                tileCanvas.width = exportTileW;
                tileCanvas.height = exportTileH;
                const tileCtx = tileCanvas.getContext("2d", { alpha: false });

                for (let r = 0; r < size; r++) {
                    for (let c = 0; c < size; c++) {
                        const pieceId = r * size + c;
                        const sx = c * tileW;
                        const sy = r * tileH;
                        tileCtx.clearRect(0, 0, exportTileW, exportTileH);
                        tileCtx.drawImage(source, sx, sy, tileW, tileH, 0, 0, exportTileW, exportTileH);
                        tileDataUrls[pieceId] = tileCanvas.toDataURL("image/jpeg", 0.95);
                    }
                }
            } catch (err) {
                console.warn("Jigsaw slice exception, falling back to CSS coordinates", err);
            }
        }

        // Initialize source image or fallback procedural canvas
        if (fullDataUrl) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            let sliced = false;
            const doSlice = () => {
                if (sliced) return;
                if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                    sliced = true;
                    sliceSource(img);
                    render();
                }
            };
            img.onload = doSlice;
            img.onerror = () => {
                render();
            };
            img.src = fullDataUrl;
            if (img.complete) {
                doSlice();
            }
        } else {
            // Procedural canvas fallback
            const canvas = document.createElement("canvas");
            const dim = 1000;
            canvas.width = dim;
            canvas.height = dim;
            const ctx = canvas.getContext("2d");

            const grad = ctx.createRadialGradient(dim / 2, dim / 2, 20, dim / 2, dim / 2, dim / 1.4);
            grad.addColorStop(0, "#38bdf8");
            grad.addColorStop(0.3, "#818cf8");
            grad.addColorStop(0.7, "#a855f7");
            grad.addColorStop(1, "#0f172a");
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, dim, dim);

            ctx.lineWidth = 4;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
            for (let i = 0; i < 8; i++) {
                ctx.beginPath();
                ctx.arc(dim / 2, dim / 2, 40 + i * 50, 0, Math.PI * 2);
                ctx.stroke();
            }

            sliceSource(canvas);
        }

        // Hint handler: find 2 currently incorrect pieces such that swapping them puts at least one into its correct position
        shell.onHintDismissed = () => {
            const incorrectIndices = [];
            for (let i = 0; i < totalPieces; i++) {
                if (pieces[i] !== i) {
                    incorrectIndices.push(i);
                }
            }

            if (incorrectIndices.length < 2) return;

            let foundPair = null;
            for (const i of incorrectIndices) {
                const pieceThatBelongsAtI = pieces.indexOf(i);
                if (pieceThatBelongsAtI !== -1 && pieceThatBelongsAtI !== i) {
                    if (pieces[pieceThatBelongsAtI] !== pieceThatBelongsAtI) {
                        foundPair = [i, pieceThatBelongsAtI];
                        break;
                    }
                }
            }

            if (!foundPair && incorrectIndices.length >= 2) {
                foundPair = [incorrectIndices[0], incorrectIndices[1]];
            }

            glowingIndices = foundPair;
            render();
        };

        function render() {
            boardEl.innerHTML = "";
            let correctCount = 0;

            for (let i = 0; i < totalPieces; i++) {
                const pieceId = pieces[i];
                const origR = Math.floor(pieceId / size);
                const origC = pieceId % size;

                const cell = document.createElement("div");
                cell.className = "pq-jigsaw-cell";
                cell.dataset.index = i;
                cell.style.width = `${cellSize}px`;
                cell.style.height = `${cellSize}px`;

                if (selectedIndex === i) {
                    cell.classList.add("selected");
                }

                if (glowingIndices && glowingIndices.includes(i)) {
                    cell.classList.add("glowing");
                }

                if (pieceId === i) {
                    correctCount++;
                }

                // Render image slice
                if (tileDataUrls[pieceId]) {
                    cell.style.backgroundImage = `url("${tileDataUrls[pieceId]}")`;
                    cell.style.backgroundSize = "100% 100%";
                    cell.style.backgroundPosition = "0 0";
                } else if (fullDataUrl) {
                    cell.style.backgroundImage = `url("${fullDataUrl}")`;
                    cell.style.backgroundSize = `${size * 100}% ${size * 100}%`;
                    cell.style.backgroundPosition = `${(origC / (size - 1)) * 100}% ${(origR / (size - 1)) * 100}%`;
                }

                cell.onclick = () => onPieceClick(i);
                boardEl.appendChild(cell);
            }

            countEl.innerText = correctCount;

            if (correctCount === totalPieces) {
                setTimeout(() => {
                    shell.completeLevel();
                }, 600);
            }
        }

        function onPieceClick(idx) {
            if (selectedIndex === null) {
                selectedIndex = idx;
                render();
            } else if (selectedIndex === idx) {
                selectedIndex = null;
                render();
            } else {
                // Swap pieces
                [pieces[selectedIndex], pieces[idx]] = [pieces[idx], pieces[selectedIndex]];
                selectedIndex = null;
                glowingIndices = null; // Stop glowing once swapped
                shell.incrementMoves();
                render();
            }
        }

        render();

        shell.onReset = () => {
            do {
                for (let i = pieces.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
                }
            } while (pieces.some((p, i) => p === i));
            selectedIndex = null;
            glowingIndices = null;
            render();
        };
    }
};
