"use strict";

/**
 * PUZZLE QUEST: CLASH-OF-CLANS STYLE SAGA WAR MAP
 * Continuous horizontal serpentine chain linking all challenge nodes.
 * Features textured tactical background, physical chain links with joints,
 * glowing active path, 3-star war base emblems, and smooth horizontal scrolling/drag.
 */

window.PuzzleMap = (() => {
    let isInitializedListeners = false;
    let isDragging = false;
    let hasMoved = false;
    let dragStartX = 0;
    let dragScrollLeft = 0;

    function renderMap() {
        const stage = document.getElementById("pq-map-stage");
        const canvas = document.getElementById("pq-map-canvas");
        const nodesContainer = document.getElementById("pq-map-nodes");
        const svgTrack = document.getElementById("pq-map-svg");
        if (!stage || !nodesContainer || !svgTrack) return;

        const catalog = window.PUZZLE_CATALOG || [];
        const progress = window.PuzzleQuestProgress ? window.PuzzleQuestProgress.getProgress() : {
            completedLevels: [],
            resumeLevel: 1,
            xpEarned: 0,
            bestStars: {}
        };

        const completedCount = progress.completedLevels.length;
        let totalXP = progress.xpEarned || 0;
        if (!totalXP && progress.completedLevels && progress.completedLevels.length > 0) {
            const xpMap = window.LEVEL_XP || {};
            totalXP = progress.completedLevels.reduce((sum, lvl) => sum + (xpMap[lvl] || 0), 0);
        }
        const bestStars = progress.bestStars || {};
        let totalStars = 0;
        Object.values(bestStars).forEach(s => {
            if (typeof s === "number") totalStars += s;
        });

        const progressCounter = document.getElementById("pq-map-progress-count");
        if (progressCounter) progressCounter.textContent = `${completedCount} / 50 COMPLETED`;

        const xpCounter = document.getElementById("pq-map-xp-count");
        if (xpCounter) xpCounter.textContent = `${totalXP} XP`;

        const maxPossibleStars = completedCount * 3;
        const starsCounter = document.getElementById("pq-map-stars-count");
        if (starsCounter) {
            starsCounter.textContent = completedCount > 0
                ? `★ ${totalStars} / ${maxPossibleStars} STARS`
                : `★ 0 STARS`;
        }

        // Layout constants for horizontal war chain
        const X_START = 130;
        const X_STEP = 150;
        const TOTAL_WIDTH = X_START + Math.max(1, catalog.length - 1) * X_STEP + 160;
        const CANVAS_HEIGHT = 440;
        const CENTER_Y = 215;
        const AMPLITUDE = 75;

        if (canvas) {
            canvas.style.width = `${TOTAL_WIDTH}px`;
            canvas.style.height = `${CANVAS_HEIGHT}px`;
        }
        nodesContainer.style.width = `${TOTAL_WIDTH}px`;
        nodesContainer.style.height = `${CANVAS_HEIGHT}px`;

        svgTrack.setAttribute("width", String(TOTAL_WIDTH));
        svgTrack.setAttribute("height", String(CANVAS_HEIGHT));
        svgTrack.setAttribute("viewBox", `0 0 ${TOTAL_WIDTH} ${CANVAS_HEIGHT}`);

        nodesContainer.innerHTML = "";

        const points = [];

        // Build war base nodes
        catalog.forEach((puzzle, idx) => {
            const isCompleted = progress.completedLevels.includes(puzzle.level);
            const isResume = progress.resumeLevel === puzzle.level;
            const isUnlocked = window.PuzzleQuestProgress
                ? window.PuzzleQuestProgress.isLevelUnlocked(puzzle.level)
                : (puzzle.level === 1);

            const lvlStars = bestStars[String(puzzle.level)] || (isCompleted ? 3 : 0);

            // Calculate serpentine wave position
            const x = X_START + idx * X_STEP;
            const y = CENTER_Y + Math.sin(idx * 0.72) * AMPLITUDE;

            points.push({
                x,
                y,
                level: puzzle.level,
                isCompleted,
                isResume,
                isUnlocked
            });

            // 3-star display (Clash of Clans war base style)
            let starChars = "";
            for (let s = 1; s <= 3; s++) {
                if (s <= lvlStars) {
                    starChars += `<span class="pq-star-earned">★</span>`;
                } else {
                    starChars += `<span class="pq-star-empty">★</span>`;
                }
            }

            const wrapper = document.createElement("div");
            wrapper.className = `pq-map-node-wrapper ${isCompleted ? "completed" : ""} ${isResume && !isCompleted ? "resume" : ""} ${!isUnlocked ? "locked" : ""}`;
            wrapper.dataset.level = puzzle.level;
            wrapper.style.left = `${x}px`;
            wrapper.style.top = `${y}px`;
            const pzXp = puzzle.xp || (window.LEVEL_XP ? window.LEVEL_XP[puzzle.level] : 0);
            wrapper.title = isUnlocked
                ? `${puzzle.title} (+${pzXp} XP)`
                : `Level ${puzzle.level} is locked! Complete Level ${puzzle.level - 1} first.`;

            wrapper.innerHTML = `
                <div class="pq-map-node">
                    <span class="pq-node-num">#${puzzle.level}</span>
                    <span class="pq-node-icon">${puzzle.icon || "🧩"}</span>
                    ${isCompleted ? `<div class="pq-node-check">✓</div>` : ""}
                </div>
                <div class="pq-node-stars">
                    ${starChars}
                </div>
                <div class="pq-node-label" title="${puzzle.title}">${puzzle.title}</div>
            `;

            wrapper.onclick = (e) => {
                if (hasMoved) return; // Ignore click if panning/dragging
                if (!isUnlocked) {
                    wrapper.classList.remove("shake");
                    void wrapper.offsetWidth;
                    wrapper.classList.add("shake");
                    return;
                }
                if (window.PuzzleShell) {
                    window.PuzzleShell.startLevel(puzzle.level);
                }
            };

            nodesContainer.appendChild(wrapper);
        });

        // Draw Clash of Clans war chain in SVG
        drawWarChain(svgTrack, points, progress.resumeLevel);

        // Center on target/resume level
        requestAnimationFrame(() => {
            focusLevel(progress.resumeLevel || 1, false);
        });

        // Initialize drag & scroll controls once
        if (!isInitializedListeners) {
            initScrollControls(stage);
            isInitializedListeners = true;
        }
    }

    function drawWarChain(svg, points, resumeLevel) {
        if (!svg || points.length === 0) return;

        // Build continuous cubic spline path
        let fullPath = "";
        for (let i = 0; i < points.length; i++) {
            if (i === 0) {
                fullPath += `M ${points[0].x} ${points[0].y}`;
            } else {
                const prev = points[i - 1];
                const curr = points[i];
                const cp1x = prev.x + (curr.x - prev.x) * 0.5;
                const cp1y = prev.y;
                const cp2x = prev.x + (curr.x - prev.x) * 0.5;
                const cp2y = curr.y;
                fullPath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
            }
        }

        // Build completed chain segment path
        let completedPath = "";
        let lastCompletedIdx = -1;
        for (let i = points.length - 1; i >= 0; i--) {
            if (points[i].isCompleted) {
                lastCompletedIdx = i;
                break;
            }
        }
        if (lastCompletedIdx >= 0) {
            completedPath += `M ${points[0].x} ${points[0].y}`;
            for (let i = 1; i <= lastCompletedIdx; i++) {
                const prev = points[i - 1];
                const curr = points[i];
                const cp1x = prev.x + (curr.x - prev.x) * 0.5;
                const cp1y = prev.y;
                const cp2x = prev.x + (curr.x - prev.x) * 0.5;
                const cp2y = curr.y;
                completedPath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
            }
        }

        // Build active link segment (pulse connecting to resume level)
        let activePath = "";
        const resumeIdx = points.findIndex(p => p.level === resumeLevel);
        if (resumeIdx > 0 && resumeIdx < points.length) {
            const prev = points[resumeIdx - 1];
            const curr = points[resumeIdx];
            const cp1x = prev.x + (curr.x - prev.x) * 0.5;
            const cp1y = prev.y;
            const cp2x = prev.x + (curr.x - prev.x) * 0.5;
            const cp2y = curr.y;
            activePath = `M ${prev.x} ${prev.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
        }

        // Metallic chain joints at segment midpoints
        let jointsHtml = "";
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const mx = (p1.x + p2.x) / 2;
            const my = (p1.y + p2.y) / 2;
            const isCompletedJoint = p1.isCompleted && p2.isCompleted;
            jointsHtml += `
                <g class="pq-chain-joint" transform="translate(${mx}, ${my})">
                    <circle r="7" class="pq-joint-outer ${isCompletedJoint ? "completed" : ""}" />
                    <circle r="3.5" class="pq-joint-inner ${isCompletedJoint ? "completed" : ""}" />
                </g>
            `;
        }

        svg.innerHTML = `
            <!-- Chain drop shadow -->
            <path d="${fullPath}" class="pq-chain-shadow" />
            <!-- Heavy structural steel chain -->
            <path d="${fullPath}" class="pq-chain-backbone" />
            <!-- Metallic interlocking chain link dashes -->
            <path d="${fullPath}" class="pq-chain-links" />
            <!-- Completed progress glowing chain -->
            ${completedPath ? `<path d="${completedPath}" class="pq-chain-completed" />` : ""}
            <!-- Active glowing pulse towards current war target -->
            ${activePath ? `<path d="${activePath}" class="pq-chain-active-link" />` : ""}
            <!-- Heavy chain joints -->
            ${jointsHtml}
        `;
    }

    function focusLevel(levelNum, smooth = true) {
        const stage = document.getElementById("pq-map-stage");
        const node = document.querySelector(`.pq-map-node-wrapper[data-level="${levelNum}"]`);
        if (!stage || !node) return;

        const stageWidth = stage.clientWidth;
        const nodeX = parseFloat(node.style.left) || 0;
        const targetScroll = Math.max(0, nodeX - stageWidth / 2);

        stage.scrollTo({
            left: targetScroll,
            behavior: smooth ? "smooth" : "auto"
        });
    }

    function initScrollControls(stage) {
        if (!stage) return;

        // Mouse wheel horizontal scrolling
        stage.addEventListener("wheel", (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                stage.scrollLeft += e.deltaY;
            }
        }, { passive: false });

        // Mouse drag-to-pan
        stage.addEventListener("mousedown", (e) => {
            isDragging = true;
            hasMoved = false;
            dragStartX = e.pageX - stage.offsetLeft;
            dragScrollLeft = stage.scrollLeft;
        });

        window.addEventListener("mouseup", () => {
            if (isDragging) {
                isDragging = false;
                setTimeout(() => {
                    hasMoved = false;
                }, 40);
            }
        });

        stage.addEventListener("mousemove", (e) => {
            if (!isDragging) return;
            const x = e.pageX - stage.offsetLeft;
            const walk = (x - dragStartX) * 1.4;
            if (Math.abs(walk) > 4) {
                hasMoved = true;
            }
            stage.scrollLeft = dragScrollLeft - walk;
        });

        // Touch swipe support
        let touchStartX = 0;
        let touchScrollLeft = 0;
        stage.addEventListener("touchstart", (e) => {
            if (e.touches.length === 1) {
                hasMoved = false;
                touchStartX = e.touches[0].pageX - stage.offsetLeft;
                touchScrollLeft = stage.scrollLeft;
            }
        }, { passive: true });

        stage.addEventListener("touchmove", (e) => {
            if (e.touches.length === 1) {
                const x = e.touches[0].pageX - stage.offsetLeft;
                const walk = (x - touchStartX) * 1.2;
                if (Math.abs(walk) > 6) {
                    hasMoved = true;
                }
                stage.scrollLeft = touchScrollLeft - walk;
            }
        }, { passive: true });

    }

    return {
        renderMap,
        focusLevel
    };
})();
