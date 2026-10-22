"use strict";

/**
 * PUZZLE QUEST: GAMEPLAY SHELL
 * Manages active puzzle lifecycle, timer, moves, HUD, hints,
 * reference assets preview, completion modals, and level transitions.
 */

window.PuzzleShell = (() => {
    let currentPuzzle = null;
    let timerInterval = null;
    let elapsedSeconds = 0;
    let movesCount = 0;
    let isCompleted = false;
    let hintUsed = false;

    // Web Audio Sound Effects
    const audioCtx = window.AudioContext || window.webkitAudioContext ? new (window.AudioContext || window.webkitAudioContext)() : null;

    function playTone(freq, type = "sine", duration = 0.15, gain = 0.1) {
        if (!audioCtx) return;
        try {
            if (audioCtx.state === "suspended") audioCtx.resume();
            const osc = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            g.gain.setValueAtTime(gain, audioCtx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
            osc.connect(g);
            g.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch (e) {
            // Ignore audio context errors
        }
    }

    function playWinFanfare() {
        if (!audioCtx) return;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            setTimeout(() => playTone(freq, "triangle", 0.35, 0.15), i * 120);
        });
    }

    function formatTime(totalSeconds) {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }

    function startTimer(initialSeconds = 0) {
        stopTimer();
        elapsedSeconds = initialSeconds;
        updateTimerDisplay();
        timerInterval = setInterval(() => {
            elapsedSeconds++;
            updateTimerDisplay();
        }, 1000);
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    function updateTimerDisplay() {
        const timerEl = document.getElementById("pq-hud-timer");
        if (timerEl) {
            timerEl.textContent = formatTime(elapsedSeconds);
        }
    }

    function updateMovesDisplay() {
        const movesEl = document.getElementById("pq-hud-moves");
        if (movesEl) {
            movesEl.textContent = movesCount;
        }
    }

    function startLevel(levelNum, initialSeconds = 0) {
        if (window.PuzzleQuestProgress && typeof window.PuzzleQuestProgress.isLevelUnlocked === "function") {
            if (!window.PuzzleQuestProgress.isLevelUnlocked(levelNum)) {
                console.warn(`Level ${levelNum} is locked. Complete Level ${levelNum - 1} first.`);
                if (window.PuzzleQuest && typeof window.PuzzleQuest.showScreen === "function") {
                    window.PuzzleQuest.showScreen("map");
                }
                return;
            }
        }

        if (typeof shellApi.cleanup === "function") {
            try { shellApi.cleanup(); } catch (e) {}
            shellApi.cleanup = null;
        }
        shellApi.onHintDismissed = null;
        shellApi.onReset = null;

        const puzzle = window.PUZZLE_CATALOG.find(p => p.level === levelNum);
        if (!puzzle) {
            console.error(`Puzzle level ${levelNum} not found in catalog.`);
            return;
        }

        currentPuzzle = puzzle;
        isCompleted = false;
        movesCount = 0;
        hintUsed = false;

        // Switch to Game Screen
        if (window.PuzzleQuest && typeof window.PuzzleQuest.showScreen === "function") {
            window.PuzzleQuest.showScreen("game");
        }

        // Update HUD
        const levelBadge = document.getElementById("pq-hud-level-badge");
        if (levelBadge) levelBadge.textContent = `LEVEL ${puzzle.level}`;

        const titleEl = document.getElementById("pq-hud-title");
        if (titleEl) titleEl.textContent = puzzle.title;

        const iconEl = document.getElementById("pq-hud-icon");
        if (iconEl) iconEl.textContent = puzzle.icon || "🧩";

        // Toggle Moves Counter
        const movesBox = document.getElementById("pq-hud-moves-stat");
        if (movesBox) {
            const showMovesEngines = new Set(["hanoi", "maze", "slidingBlock", "codeBreaker", "waterPouring", "rotatingTiles", "columnShuffle"]);
            movesBox.style.display = showMovesEngines.has(puzzle.engine) ? "flex" : "none";
        }

        // Instructions (hidden on levels with clear interfaces, or when empty)
        const instrStrip = document.getElementById("pq-instructions-strip");
        if (instrStrip) {
            const showInstructionLevels = new Set([2, 3, 7, 11, 17, 18, 25, 35, 41]);
            if (showInstructionLevels.has(puzzle.level) && puzzle.instructions) {
                instrStrip.style.display = "flex";
                const instrEl = document.getElementById("pq-instructions-text");
                if (instrEl) instrEl.textContent = puzzle.instructions;
            } else {
                instrStrip.style.display = "none";
            }
        }

        // Reference Asset Button (hidden on specific puzzles)
        const refBtn = document.getElementById("pq-hud-ref-btn");
        if (refBtn) {
            const hideRefLevels = new Set([38, 39, 43, 50]);
            if (puzzle.referenceAsset && !hideRefLevels.has(puzzle.level)) {
                refBtn.style.display = "inline-flex";
                refBtn.onclick = () => openReferenceModal(puzzle.referenceAsset, puzzle);
            } else {
                refBtn.style.display = "none";
            }
        }

        // Hint Button
        const hintBtn = document.getElementById("pq-hud-hint-btn");
        if (hintBtn) {
            hintBtn.onclick = () => openHintModal(puzzle);
        }

        // Reset Button (visible only on L2, L5, L11, L17, L24, L25, L30, L38)
        const resetBtn = document.getElementById("pq-hud-reset-btn");
        if (resetBtn) {
            const showResetLevels = new Set([2, 5, 11, 17, 24, 25, 30, 38]);
            if (showResetLevels.has(puzzle.level)) {
                resetBtn.style.display = "inline-flex";
                resetBtn.onclick = () => resetLevel();
            } else {
                resetBtn.style.display = "none";
            }
        }

        // Arena Container
        const arena = document.getElementById("pq-board-arena");
        if (!arena) return;
        arena.innerHTML = "";

        updateMovesDisplay();
        startTimer(initialSeconds);

        // Find engine
        const engine = window.PuzzleEngines && window.PuzzleEngines[puzzle.engine];
        if (engine && typeof engine.init === "function") {
            try {
                engine.init(arena, puzzle, shellApi);
            } catch (err) {
                console.error(`Error initializing engine '${puzzle.engine}':`, err);
                arena.innerHTML = `<div style="color:var(--crimson); text-align:center; padding:40px;">Error loading puzzle engine: ${err.message}</div>`;
            }
        } else {
            console.error(`Puzzle engine '${puzzle.engine}' not registered!`);
            arena.innerHTML = `<div style="color:var(--crimson); text-align:center; padding:40px;">Engine '${puzzle.engine}' not found.</div>`;
        }
    }

    const noTimerResetLevels = new Set([5, 17, 30, 38]);

    function resetLevel() {
        if (!currentPuzzle) return;
        playTone(300, "sine", 0.1);
        hintUsed = false;
        const preserveTimer = noTimerResetLevels.has(currentPuzzle.level);
        const savedTime = elapsedSeconds;

        if (typeof shellApi.onReset === "function") {
            try {
                shellApi.onReset();
                movesCount = 0;
                updateMovesDisplay();
                startTimer(preserveTimer ? savedTime : 0);
                return;
            } catch (err) {
                console.warn("onReset error, re-running startLevel:", err);
            }
        }
        if (typeof shellApi.cleanup === "function") {
            try { shellApi.cleanup(); } catch (e) {}
            shellApi.cleanup = null;
        }
        startLevel(currentPuzzle.level, preserveTimer ? savedTime : 0);
    }

    function incrementMoves(amount = 1) {
        movesCount += amount;
        updateMovesDisplay();
        playTone(580, "sine", 0.05, 0.05);
    }

    function calculateStars(puzzle, timeSec, moves, usedHint) {
        let stars = 3;
        const deductions = [];

        // Condition 1: Universal Hint Penalty (reduces 1 star)
        if (usedHint) {
            stars -= 1;
            deductions.push("Hint used (-1 ★)");
        }

        // Condition 2: Custom Performance Penalty
        const lvl = puzzle.level;
        if (lvl >= 1 && lvl <= 4) {
            if (timeSec > 60) {
                stars -= 1;
                deductions.push("Time exceeded 1 minute (-1 ★)");
            }
        } else if (lvl === 5) {
            if (moves > 8) {
                stars -= 1;
                deductions.push("Moves exceeded minimum of 8 (-1 ★)");
            }
        } else if (lvl === 6) {
            if (timeSec > 120) {
                stars -= 1;
                deductions.push("Time exceeded 2 minutes (-1 ★)");
            }
        } else if (lvl === 7) {
            if (moves > 7) {
                stars -= 1;
                deductions.push("Moves exceeded minimum of 7 (-1 ★)");
            }
            if (timeSec > 120) {
                stars -= 1;
                deductions.push("Time exceeded 2 minutes (-1 ★)");
            }
        } else if (lvl === 8) {
            if (timeSec > 150) {
                stars -= 1;
                deductions.push("Time exceeded 2:30 minutes (-1 ★)");
            }
        } else if (lvl === 9) {
            if (moves > 114) {
                stars -= 1;
                deductions.push("Moves exceeded minimum of 114 (-1 ★)");
            }
        } else if (lvl === 10 || lvl === 11 || lvl === 12 || lvl === 14 || lvl === 16) {
            if (timeSec > 180) {
                stars -= 1;
                deductions.push("Time exceeded 3 minutes (-1 ★)");
            }
        } else if (lvl === 13) {
            if (moves > 6) {
                stars -= 1;
                deductions.push("Moves exceeded minimum of 6 (-1 ★)");
            }
            if (timeSec > 180) {
                stars -= 1;
                deductions.push("Time exceeded 3 minutes (-1 ★)");
            }
        } else if (lvl === 15) {
            if (moves > 70) {
                stars -= 1;
                deductions.push("Moves exceeded 70 (-1 ★)");
            }
            if (timeSec > 180) {
                stars -= 1;
                deductions.push("Time exceeded 3 minutes (-1 ★)");
            }
        } else if (lvl === 17 || lvl === 18 || lvl === 19) {
            if (timeSec > 210) {
                stars -= 1;
                deductions.push("Time exceeded 3:30 minutes (-1 ★)");
            }
        } else if (lvl === 20 || lvl === 21) {
            if (timeSec > 240) {
                stars -= 1;
                deductions.push("Time exceeded 4 minutes (-1 ★)");
            }
        } else if (lvl === 22) {
            if (moves > 8) {
                stars -= 1;
                deductions.push("Moves exceeded 8 (-1 ★)");
            }
            if (timeSec > 240) {
                stars -= 1;
                deductions.push("Time exceeded 4 minutes (-1 ★)");
            }
        } else if (lvl === 23 || lvl === 24 || lvl === 25 || lvl === 27) {
            if (timeSec > 300) {
                stars -= 1;
                deductions.push("Time exceeded 5 minutes (-1 ★)");
            }
        } else if (lvl === 26) {
            if (moves > 280) {
                stars -= 1;
                deductions.push("Moves exceeded 280 (-1 ★)");
            }
            if (timeSec > 300) {
                stars -= 1;
                deductions.push("Time exceeded 5 minutes (-1 ★)");
            }
        } else if (lvl === 28 || lvl === 29) {
            if (timeSec > 360) {
                stars -= 1;
                deductions.push("Time exceeded 6 minutes (-1 ★)");
            }
        } else if (lvl === 30) {
            if (moves > 50) {
                stars -= 1;
                deductions.push("Moves exceeded 50 (-1 ★)");
            }
            if (timeSec > 360) {
                stars -= 1;
                deductions.push("Time exceeded 6 minutes (-1 ★)");
            }
        } else if (lvl === 31) {
            if (timeSec > 420) {
                stars -= 1;
                deductions.push("Time exceeded 7 minutes (-1 ★)");
            }
        } else if (lvl === 32) {
            if (timeSec > 450) {
                stars -= 1;
                deductions.push("Time exceeded 7:30 minutes (-1 ★)");
            }
        } else if (lvl === 33 || lvl === 34) {
            if (timeSec > 480) {
                stars -= 1;
                deductions.push("Time exceeded 8 minutes (-1 ★)");
            }
        } else if (lvl === 35) {
            if (timeSec > 540) {
                stars -= 1;
                deductions.push("Time exceeded 9 minutes (-1 ★)");
            }
        } else if (lvl === 36 || lvl === 37 || lvl === 38) {
            if (timeSec > 600) {
                stars -= 1;
                deductions.push("Time exceeded 10 minutes (-1 ★)");
            }
        } else if (lvl === 39) {
            if (timeSec > 630) {
                stars -= 1;
                deductions.push("Time exceeded 10:30 minutes (-1 ★)");
            }
        } else if (lvl === 40) {
            if (timeSec > 660) {
                stars -= 1;
                deductions.push("Time exceeded 11 minutes (-1 ★)");
            }
        } else if (lvl === 41) {
            if (timeSec > 780) {
                stars -= 1;
                deductions.push("Time exceeded 13 minutes (-1 ★)");
            }
        } else if (lvl === 42 || lvl === 43) {
            if (timeSec > 900) {
                stars -= 1;
                deductions.push("Time exceeded 15 minutes (-1 ★)");
            }
        } else if (lvl === 44) {
            if (timeSec > 1200) {
                stars -= 1;
                deductions.push("Time exceeded 20 minutes (-1 ★)");
            }
        } else if (lvl === 45 || lvl === 46) {
            if (timeSec > 1500) {
                stars -= 1;
                deductions.push("Time exceeded 25 minutes (-1 ★)");
            }
        } else if (lvl === 47) {
            if (timeSec > 2400) {
                stars -= 1;
                deductions.push("Time exceeded 40 minutes (-1 ★)");
            }
        } else if (lvl === 48) {
            if (timeSec > 3000) {
                stars -= 1;
                deductions.push("Time exceeded 50 minutes (-1 ★)");
            }
        } else if (lvl === 49) {
            if (timeSec > 3600) {
                stars -= 1;
                deductions.push("Time exceeded 60 minutes (-1 ★)");
            }
        } else if (lvl === 50) {
            if (timeSec > 3900) {
                stars -= 1;
                deductions.push("Time exceeded 65 minutes (-1 ★)");
            }
        } else {
            if (puzzle.config && puzzle.config.optimalMoves && moves > puzzle.config.optimalMoves * 2) {
                stars -= 1;
                deductions.push("Optimal moves exceeded (-1 ★)");
            } else if (timeSec > 180) {
                stars -= 1;
                deductions.push("Time exceeded 3 minutes (-1 ★)");
            }
        }

        // User always receives a minimum of 1 star upon solving
        const finalStars = Math.max(1, stars);
        return {
            stars: finalStars,
            deductions
        };
    }

    function completeLevel() {
        if (isCompleted || !currentPuzzle) return;
        isCompleted = true;
        stopTimer();
        playWinFanfare();

        // Calculate XP from authoritative level XP distribution
        const xpEarned = currentPuzzle.xp || (window.LEVEL_XP ? window.LEVEL_XP[currentPuzzle.level] : 50);

        // Calculate 3-star result
        const starResult = calculateStars(currentPuzzle, elapsedSeconds, movesCount, hintUsed);

        // Update progress
        if (window.PuzzleQuestProgress) {
            window.PuzzleQuestProgress.completeLevel(currentPuzzle.level, elapsedSeconds, movesCount, starResult.stars);
        }

        // Show Completion Modal
        showCompletionModal(currentPuzzle, elapsedSeconds, movesCount, xpEarned, starResult);
    }

    function failLevel(reason = "Constraint violated!", title = "Challenge Failed") {
        playTone(220, "sawtooth", 0.35, 0.2);
        showFailModal(reason, title);
    }

    function showCompletionModal(puzzle, timeSec, moves, xp, starResult = { stars: 3, deductions: [] }) {
        removeModals();

        const earnedStars = starResult.stars;
        let starsHtml = "";
        for (let i = 1; i <= 3; i++) {
            if (i <= earnedStars) {
                starsHtml += `<span style="color: var(--gold); text-shadow: 0 0 14px rgba(245, 197, 24, 0.65);">★</span> `;
            } else {
                starsHtml += `<span style="color: rgba(255, 255, 255, 0.2);">★</span> `;
            }
        }

        const backdrop = document.createElement("div");
        backdrop.className = "pq-modal-backdrop";
        backdrop.id = "pq-active-modal";

        backdrop.innerHTML = `
            <div class="pq-modal-card">
                <span class="pq-modal-icon">🏆</span>
                <span class="pq-modal-kicker">CHALLENGE CONQUERED</span>
                <h3 class="pq-modal-title">Level ${puzzle.level}: ${puzzle.title}</h3>

                <!-- Dynamic Stars -->
                <div style="font-size: 34px; margin: 12px 0 20px; letter-spacing: 6px;">
                    ${starsHtml}
                </div>

                <!-- Stats Strip -->
                <div class="pq-modal-stats">
                    <div class="pq-modal-stat-box">
                        <span class="label">TIME TAKEN</span>
                        <span class="val">${formatTime(timeSec)}</span>
                    </div>
                    <div class="pq-modal-stat-box">
                        <span class="label">MOVES</span>
                        <span class="val">${moves}</span>
                    </div>
                    <div class="pq-modal-stat-box">
                        <span class="label">XP EARNED</span>
                        <span class="val" style="color:var(--emerald);">+${xp}</span>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div style="display: flex; gap: 12px; justify-content: center; margin-top: 24px;">
                    <button id="pq-modal-map-btn" class="pq-btn pq-btn-secondary" type="button">LEVEL MAP</button>
                    ${puzzle.level < 50 ? `
                        <button id="pq-modal-next-btn" class="pq-btn pq-btn-gold" type="button">NEXT LEVEL ▶</button>
                    ` : `
                        <button id="pq-modal-next-btn" class="pq-btn pq-btn-gold" type="button">VICTORY SUMMARY 👑</button>
                    `}
                </div>
            </div>
        `;

        document.body.appendChild(backdrop);

        backdrop.querySelector("#pq-modal-map-btn").onclick = () => {
            removeModals();
            if (window.PuzzleQuest) window.PuzzleQuest.showScreen("map");
        };

        backdrop.querySelector("#pq-modal-next-btn").onclick = () => {
            removeModals();
            if (puzzle.level < 50) {
                startLevel(puzzle.level + 1);
            } else {
                if (window.PuzzleQuest) window.PuzzleQuest.showScreen("map");
            }
        };
    }

    function showFailModal(reason, title = "Challenge Failed") {
        removeModals();

        const backdrop = document.createElement("div");
        backdrop.className = "pq-modal-backdrop";
        backdrop.id = "pq-active-modal";

        backdrop.innerHTML = `
            <div class="pq-modal-card">
                <span class="pq-modal-icon">💥</span>
                <span class="pq-modal-kicker" style="color:var(--crimson);">CHALLENGE FAILED</span>
                <h3 class="pq-modal-title">${title}</h3>
                <p style="font-size: 14px; color: rgba(255,255,255,0.8); margin: 0 0 20px;">
                    ${reason}
                </p>

                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button id="pq-fail-retry-btn" class="pq-btn pq-btn-gold" type="button">TRY AGAIN ↺</button>
                    <button id="pq-fail-map-btn" class="pq-btn pq-btn-secondary" type="button">RETURN TO MAP</button>
                </div>
            </div>
        `;

        document.body.appendChild(backdrop);

        backdrop.querySelector("#pq-fail-retry-btn").onclick = () => {
            removeModals();
            resetLevel();
        };

        backdrop.querySelector("#pq-fail-map-btn").onclick = () => {
            removeModals();
            if (window.PuzzleQuest) window.PuzzleQuest.showScreen("map");
        };
    }

    function openReferenceModal(assetName, pz = currentPuzzle) {
        removeModals();

        const backdrop = document.createElement("div");
        backdrop.className = "pq-modal-backdrop";
        backdrop.id = "pq-active-modal";

        const isJigsawOrMosaic = pz && (
            pz.level === 23 ||
            pz.level === 32 ||
            pz.level === 45 ||
            pz.level === 48 ||
            pz.engine === "jigsaw" ||
            pz.engine === "triangleMosaic"
        );

        const headerTitle = isJigsawOrMosaic
            ? "HISTORICAL ARTIFACT REFERENCE"
            : `HISTORICAL ARTIFACT REFERENCE: ${assetName}`;

        backdrop.innerHTML = `
            <div class="pq-modal-card" style="max-width: 640px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <div style="font-size: 13px; font-weight: 800; color: var(--gold); letter-spacing: 1px;">
                        ${headerTitle}
                    </div>
                    <button id="pq-ref-close-btn" class="pq-hud-btn" style="padding: 4px 10px;">✕</button>
                </div>

                <div style="background: #000; border: 1px solid var(--panel-border); border-radius: 8px; overflow: hidden; max-height: 440px; display: flex; align-items: center; justify-content: center;">
                    <img src="puzzle-references/${assetName}" alt="Reference Asset" style="max-width: 100%; max-height: 420px; object-fit: contain;" />
                </div>

                <p style="font-size: 12px; color: rgba(255,255,255,0.7); margin: 12px 0 0;">
                    Consult this historical reference image to verify starting geometry, patterns, or symbol positions.
                </p>
            </div>
        `;

        document.body.appendChild(backdrop);

        backdrop.querySelector("#pq-ref-close-btn").onclick = removeModals;
        backdrop.onclick = (e) => {
            if (e.target === backdrop) removeModals();
        };
    }

    function openHintModal(puzzle) {
        removeModals();

        if (hintUsed) {
            const backdrop = document.createElement("div");
            backdrop.className = "pq-modal-backdrop";
            backdrop.id = "pq-active-modal";

            backdrop.innerHTML = `
                <div class="pq-modal-card">
                    <span class="pq-modal-icon">💡</span>
                    <span class="pq-modal-kicker">HINT STATUS</span>
                    <h3 class="pq-modal-title">Hint Already Used</h3>
                    <p style="font-size: 14px; color: rgba(255,255,255,0.85); line-height: 1.5; margin: 0 0 24px;">
                        Hint is already used on this level.
                    </p>

                    <button id="pq-hint-close-btn" class="pq-btn pq-btn-gold" type="button">GOT IT</button>
                </div>
            `;

            document.body.appendChild(backdrop);

            backdrop.querySelector("#pq-hint-close-btn").onclick = removeModals;
            backdrop.onclick = (e) => {
                if (e.target === backdrop) removeModals();
            };
            return;
        }

        hintUsed = true;

        const backdrop = document.createElement("div");
        backdrop.className = "pq-modal-backdrop";
        backdrop.id = "pq-active-modal";

        let hintText = puzzle.instructions;
        if (puzzle.config && puzzle.config.hint) {
            hintText = puzzle.config.hint;
        } else if (puzzle.config && puzzle.config.explanation) {
            hintText += ` Hint: ${puzzle.config.explanation}`;
        }

        backdrop.innerHTML = `
            <div class="pq-modal-card">
                <span class="pq-modal-icon">💡</span>
                <span class="pq-modal-kicker">SAGE ADVICE</span>
                <h3 class="pq-modal-title">Hint & Strategy</h3>
                <p style="font-size: 14px; color: rgba(255,255,255,0.85); line-height: 1.5; margin: 0 0 24px;">
                    ${hintText}
                </p>

                <button id="pq-hint-close-btn" class="pq-btn pq-btn-gold" type="button">GOT IT</button>
            </div>
        `;

        document.body.appendChild(backdrop);

        const dismissHint = () => {
            removeModals();
            if (typeof shellApi.onHintDismissed === "function") {
                try { shellApi.onHintDismissed(); } catch (e) { console.error(e); }
            }
        };

        backdrop.querySelector("#pq-hint-close-btn").onclick = dismissHint;
        backdrop.onclick = (e) => {
            if (e.target === backdrop) dismissHint();
        };
    }

    function removeModals() {
        const modal = document.getElementById("pq-active-modal");
        if (modal) modal.remove();
    }

    const shellApi = {
        startLevel,
        resetLevel,
        incrementMoves,
        setMoves: (count) => {
            movesCount = count;
            updateMovesDisplay();
        },
        getMoves: () => movesCount,
        getTime: () => elapsedSeconds,
        completeLevel,
        failLevel,
        openReferenceModal,
        openHintModal,
        playTone
    };

    return shellApi;
})();

