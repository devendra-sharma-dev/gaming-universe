/* =========================================================
   ESTIMATE IT — Game Engine
   Follows mystery-country.js patterns
   ========================================================= */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const API = `${window.GamingSession.apiOrigin}/api/v1`;
    const container = document.querySelector("#ei-content");
    const dateEl = document.querySelector("#ei-date");
    const totalXpEl = document.querySelector("#ei-total-xp");
    const playerEl = document.querySelector("#ei-player");

    let gameState = null;
    let timerInterval = null;
    let timerRemaining = 60;
    let currentBet = 100;
    let intermediateResult = null; // Holds the reveal data between rounds
    let gameStarted = false;

    /* ── Screen Red Boundary Alert (Under 10s) ─────────────── */

    const setScreenAlert = (active) => {
        const alertEl = document.querySelector("#ei-screen-alert");
        if (alertEl) {
            alertEl.classList.toggle("is-active", Boolean(active));
        }
    };

    /* ── In-Game Toast ────────────────────────────────────── */

    let toastTimeout = null;
    const showToast = (message, type = "error") => {
        let toast = document.querySelector("#ei-toast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "ei-toast";
            document.body.appendChild(toast);
        }
        toast.className = `ei-toast ${type === "info" ? "is-info" : ""}`;
        toast.textContent = message;
        toast.classList.add("is-visible");
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.remove("is-visible");
        }, 4000);
    };

    /* ── API wrapper with transparent network retries ─────── */

    const api = async (path, options = {}, retries = 2) => {
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const res = await window.GamingSession.fetch(`${API}${path}`, {
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    ...options
                });
                const body = await res.json().catch(() => ({}));
                if (!res.ok) {
                    const err = new Error(body.error?.message || "Estimate It is unavailable.");
                    err.status = res.status;
                    err.body = body;
                    throw err;
                }
                return body.data;
            } catch (err) {
                const isNetworkError = err instanceof TypeError || (err.message && err.message.toLowerCase().includes("fetch"));
                if (isNetworkError && attempt < retries) {
                    await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)));
                    continue;
                }
                throw err;
            }
        }
    };

    /* ── Format helpers ──────────────────────────────────── */

    const formatNumber = (num) => {
        if (num == null) return "—";
        return Number(num).toLocaleString();
    };

    const formatTime = (totalSeconds) => {
        const s = Math.max(0, Math.floor(totalSeconds));
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    };

    /* ── Timer ───────────────────────────────────────────── */

    const startTimer = () => {
        clearInterval(timerInterval);
        timerRemaining = gameState?.timerSeconds || 60;
        resumeTimer();
    };

    const resumeTimer = () => {
        clearInterval(timerInterval);
        updateTimerDisplay();

        timerInterval = setInterval(() => {
            timerRemaining--;
            updateTimerDisplay();

            if (timerRemaining <= 0) {
                clearInterval(timerInterval);
                setScreenAlert(false);
                handleTimeout();
            }
        }, 1000);
    };

    const stopTimer = () => {
        clearInterval(timerInterval);
        setScreenAlert(false);
    };

    const updateTimerDisplay = () => {
        const hud = document.querySelector("#ei-timer-hud");
        const countdown = document.querySelector("#ei-timer-countdown");
        const ringProgress = document.querySelector("#ei-timer-ring-progress");
        const meterFill = document.querySelector("#ei-timer-meter-fill");
        if (!countdown) return;

        countdown.textContent = formatTime(timerRemaining);

        const total = gameState?.timerSeconds || 60;
        const pct = Math.max(0, Math.min(100, (timerRemaining / total) * 100));

        if (meterFill) meterFill.style.width = `${pct}%`;

        if (ringProgress) {
            const circ = 113.1;
            const offset = circ * (1 - (timerRemaining / total));
            ringProgress.style.strokeDashoffset = offset;
        }

        const isUrgent = timerRemaining <= 10 && timerRemaining > 0;
        if (hud) hud.classList.toggle("is-urgent", isUrgent);
        setScreenAlert(isUrgent);
    };

    const handleTimeout = () => {
        const input = document.querySelector("#ei-estimate-input");
        const val = input ? input.value.trim() : "";
        submitEstimate(val || null);
    };

    /* ── Render Screens ──────────────────────────────────── */

    const render = () => {
        if (!gameState) return;

        // Update header info
        if (dateEl) dateEl.textContent = gameState.gameDate;
        if (totalXpEl) {
            totalXpEl.textContent = gameState.status === "completed"
                ? `${gameState.totalXp} XP EARNED`
                : `${gameState.totalXp} XP`;
        }

        // Screen routing:
        // 1. If intermediateResult exists → show reveal screen (including after Round 5)
        // 2. If completed → show final summary
        // 3. If game not yet started → show welcome briefing screen
        // 4. Otherwise → show round play screen

        if (intermediateResult) {
            renderReveal();
        } else if (gameState.status === "completed") {
            renderSummary();
        } else if (!gameStarted) {
            renderWelcome();
        } else {
            renderRoundPlay();
        }
    };

    /* ── Welcome / Briefing Screen ───────────────────────── */

    const renderWelcome = () => {
        stopTimer();
        const hasProgress = (gameState.completedRounds || []).length > 0;
        const buttonText = hasProgress
            ? `RESUME ROUND ${gameState.currentRound} ➔`
            : "START TODAY'S CHALLENGE ➔";

        container.innerHTML = `
            <div class="ei-welcome">
                <div class="ei-hero-banner">
                    <img class="ei-hero-img" src="./assets/estimate-it-hero.jpg" alt="Estimate It Championship" />
                    <div class="ei-hero-overlay">
                        <span class="ei-hero-tag">DAILY NUMERICAL ESTIMATION</span>
                        <h2 class="ei-hero-title">HOW CLOSE CAN YOU GET?</h2>
                    </div>
                </div>

                <p class="ei-welcome-lead">
                    Put your intuition to the test across <strong>5 daily numerical questions</strong>.
                    Formulate your best estimate, stake your chips wisely, and climb the ranks to earn massive XP!
                </p>

                <div class="ei-steps-grid">
                    <div class="ei-step-card">
                        <div class="ei-step-icon">🎯</div>
                        <div class="ei-step-num">STEP 01</div>
                        <h3>ESTIMATE</h3>
                        <p>Receive a real-world question. Input your closest numerical estimate before the 60s timer expires.</p>
                    </div>
                    <div class="ei-step-card">
                        <div class="ei-step-icon">🪙</div>
                        <div class="ei-step-num">STEP 02</div>
                        <h3>STAKE CHIPS</h3>
                        <p>You start with 1,000 chips. Bet between 100 and your remaining pool based on your confidence.</p>
                    </div>
                    <div class="ei-step-card">
                        <div class="ei-step-icon">🚀</div>
                        <div class="ei-step-num">STEP 03</div>
                        <h3>MULTIPLY & EARN</h3>
                        <p>Under 2% error awards 5× XP! Good estimates earn 2×–3×. In Round 5, all remaining chips are on the line.</p>
                    </div>
                </div>

                <div class="ei-tiers-strip">
                    <span class="ei-tiers-label">ACCURACY TIERS</span>
                    <div class="ei-tier-pills">
                        <span class="ei-tier-pill p-5x">🎯 &lt;2% Off <strong>5×</strong></span>
                        <span class="ei-tier-pill p-3x">🔥 2%–5% Off <strong>3×</strong></span>
                        <span class="ei-tier-pill p-2x">👍 5%–20% Off <strong>2×</strong></span>
                        <span class="ei-tier-pill p-1x">🙂 20%–50% Off <strong>1×</strong></span>
                        <span class="ei-tier-pill p-0x">💀 &gt;50% Off <strong>0×</strong></span>
                    </div>
                </div>

                <button id="ei-start-btn" class="ei-start-btn" type="button">
                    ${buttonText}
                </button>

                <div class="ei-welcome-meta">
                    <span>5 ROUNDS</span>
                    <span>•</span>
                    <span>60S TIMER</span>
                    <span>•</span>
                    <span>1,000 STARTING CHIPS</span>
                    <span>•</span>
                    <span>UP TO 500 XP</span>
                </div>
            </div>
        `;

        const startBtn = document.querySelector("#ei-start-btn");
        if (startBtn) {
            startBtn.addEventListener("click", () => {
                gameStarted = true;
                render();
            });
        }
    };

    /* ── Round Play Screen ───────────────────────────────── */

    const renderRoundPlay = () => {
        const q = gameState.question;
        const b = gameState.bet;
        if (!q || !b) return;

        const isFinal = b.isFinalRound;
        currentBet = isFinal ? b.finalBet : Math.max(b.min, Math.min(currentBet, b.max));
        currentBet = isFinal ? b.finalBet : (b.min || 100);

        container.innerHTML = `
            <div class="ei-roundbar">
                <div class="ei-roundbar-left">
                    <span class="ei-round-label">ROUND ${gameState.currentRound} / ${gameState.totalRounds}</span>
                    <h2 class="ei-round-title">${isFinal ? "🔥 FINAL ROUND" : `ROUND ${gameState.currentRound}`}</h2>
                </div>
                <div class="ei-chips-badge">
                    <span>🪙</span>
                    <span>${formatNumber(gameState.remainingChips)}</span>
                </div>
            </div>

            <!-- Gamified HUD Timer -->
            <div class="ei-timer-hud" id="ei-timer-hud">
                <div class="ei-timer-gauge">
                    <svg class="ei-timer-ring" viewBox="0 0 44 44">
                        <circle class="ei-timer-ring-bg" cx="22" cy="22" r="18" />
                        <circle class="ei-timer-ring-progress" id="ei-timer-ring-progress" cx="22" cy="22" r="18" />
                    </svg>
                    <span class="ei-timer-icon">⏱</span>
                </div>
                <div class="ei-timer-info">
                    <span class="ei-timer-tag">TIME REMAINING</span>
                    <div class="ei-timer-countdown" id="ei-timer-countdown">${formatTime(timerRemaining)}</div>
                </div>
                <div class="ei-timer-meter-wrap">
                    <div class="ei-timer-meter-track">
                        <div class="ei-timer-meter-fill" id="ei-timer-meter-fill" style="width:100%"></div>
                    </div>
                </div>
            </div>

            <div style="text-align:center">
                <span class="ei-category">${q.category || "General"}</span>
                <p class="ei-question">${q.text}</p>
            </div>

            <div class="ei-input-wrap">
                <label class="ei-input-label" for="ei-estimate-input">YOUR ESTIMATE</label>
                <input
                    id="ei-estimate-input"
                    class="ei-estimate-input"
                    type="text"
                    inputmode="decimal"
                    placeholder="Enter a number…"
                    autocomplete="off"
                    autofocus
                >
                ${q.unit ? `<div class="ei-unit-hint">Answer in: <strong>${q.unit}</strong></div>` : ""}
            </div>

            <div class="ei-bet-section">
                ${isFinal ? `
                    <div class="ei-final-bet">
                        <span class="ei-final-tag">ALL REMAINING CHIPS AT RISK</span>
                        <div class="ei-final-amount">🪙 ${formatNumber(b.finalBet)}</div>
                    </div>
                ` : `
                    <div class="ei-bet-header">
                        <span class="ei-bet-label">YOUR BET</span>
                        <span class="ei-bet-value" id="ei-bet-display">🪙 ${currentBet}</span>
                    </div>
                    <input
                        type="range"
                        class="ei-bet-slider"
                        id="ei-bet-slider"
                        min="${b.min}"
                        max="${b.max}"
                        step="50"
                        value="${currentBet}"
                    >
                    <div class="ei-bet-range">
                        <span>${b.min}</span>
                        <span>${b.max}</span>
                    </div>
                    <div class="ei-bet-remaining">
                        After this round: <strong id="ei-after-bet">🪙 ${formatNumber(gameState.remainingChips - currentBet)}</strong> remaining
                    </div>
                `}
            </div>

            <button id="ei-submit-btn" class="ei-submit" type="button">
                LOCK IN ESTIMATE
            </button>
        `;

        // Wire bet slider
        if (!isFinal) {
            const slider = document.querySelector("#ei-bet-slider");
            const display = document.querySelector("#ei-bet-display");
            const afterBet = document.querySelector("#ei-after-bet");

            slider.addEventListener("input", (e) => {
                currentBet = Number(e.target.value);
                display.textContent = `🪙 ${currentBet}`;
                afterBet.textContent = `🪙 ${formatNumber(gameState.remainingChips - currentBet)}`;
            });
        }

        // Wire submit button
        const submitBtn = document.querySelector("#ei-submit-btn");
        submitBtn.addEventListener("click", () => {
            const input = document.querySelector("#ei-estimate-input");
            submitEstimate(input ? input.value.trim() : null);
        });

        // Enter key to submit
        const input = document.querySelector("#ei-estimate-input");
        if (input) {
            input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    submitEstimate(input.value.trim());
                }
            });
            input.focus();
        }

        startTimer();
    };

    /* ── Intermediate Reveal Screen (XP Hidden until final screen) ── */

    const renderReveal = () => {
        stopTimer();
        const r = intermediateResult;
        if (!r) return;

        const isLastRound = gameState.status === "completed" || gameState.currentRound > gameState.totalRounds;
        const nextButtonText = isLastRound ? "VIEW FINAL RESULTS ➔" : `PLAY ROUND ${gameState.currentRound} ➔`;
        const accuracyPct = Math.max(0, 100 - r.percentageError).toFixed(1);

        container.innerHTML = `
            <div class="ei-reveal">
                <span class="game-kicker">ROUND ${gameState.completedRounds.length} RESULT</span>

                <div class="ei-reveal-row">
                    <span class="ei-reveal-label">YOUR ESTIMATE</span>
                    <div class="ei-reveal-estimate">
                        ${r.timedOut ? "⏱ Timed Out" : formatNumber(r.estimate)}
                    </div>
                </div>

                <div class="ei-reveal-row">
                    <span class="ei-reveal-label">ACTUAL ANSWER</span>
                    <div class="ei-reveal-answer">${formatNumber(r.actualAnswer)}</div>
                    <div class="ei-reveal-error">
                        ${r.timedOut ? "No estimate submitted" : `${r.percentageError}% off`}
                    </div>
                </div>

                <div class="ei-reveal-tier">
                    ${r.emoji} ${r.label}
                </div>

                <div class="ei-reveal-details">
                    <div class="ei-reveal-detail">
                        <small>YOUR BET</small>
                        <strong>🪙 ${r.bet}</strong>
                    </div>
                    <div class="ei-reveal-detail">
                        <small>ACCURACY</small>
                        <strong>${accuracyPct}%</strong>
                    </div>
                    <div class="ei-reveal-detail">
                        <small>MULTIPLIER</small>
                        <strong style="color:var(--color-cyan)">${r.multiplier}×</strong>
                    </div>
                </div>

                <div class="ei-reveal-chips">
                    Remaining Chips: <strong>🪙 ${formatNumber(gameState.remainingChips)}</strong>
                </div>

                <button id="ei-next-btn" class="ei-next" type="button">
                    ${nextButtonText}
                </button>
            </div>
        `;

        const nextBtn = document.querySelector("#ei-next-btn");
        nextBtn.addEventListener("click", () => {
            intermediateResult = null; // Clear reveal state
            render(); // Transition to next round or final summary
        });
    };

    /* ── Final Summary Screen ────────────────────────────── */

    const renderSummary = () => {
        stopTimer();
        const rounds = gameState.completedRounds || [];

        // Calculate stats
        // Per-round accuracy is clamped [0%, 100%] so a bad guess is 0% (not negative thousands %)
        const roundAccuracies = rounds.map(r => r.percentageError != null ? Math.max(0, 100 - r.percentageError) : 0);
        const overallAccuracyNum = roundAccuracies.length ? (roundAccuracies.reduce((a, b) => a + b, 0) / roundAccuracies.length) : 0;
        const overallAccuracy = roundAccuracies.length ? overallAccuracyNum.toFixed(1) + "%" : "—";

        const errors = rounds.map(r => r.percentageError).filter(e => e != null);
        const avgErrorNum = errors.length ? (errors.reduce((sum, e) => sum + e, 0) / errors.length) : 0;
        const avgError = errors.length ? avgErrorNum.toFixed(1) : "—";
        const bestError = errors.length ? Math.min(...errors).toFixed(1) : "—";
        const topHits = rounds.filter(r => r.multiplier >= 3).length;

        // Find best round label
        const bestRound = rounds.reduce((best, r) => {
            if (!best || (r.multiplier > best.multiplier)) return r;
            return best;
        }, null);

        // 5-Tier Funky Result Labels based on total XP earned (Max = 500 XP)
        const getFinalRank = (xp) => {
            if (xp >= 500) {
                return { title: "COSMIC ORACLE", emoji: "👑", theme: "rank-cosmic", desc: "Flawless 5/5 Bullseye Perfection!" };
            }
            if (xp >= 350) {
                return { title: "GIGA BRAIN", emoji: "🧠", theme: "rank-giga", desc: "God-tier instincts & massive payouts!" };
            }
            if (xp >= 200) {
                return { title: "SHARP SHOOTER", emoji: "⚡", theme: "rank-sharp", desc: "Lethal accuracy & calculated bets!" };
            }
            if (xp >= 75) {
                return { title: "BALLPARK BANDIT", emoji: "🎲", theme: "rank-bandit", desc: "Solid instincts, wild ride!" };
            }
            return { title: "POTATO BRAIN", emoji: "🥔", theme: "rank-potato", desc: "Calculated risks, questionable math!" };
        };

        const rank = getFinalRank(gameState.totalXp || 0);

        container.innerHTML = `
            <div class="ei-summary">
                <span class="ei-summary-kicker">ESTIMATE IT / DAILY RESULT</span>
                <h2>CHALLENGE COMPLETE</h2>

                <div class="ei-rank-badge ${rank.theme}">
                    <span class="ei-rank-emoji">${rank.emoji}</span>
                    <div class="ei-rank-text">
                        <strong class="ei-rank-title">${rank.title}</strong>
                        <small class="ei-rank-desc">${rank.desc}</small>
                    </div>
                </div>

                <div class="ei-summary-total">🎯 ${formatNumber(gameState.totalXp)} XP</div>
                <p style="color:rgba(255,255,255,.6);font-size:13px">${rounds.length} / ${gameState.totalRounds} ROUNDS COMPLETE</p>

                <div class="ei-summary-stats">
                    <div class="ei-summary-stat">
                        <small>BEST ESTIMATE</small>
                        <strong>${bestError}% off</strong>
                    </div>
                    <div class="ei-summary-stat">
                        <small>AVERAGE ERROR</small>
                        <strong>${avgError}%</strong>
                    </div>
                    <div class="ei-summary-stat">
                        <small>OVERALL ACCURACY</small>
                        <strong style="color:var(--color-cyan)">${overallAccuracy}</strong>
                    </div>
                    <div class="ei-summary-stat">
                        <small>TOP ESTIMATES</small>
                        <strong>${topHits} / ${rounds.length} 🔥</strong>
                    </div>
                </div>

                <div class="ei-summary-rounds">
                    ${rounds.map((r, i) => `
                        <div class="ei-summary-round">
                            <span>ROUND ${i + 1}</span>
                            <span style="color:${r.multiplier >= 3 ? "var(--color-cyan)" : r.multiplier >= 1 ? "#fff" : "#ff6b6b"}">
                                +${r.xpEarned} XP
                            </span>
                        </div>
                    `).join("")}
                </div>

                <p class="ei-comeback">Come back tomorrow for a new challenge.</p>
                <a href="./index.html" class="ei-home-link">BACK TO HOME</a>
            </div>
        `;
    };

    /* ── Submit Estimate ─────────────────────────────────── */

    const submitEstimate = async (estimateValue) => {
        const submitBtn = document.querySelector("#ei-submit-btn");
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "LOCKING IN…";
        }
        stopTimer();

        try {
            const data = await api("/estimate-it/daily/submit", {
                method: "POST",
                body: JSON.stringify({
                    estimate: estimateValue,
                    bet: currentBet
                })
            });

            // Store the reveal data and updated game state
            intermediateResult = data.roundResult;
            gameState = data;
            render();
        } catch (error) {
            // If the round was already registered on the server (e.g. from a previous submit or dropped response), recover gracefully
            if (error.status === 409 && error.message && error.message.includes("already been submitted")) {
                try {
                    const daily = await api("/estimate-it/daily");
                    gameState = daily;
                    const lastRound = daily.completedRounds?.[daily.completedRounds.length - 1];
                    if (lastRound) {
                        intermediateResult = {
                            estimate: lastRound.estimate,
                            actualAnswer: lastRound.actualAnswer,
                            bet: lastRound.bet,
                            percentageError: lastRound.percentageError,
                            multiplier: lastRound.multiplier,
                            xpEarned: lastRound.xpEarned,
                            label: lastRound.multiplier === 5 ? "BULLSEYE" : lastRound.multiplier === 3 ? "EXCELLENT" : lastRound.multiplier === 2 ? "GOOD GUESS" : lastRound.multiplier === 1 ? "IN THE BALLPARK" : "WAY OFF",
                            emoji: lastRound.multiplier === 5 ? "🎯" : lastRound.multiplier === 3 ? "🔥" : lastRound.multiplier === 2 ? "👍" : lastRound.multiplier === 1 ? "🙂" : "💀"
                        };
                    }
                    render();
                    return;
                } catch (_) { /* fallback to toast below */ }
            }

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "LOCK IN ESTIMATE";
            }
            // Resume the countdown timer from the exact remaining seconds — NEVER reset back to 60s
            if (timerRemaining > 0) resumeTimer();
            showToast(error.message || "Connection issue. Please try again.");
        }
    };

    /* ── Initialization ──────────────────────────────────── */

    const init = async () => {
        try {
            container.innerHTML = `<div style="text-align:center;padding:60px 0;color:rgba(255,255,255,.5)">Loading today’s challenge…</div>`;

            const [user, daily] = await Promise.all([
                api("/users/me"),
                api("/estimate-it/daily")
            ]);

            if (playerEl) playerEl.textContent = `@${(user.user || user).username}`;
            gameState = daily;

            render();
        } catch (error) {
            container.innerHTML = `
                <div class="ei-error">
                    <span class="game-kicker">CONNECTION ERROR</span>
                    <h2 style="margin:12px 0">COULD NOT LOAD GAME</h2>
                    <p>${error.message}</p>
                    <button class="ei-submit" style="margin-top:20px" onclick="location.reload()">TRY AGAIN</button>
                </div>
            `;
        }
    };

    init();
});
