"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const API_ORIGIN = window.GamingSession?.apiOrigin || "";
    const API_BASE = `${API_ORIGIN}/api/v1/mini-olympics`;

    // DOM Elements
    const playerNameEl = document.getElementById("mo-player-name");
    const screens = {
        landing: document.getElementById("screen-landing"),
        countrySelect: document.getElementById("screen-country-select"),
        eventIntro: document.getElementById("screen-event-intro"),
        gameplay: document.getElementById("screen-gameplay"),
        eventScoreboard: document.getElementById("screen-event-scoreboard"),
        cumulativeStandings: document.getElementById("screen-cumulative-standings"),
        finalCeremony: document.getElementById("screen-final-ceremony")
    };

    // Nav / Buttons
    const btnToCountrySelect = document.getElementById("btn-to-country-select");
    const countrySearchInput = document.getElementById("mo-country-search");
    const countriesGrid = document.getElementById("mo-countries-grid");
    const selectedBanner = document.getElementById("mo-selected-banner");
    const selectedFlagEl = document.getElementById("mo-selected-flag");
    const selectedNameEl = document.getElementById("mo-selected-name");
    const btnStartGames = document.getElementById("btn-start-games");

    const introBadge = document.getElementById("intro-event-badge");
    const introIcon = document.getElementById("intro-event-icon");
    const introTitle = document.getElementById("intro-event-title");
    const introFocus = document.getElementById("intro-event-focus");
    const introRules = document.getElementById("intro-event-rules");
    const introControls = document.getElementById("intro-event-controls");
    const btnBeginGameplay = document.getElementById("btn-begin-gameplay");

    // Gameplay HUD
    const hudFlag = document.getElementById("hud-flag");
    const hudCountryName = document.getElementById("hud-country-name");
    const hudEventName = document.getElementById("hud-event-name");
    const hudStat1Label = document.getElementById("hud-stat-1-label");
    const hudStat1Val = document.getElementById("hud-stat-1-val");
    const hudStat2Label = document.getElementById("hud-stat-2-label");
    const hudStat2Val = document.getElementById("hud-stat-2-val");
    const canvas = document.getElementById("mo-canvas");
    const ctx = canvas.getContext("2d");
    const canvasOverlay = document.getElementById("canvas-overlay");
    const arenaControls = document.getElementById("arena-controls");

    // Event Results Screen Elements
    const resMedalBadge = document.getElementById("res-medal-badge");
    const resRankText = document.getElementById("res-rank-text");
    const resFlag = document.getElementById("res-flag");
    const resCountryName = document.getElementById("res-country-name");
    const resScoreText = document.getElementById("res-score-text");
    const resFeedbackText = document.getElementById("res-feedback-text");
    const eventScoreboardBody = document.getElementById("event-scoreboard-body");
    const eventScoreboardTitle = document.getElementById("event-scoreboard-title");
    const eventMetricHeader = document.getElementById("event-metric-header");
    const thPerformance = document.getElementById("th-performance");
    const btnToCumulativeStandings = document.getElementById("btn-to-cumulative-standings");

    // Cumulative Standings Screen Elements
    const cumulativeStandingsTitle = document.getElementById("cumulative-standings-title");
    const eventStandingsBody = document.getElementById("event-standings-body");
    const playerStandingText = document.getElementById("player-standing-text");
    const btnBackToScoreboard = document.getElementById("btn-back-to-scoreboard");
    const btnNextEventAction = document.getElementById("btn-next-event-action");

    // Ceremony Elements
    const podiumGoldFlag = document.getElementById("podium-gold-flag");
    const podiumGoldName = document.getElementById("podium-gold-name");
    const podiumGoldMedals = document.getElementById("podium-gold-medals");
    const podiumSilverFlag = document.getElementById("podium-silver-flag");
    const podiumSilverName = document.getElementById("podium-silver-name");
    const podiumSilverMedals = document.getElementById("podium-silver-medals");
    const podiumBronzeFlag = document.getElementById("podium-bronze-flag");
    const podiumBronzeName = document.getElementById("podium-bronze-name");
    const podiumBronzeMedals = document.getElementById("podium-bronze-medals");
    const playerFinalSummary = document.getElementById("player-final-summary");
    const finalStandingsBody = document.getElementById("final-standings-body");
    const btnPlayAgain = document.getElementById("btn-play-again");

    // State Variables
    let allCountries = [];
    let selectedCountry = null;
    let competition = null;
    let currentEventId = null;
    let activeGameLoop = null;
    let activeKeyHandler = null;

    // Country Flag Image Helper (resolves Windows Regional Indicator letters into real country flags)
    const getFlagImgHtml = (code, fallbackEmoji = "", size = "small") => {
        const c = String(code || "").toLowerCase();
        let sizeClass = "mo-flag-img";
        let width = 24;
        let height = 16;
        let urlWidth = 40;
        if (size === "large") {
            sizeClass = "mo-flag-img mo-flag-img-lg";
            width = 36;
            height = 24;
            urlWidth = 80;
        } else if (size === "xl") {
            sizeClass = "mo-flag-img mo-flag-img-xl";
            width = 56;
            height = 38;
            urlWidth = 160;
        }
        if (!c) {
            return `<span class="mo-flag">${fallbackEmoji || ""}</span>`;
        }
        return `<img src="https://flagcdn.com/w${urlWidth}/${c}.png" class="${sizeClass}" width="${width}" height="${height}" alt="${code}" loading="lazy" onerror="this.replaceWith(document.createTextNode('${fallbackEmoji || ""}'))" />`;
    };

    // Check account session username if available
    window.GamingSession?.ready?.then(async () => {
        try {
            const resp = await window.GamingSession.fetch(`${API_ORIGIN}/api/v1/auth/me`);
            if (resp.ok) {
                const json = await resp.json();
                if (json.data?.user?.username && playerNameEl) {
                    playerNameEl.textContent = json.data.user.username.toUpperCase();
                }
            }
        } catch (_e) {}
    });

    // Switch Screen Utility
    const showScreen = (name) => {
        // Cleanup existing loops & listeners
        if (activeGameLoop) {
            cancelAnimationFrame(activeGameLoop);
            activeGameLoop = null;
        }
        if (activeKeyHandler) {
            window.removeEventListener("keydown", activeKeyHandler);
            activeKeyHandler = null;
        }
        canvasOverlay.innerHTML = "";
        arenaControls.innerHTML = "";

        Object.keys(screens).forEach((key) => {
            if (screens[key]) {
                screens[key].classList.toggle("active", key === name);
            }
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    // Show Feedback Toast inside Canvas
    const showToast = (text, color = "var(--cyan)") => {
        const toast = document.createElement("div");
        toast.className = "mo-feedback-toast";
        toast.style.color = color;
        toast.textContent = text;
        canvasOverlay.innerHTML = "";
        canvasOverlay.appendChild(toast);
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 1100);
    };

    // -------------------------------------------------------------
    // COUNTRY SELECTION SYSTEM
    // -------------------------------------------------------------
    const loadCountries = async () => {
        try {
            const res = await window.GamingSession.fetch(`${API_BASE}/countries`);
            const json = await res.json();
            if (json.success && Array.isArray(json.data.countries)) {
                allCountries = json.data.countries;
            }
        } catch (_e) {
            // Fallback countries list if network error
            allCountries = [
                { code: "US", name: "United States", flag: "🇺🇸" },
                { code: "CN", name: "China", flag: "🇨🇳" },
                { code: "IN", name: "India", flag: "🇮🇳" },
                { code: "AR", name: "Argentina", flag: "🇦🇷" },
                { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
                { code: "FR", name: "France", flag: "🇫🇷" },
                { code: "JP", name: "Japan", flag: "🇯🇵" },
                { code: "DE", name: "Germany", flag: "🇩🇪" },
                { code: "BR", name: "Brazil", flag: "🇧🇷" },
                { code: "AU", name: "Australia", flag: "🇦🇺" },
                { code: "CA", name: "Canada", flag: "🇨🇦" },
                { code: "IT", name: "Italy", flag: "🇮🇹" },
                { code: "ES", name: "Spain", flag: "🇪🇸" },
                { code: "KE", name: "Kenya", flag: "🇰🇪" },
                { code: "JM", name: "Jamaica", flag: "🇯🇲" },
                { code: "SE", name: "Sweden", flag: "🇸🇪" }
            ];
        }
        renderCountriesList(allCountries);
    };

    const renderCountriesList = (list) => {
        countriesGrid.innerHTML = "";
        list.forEach((country) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "mo-country-item";
            btn.dataset.code = country.code;
            if (selectedCountry && selectedCountry.code === country.code) {
                btn.classList.add("selected");
            }
            btn.innerHTML = `
                <span class="mo-country-flag">${getFlagImgHtml(country.code, country.flag)}</span>
                <span class="mo-country-name">${country.name}</span>
            `;
            btn.addEventListener("click", () => {
                selectCountry(country);
            });
            countriesGrid.appendChild(btn);
        });
    };

    const selectCountry = (country) => {
        selectedCountry = country;
        btnStartGames.disabled = false;
        btnStartGames.innerHTML = 'CONFIRM & ENTER ARENA <span>➔</span>';
        // Update selection UI
        document.querySelectorAll(".mo-country-item").forEach((el) => {
            if (el.dataset.code === country.code) {
                el.classList.add("selected");
            } else {
                el.classList.remove("selected");
            }
        });

        selectedFlagEl.innerHTML = getFlagImgHtml(country.code, country.flag);
        selectedNameEl.textContent = country.name;
        selectedBanner.hidden = false;
        selectedBanner.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };

    // Filter search
    countrySearchInput.addEventListener("input", (e) => {
        const query = e.target.value.trim().toLowerCase();
        if (!query) {
            renderCountriesList(allCountries);
            return;
        }
        const filtered = allCountries.filter(
            (c) => c.name.toLowerCase().includes(query) || c.code.toLowerCase().includes(query)
        );
        renderCountriesList(filtered);
    });

    btnToCountrySelect.addEventListener("click", () => {
        showScreen("countrySelect");
        if (allCountries.length === 0) loadCountries();
    });

    // Start Competition Button
    btnStartGames.addEventListener("click", async () => {
        if (!selectedCountry) return;
        btnStartGames.disabled = true;
        btnStartGames.textContent = "DRAWING 15 OPPONENTS...";

        try {
            const res = await window.GamingSession.fetch(`${API_BASE}/competition/start`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ countryCode: selectedCountry.code })
            });
            const json = await res.json();
            if (json.success) {
                competition = json.data;
                prepareEventIntro();
            } else {
                alert(json.error?.message || "Failed to start competition.");
            }
        } catch (_err) {
            alert("Could not reach competition server. Check backend connection.");
        } finally {
            btnStartGames.disabled = false;
            btnStartGames.textContent = "CONFIRM & ENTER ARENA ➔";
        }
    });

    // Country Profiles
    const COUNTRY_PROFILES = {
        IN: { archery: 86, sprint: 76, tableTennis: 82, weightlifting: 85, fencing: 77 },
        US: { archery: 82, sprint: 93, tableTennis: 75, weightlifting: 84, fencing: 86 },
        JP: { archery: 85, sprint: 81, tableTennis: 91, weightlifting: 78, fencing: 88 },
        FR: { archery: 82, sprint: 83, tableTennis: 81, weightlifting: 76, fencing: 93 },
        GB: { archery: 81, sprint: 87, tableTennis: 77, weightlifting: 79, fencing: 85 },
        CN: { archery: 88, sprint: 79, tableTennis: 96, weightlifting: 94, fencing: 82 },
        AU: { archery: 82, sprint: 85, tableTennis: 77, weightlifting: 78, fencing: 79 },
        DE: { archery: 84, sprint: 83, tableTennis: 89, weightlifting: 83, fencing: 86 },
        IT: { archery: 87, sprint: 85, tableTennis: 75, weightlifting: 81, fencing: 92 },
        BR: { archery: 79, sprint: 81, tableTennis: 85, weightlifting: 78, fencing: 76 },
        CA: { archery: 78, sprint: 86, tableTennis: 76, weightlifting: 81, fencing: 81 },
        KR: { archery: 96, sprint: 76, tableTennis: 88, weightlifting: 80, fencing: 87 },
        ES: { archery: 80, sprint: 81, tableTennis: 76, weightlifting: 80, fencing: 84 },
        NL: { archery: 83, sprint: 84, tableTennis: 75, weightlifting: 76, fencing: 82 },
        SE: { archery: 79, sprint: 79, tableTennis: 91, weightlifting: 79, fencing: 81 },
        NZ: { archery: 78, sprint: 80, tableTennis: 74, weightlifting: 80, fencing: 78 }
    };

    const getCountryProfile = (code) => {
        const upper = String(code || "").toUpperCase();
        if (COUNTRY_PROFILES[upper]) return { ...COUNTRY_PROFILES[upper] };
        let hash = 0;
        for (let i = 0; i < upper.length; i++) hash = (hash * 31 + upper.charCodeAt(i)) % 1000;
        const offset = (hash % 11) - 5;
        return {
            archery: Math.max(65, Math.min(88, 75 + offset)),
            sprint: Math.max(65, Math.min(88, 75 + ((hash * 3) % 11 - 5))),
            tableTennis: Math.max(65, Math.min(88, 75 + ((hash * 7) % 11 - 5))),
            weightlifting: Math.max(65, Math.min(88, 75 + ((hash * 13) % 11 - 5))),
            fencing: Math.max(65, Math.min(88, 75 + ((hash * 17) % 11 - 5)))
        };
    };

    // -------------------------------------------------------------
    // EVENT INTRO SCREEN SETUP
    // -------------------------------------------------------------
    const eventIntros = {
        archery: {
            badge: "EVENT 1 OF 5",
            icon: "🎯",
            title: "ARCHERY",
            focus: "Precision & Target Aiming",
            rules: `
                <p>• You have <strong>5 precision shots</strong> at the moving target.</p>
                <p>• Aim crosshair oscillates with crosswinds. Release your arrow when aligned with the bullseye.</p>
                <p>• <strong>Bullseye: 10 pts</strong> | Inner: 8 | Middle: 6 | Outer: 4 | Edge: 2 | Miss: 0</p>
                <p>• Maximum score is <strong>50 points</strong>. Accuracy determines medal rankings.</p>
            `,
            controls: [
                `<span class="mo-control-pill"><kbd>SPACE</kbd> or <kbd>CLICK / TAP</kbd> Release Arrow</span>`
            ]
        },
        sprint: {
            badge: "EVENT 2 OF 5",
            icon: "🏃",
            title: "100m SPRINT",
            focus: "Reaction Time & Rhythm Cadence",
            rules: `
                <p>• Listen for the starter signal: <strong>READY</strong> → <strong>SET</strong> → <strong>BANG!</strong></p>
                <p>• False starts add a time penalty! Wait for the green signal.</p>
                <p>• Keep a steady rhythm: tap when the cadence indicator enters the <strong>green sweet spot</strong>.</p>
                <p>• Button mashing stumbles your sprinter! Pure cadence rhythm delivers Olympic gold.</p>
            `,
            controls: [
                `<span class="mo-control-pill"><kbd>SPACE</kbd> or <kbd>CLICK / TAP</kbd> Stride Cadence &amp; Pace</span>`
            ]
        },
        tableTennis: {
            badge: "EVENT 3 OF 5",
            icon: "🏓",
            title: "TABLE TENNIS",
            focus: "Knockout Bracket Tournament",
            rules: `
                <p>• <strong>16-Nation Knockout Tournament:</strong> Round of 16 ➔ Quarter-Finals ➔ Semi-Finals ➔ Final &amp; Bronze Match!</p>
                <p>• <strong>First to 3 Points:</strong> Win 3 points in each match to advance toward Olympic medals.</p>
                <p>• Opponents become progressively tougher in every round (sharper drives &amp; higher consistency).</p>
                <p>• Strike in the glowing hit zone. Semi-final losers battle in the Bronze Medal Match for 3rd place!</p>
            `,
            controls: [
                `<span class="mo-control-pill"><kbd>SPACE</kbd> or <kbd>CLICK / TAP</kbd> Return Shot &amp; Swing Paddle</span>`
            ]
        },
        weightlifting: {
            badge: "EVENT 4 OF 5",
            icon: "🏋️",
            title: "WEIGHTLIFTING",
            focus: "Timing & Barbell Control",
            rules: `
                <p>• Compete across <strong>9 levels</strong> from <strong>140kg to 220kg</strong> (10kg increments).</p>
                <p>• You receive <strong>2 chances</strong> at each weight level. Clear on Chance 1 or Chance 2 to advance.</p>
                <p>• Lock in your hoist when the oscillating needle aligns within the green zone.</p>
                <p>• <strong>Tie-breaker Rule:</strong> When athletes reach the same weight, the athlete with <strong>fewer failed attempts</strong> ranks higher!</p>
            `,
            controls: [
                `<span class="mo-control-pill"><kbd>SPACE</kbd> or <kbd>CLICK / TAP</kbd> Lock Lift &amp; Hoist Barbell</span>`
            ]
        },
        fencing: {
            badge: "EVENT 5 OF 5",
            icon: "🤺",
            title: "FENCING",
            focus: "Decisions & Response Speed",
            rules: `
                <p>• Face off in <strong>10 tactical bouts</strong>. Watch opponent telegraph animation and react instantly:</p>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; margin: 10px 0;">
                    <div style="background: rgba(0, 200, 255, 0.08); border: 1px solid rgba(0, 200, 255, 0.35); border-radius: 8px; padding: 10px; text-align: left;">
                        <strong style="color: #67e8f9; display: block;">🤺 HIGH THRUST</strong>
                        <span style="font-size: 11px; color: #94a3b8; display: block; margin: 2px 0 5px;">Blade aimed high at head</span>
                        <span style="background: #0284c7; color: #fff; padding: 2px 8px; border-radius: 4px; font-weight: 800; font-size: 11px;">PRESS [W] ➔ HIGH PARRY</span>
                    </div>
                    <div style="background: rgba(0, 200, 255, 0.08); border: 1px solid rgba(0, 200, 255, 0.35); border-radius: 8px; padding: 10px; text-align: left;">
                        <strong style="color: #67e8f9; display: block;">🗡️ LOW LUNGE</strong>
                        <span style="font-size: 11px; color: #94a3b8; display: block; margin: 2px 0 5px;">Blade thrust low at body</span>
                        <span style="background: #0284c7; color: #fff; padding: 2px 8px; border-radius: 4px; font-weight: 800; font-size: 11px;">PRESS [S] ➔ LOW PARRY</span>
                    </div>
                    <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 8px; padding: 10px; text-align: left;">
                        <strong style="color: #fde047; display: block;">⚔️ SWEEP SLASH</strong>
                        <span style="font-size: 11px; color: #94a3b8; display: block; margin: 2px 0 5px;">Wide arcing blade strike</span>
                        <span style="background: #d97706; color: #fff; padding: 2px 8px; border-radius: 4px; font-weight: 800; font-size: 11px;">PRESS [A] ➔ DODGE BACK</span>
                    </div>
                    <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.35); border-radius: 8px; padding: 10px; text-align: left;">
                        <strong style="color: #6ee7b7; display: block;">🎯 EXPOSED OPENING</strong>
                        <span style="font-size: 11px; color: #94a3b8; display: block; margin: 2px 0 5px;">Opponent guard dropped</span>
                        <span style="background: #059669; color: #fff; padding: 2px 8px; border-radius: 4px; font-weight: 800; font-size: 11px;">PRESS [D] ➔ RIPOSTE ATTACK</span>
                    </div>
                </div>
                <p>• Fast reaction before time runs out secures Olympic points!</p>
            `,
            controls: [
                `<span class="mo-control-pill"><kbd>W</kbd> High Parry (vs 🤺 High Thrust)</span>`,
                `<span class="mo-control-pill"><kbd>S</kbd> Low Parry (vs 🗡️ Low Lunge)</span>`,
                `<span class="mo-control-pill"><kbd>A</kbd> Dodge (vs ⚔️ Sweep Slash)</span>`,
                `<span class="mo-control-pill"><kbd>D</kbd> Riposte (vs 🎯 Exposed Opening)</span>`
            ]
        }
    };

    const prepareEventIntro = () => {
        const currentEvent = competition.events[competition.currentEventIndex];
        currentEventId = currentEvent.id;
        const info = eventIntros[currentEventId];

        introBadge.textContent = info.badge;
        introIcon.textContent = info.icon;
        introTitle.textContent = info.title;
        introFocus.textContent = info.focus;
        introRules.innerHTML = info.rules;
        introControls.innerHTML = info.controls.join("");

        showScreen("eventIntro");
    };

    btnBeginGameplay.addEventListener("click", () => {
        launchGameplay(currentEventId);
    });

    // -------------------------------------------------------------
    // GAMEPLAY ROUTER & ARENA INITIALIZER
    // -------------------------------------------------------------
    const launchGameplay = (eventId) => {
        showScreen("gameplay");

        // Set HUD
        hudFlag.innerHTML = getFlagImgHtml(competition.playerCountry.code, competition.playerCountry.flag);
        hudCountryName.textContent = competition.playerCountry.name;
        hudEventName.textContent = `EVENT ${competition.currentEventIndex + 1} / 5: ${eventId.toUpperCase()}`;

        // Resize Canvas cleanly
        const rect = canvas.getBoundingClientRect();
        canvas.width = Math.min(800, window.innerWidth - 48);
        canvas.height = 440;

        switch (eventId) {
            case "archery":
                playArchery();
                break;
            case "sprint":
                playSprint();
                break;
            case "tableTennis":
                playTableTennis();
                break;
            case "weightlifting":
                playWeightlifting();
                break;
            case "fencing":
                playFencing();
                break;
        }
    };

    // -------------------------------------------------------------
    // MINI-GAME 1: ARCHERY (Precision & Accuracy)
    // -------------------------------------------------------------
    const playArchery = () => {
        hudStat1Label.textContent = "SHOTS";
        hudStat1Val.textContent = "0 / 5";
        hudStat2Label.textContent = "POINTS";
        hudStat2Val.textContent = "0 / 50";

        let shotsTaken = 0;
        let totalScore = 0;
        const maxShots = 5;
        let isAiming = true;
        let arrowFlying = false;
        let arrowProgress = 0;
        let arrowTargetX = 0;
        let arrowTargetY = 0;
        const hits = [];

        // Target geometry (center of right side)
        const targetX = canvas.width * 0.72;
        const targetY = canvas.height * 0.5;
        const rings = [
            { r: 18, pts: 10, color: "#ffd700", label: "BULLSEYE" },
            { r: 40, pts: 8, color: "#ff3d57", label: "INNER RING" },
            { r: 68, pts: 6, color: "#00c8ff", label: "MIDDLE RING" },
            { r: 96, pts: 4, color: "#1e293b", label: "OUTER RING" },
            { r: 122, pts: 2, color: "#ffffff", label: "TARGET EDGE" }
        ];

        // Aim crosshair motion
        let time = 0;
        let crosshairX = targetX;
        let crosshairY = targetY;

        // UI button for touch
        const fireBtn = document.createElement("button");
        fireBtn.className = "mo-btn mo-btn-gold mo-action-large";
        fireBtn.textContent = "RELEASE ARROW 🏹";
        arenaControls.appendChild(fireBtn);

        const shoot = () => {
            if (!isAiming || arrowFlying || shotsTaken >= maxShots) return;
            isAiming = false;
            arrowFlying = true;
            arrowProgress = 0;
            arrowTargetX = crosshairX;
            arrowTargetY = crosshairY;
        };

        fireBtn.addEventListener("click", shoot);
        canvas.addEventListener("click", shoot);
        activeKeyHandler = (e) => {
            if (e.code === "Space") {
                e.preventDefault();
                shoot();
            }
        };
        window.addEventListener("keydown", activeKeyHandler);

        const render = () => {
            time += 0.035;

            // Oscillating crosshair
            if (isAiming) {
                const waveX = Math.sin(time * 2.2) * 75 + Math.cos(time * 1.1) * 35;
                const waveY = Math.cos(time * 1.8) * 60 + Math.sin(time * 0.9) * 25;
                crosshairX = targetX + waveX;
                crosshairY = targetY + waveY;
            }

            // Draw Background
            ctx.fillStyle = "#030c1b";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Archery Range Backdrop Grid / Grass
            ctx.strokeStyle = "rgba(0, 200, 255, 0.06)";
            ctx.lineWidth = 1;
            for (let x = 0; x < canvas.width; x += 40) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }

            // Target Stand Legs
            ctx.strokeStyle = "#475569";
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(targetX, targetY);
            ctx.lineTo(targetX - 35, targetY + 160);
            ctx.moveTo(targetX, targetY);
            ctx.lineTo(targetX + 35, targetY + 160);
            ctx.stroke();

            // Draw Target Rings from outside in
            for (let i = rings.length - 1; i >= 0; i--) {
                const ring = rings[i];
                ctx.beginPath();
                ctx.arc(targetX, targetY, ring.r, 0, Math.PI * 2);
                ctx.fillStyle = ring.color;
                ctx.fill();
                ctx.strokeStyle = "#0f172a";
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // Draw Target Center Dot
            ctx.beginPath();
            ctx.arc(targetX, targetY, 4, 0, Math.PI * 2);
            ctx.fillStyle = "#000000";
            ctx.fill();

            // Render Previous Sticking Arrows
            hits.forEach((hit) => {
                ctx.save();
                ctx.fillStyle = "#ffffff";
                ctx.beginPath();
                ctx.arc(hit.x, hit.y, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = "#e2e8f0";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(hit.x, hit.y);
                ctx.lineTo(hit.x - 22, hit.y + 16);
                ctx.stroke();
                // Fletching
                ctx.fillStyle = "var(--gold)";
                ctx.fillRect(hit.x - 24, hit.y + 14, 6, 6);
                ctx.restore();
            });

            // Flying Arrow Animation
            if (arrowFlying) {
                arrowProgress += 0.08;
                const startX = 60;
                const startY = canvas.height * 0.7;
                const curX = startX + (arrowTargetX - startX) * arrowProgress;
                const curY = startY + (arrowTargetY - startY) * arrowProgress - Math.sin(arrowProgress * Math.PI) * 40;

                ctx.save();
                ctx.strokeStyle = "#f8fafc";
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(curX - 25, curY + 12);
                ctx.lineTo(curX, curY);
                ctx.stroke();
                ctx.restore();

                if (arrowProgress >= 1) {
                    arrowFlying = false;
                    shotsTaken++;
                    hits.push({ x: arrowTargetX, y: arrowTargetY });

                    // Calculate distance to bullseye
                    const dist = Math.hypot(arrowTargetX - targetX, arrowTargetY - targetY);
                    let awardedPts = 0;
                    let label = "MISS";
                    let color = "#ff3d57";

                    for (const ring of rings) {
                        if (dist <= ring.r) {
                            awardedPts = ring.pts;
                            label = ring.label;
                            color = ring.pts >= 8 ? "var(--gold)" : "var(--cyan)";
                            break;
                        }
                    }

                    totalScore += awardedPts;
                    hudStat1Val.textContent = `${shotsTaken} / ${maxShots}`;
                    hudStat2Val.textContent = `${totalScore} / 50`;
                    showToast(`${label} +${awardedPts}`, color);

                    if (shotsTaken < maxShots) {
                        setTimeout(() => {
                            isAiming = true;
                        }, 500);
                    } else {
                        // Finished
                        setTimeout(() => {
                            finishEvent("archery", { rawScore: totalScore });
                        }, 1200);
                    }
                }
            }

            // Draw Bow & Archer silhouette on the left
            ctx.save();
            ctx.strokeStyle = "rgba(0, 200, 255, 0.6)";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(60, canvas.height * 0.65, 50, -Math.PI * 0.35, Math.PI * 0.35);
            ctx.stroke();
            ctx.restore();

            // Draw Crosshair Sight
            if (isAiming) {
                ctx.save();
                ctx.strokeStyle = "var(--cyan)";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(crosshairX, crosshairY, 18, 0, Math.PI * 2);
                ctx.moveTo(crosshairX - 26, crosshairY);
                ctx.lineTo(crosshairX + 26, crosshairY);
                ctx.moveTo(crosshairX, crosshairY - 26);
                ctx.lineTo(crosshairX, crosshairY + 26);
                ctx.stroke();

                // Glowing center pip
                ctx.fillStyle = "var(--gold)";
                ctx.beginPath();
                ctx.arc(crosshairX, crosshairY, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            activeGameLoop = requestAnimationFrame(render);
        };

        render();
    };

    // -------------------------------------------------------------
    // MINI-GAME 2: 100M SPRINT (Reaction & Rhythm)
    // -------------------------------------------------------------
    const playSprint = () => {
        hudStat1Label.textContent = "DISTANCE";
        hudStat1Val.textContent = "0 m / 100 m";
        hudStat2Label.textContent = "TIME";
        hudStat2Val.textContent = "0.00 s";

        let raceState = "WAIT_READY"; // WAIT_READY -> SET -> GO -> RACING -> FINISHED
        let falseStart = false;
        let distance = 0;
        let speed = 0;
        let startTime = 0;
        let elapsed = 0;
        let strideCounts = 0;
        let perfectStrides = 0;

        // Rhythm indicator (-1 to 1)
        let rhythmPos = 0;
        let rhythmDir = 1;
        const rhythmSpeed = 0.055;

        // Stride button
        const strideBtn = document.createElement("button");
        strideBtn.className = "mo-btn mo-btn-gold mo-action-large";
        strideBtn.textContent = "WAIT FOR SIGNAL...";
        strideBtn.disabled = true;
        arenaControls.appendChild(strideBtn);

        // Sequence Countdown
        setTimeout(() => {
            raceState = "READY";
            showToast("ON YOUR MARKS!", "var(--silver)");
            setTimeout(() => {
                raceState = "SET";
                showToast("SET...", "var(--gold)");
                const delay = 1000 + Math.random() * 1200;
                setTimeout(() => {
                    if (raceState === "SET") {
                        raceState = "RACING";
                        startTime = performance.now();
                        showToast("BANG! GO!! 🔫", "var(--emerald)");
                        strideBtn.disabled = false;
                        strideBtn.textContent = "STRIDE 🏃";
                    }
                }, delay);
            }, 1200);
        }, 800);

        const handleStride = () => {
            if (raceState === "SET" || raceState === "READY") {
                // False start!
                falseStart = true;
                showToast("FALSE START! +1.5s PENALTY", "var(--crimson)");
                return;
            }
            if (raceState !== "RACING") return;

            strideCounts++;
            const accuracy = 1 - Math.abs(rhythmPos); // 1 = perfect center

            if (accuracy >= 0.75) {
                perfectStrides++;
                speed = Math.min(1.4, speed + 0.18);
                showToast("PERFECT STRIDE! ⚡", "var(--gold)");
            } else if (accuracy >= 0.45) {
                speed = Math.min(1.2, speed + 0.1);
                showToast("GOOD PACE", "var(--cyan)");
            } else {
                speed = Math.max(0.3, speed - 0.12);
                showToast("OFF BEAT ⚠️", "var(--crimson)");
            }
        };

        strideBtn.addEventListener("click", handleStride);
        canvas.addEventListener("click", handleStride);
        activeKeyHandler = (e) => {
            if (e.code === "Space") {
                e.preventDefault();
                handleStride();
            }
        };
        window.addEventListener("keydown", activeKeyHandler);

        // Pre-simulate sprint finish times for all 15 opponents based on rating
        const sprintOpponents = competition.opponents.map((opp) => {
            const profile = getCountryProfile(opp.code);
            const rating = profile.sprint || 75;
            const delta = (Math.random() + Math.random() + Math.random() - 1.5) * 4.2;
            const simScore = Math.max(45, Math.min(98, Math.round(rating + delta)));
            const sec = 14.50 - ((simScore - 20) / 80) * 5.0;
            const finishTime = Number(Math.max(9.50, Math.min(14.50, sec)).toFixed(2));
            return {
                code: opp.code,
                name: opp.name,
                flag: opp.flag,
                normalizedScore: simScore,
                rawScore: finishTime,
                finishTime,
                metricDisplay: `${finishTime.toFixed(2)} s`,
                isPlayer: false
            };
        });
        sprintOpponents.sort((a, b) => a.finishTime - b.finishTime);
        const topOpp1 = sprintOpponents[0]; // Fastest rival on Lane 1
        const topOpp2 = sprintOpponents[1]; // 2nd Fastest rival on Lane 3

        let oppDist1 = 0;
        let oppDist2 = 0;

        const render = () => {
            // Update Rhythm
            rhythmPos += rhythmDir * rhythmSpeed;
            if (rhythmPos > 1) { rhythmPos = 1; rhythmDir = -1; }
            if (rhythmPos < -1) { rhythmPos = -1; rhythmDir = 1; }

            // Update Race Physics
            if (raceState === "RACING") {
                speed = Math.max(0.2, speed * 0.985); // Natural friction decay
                distance += speed * 0.55;
                elapsed = (performance.now() - startTime) / 1000 + (falseStart ? 1.5 : 0);

                // Top 2 opponents pace according to their projected finish times:
                oppDist1 = Math.min(100, (elapsed / topOpp1.finishTime) * 100);
                oppDist2 = Math.min(100, (elapsed / topOpp2.finishTime) * 100);

                hudStat1Val.textContent = `${Math.min(100, Math.round(distance))} m / 100 m`;
                hudStat2Val.textContent = `${elapsed.toFixed(2)} s`;

                if (distance >= 100) {
                    raceState = "FINISHED";
                    strideBtn.disabled = true;
                    strideBtn.textContent = "FINISHED!";
                    showToast(`FINISH: ${elapsed.toFixed(2)}s! 🏁`, "#ffd700");

                    const rhythmAcc = strideCounts > 0 ? Math.round((perfectStrides / strideCounts) * 100) : 50;
                    setTimeout(() => {
                        finishEvent("sprint", {
                            finishTime: Number(elapsed.toFixed(2)),
                            rhythmAccuracy: rhythmAcc,
                            rawScore: Number(elapsed.toFixed(2))
                        }, sprintOpponents);
                    }, 1400);
                }
            }

            // Draw Track
            ctx.fillStyle = "#1e130b"; // Track tartan red/orange
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Red Tartan Lanes
            ctx.fillStyle = "#a83232";
            ctx.fillRect(0, 60, canvas.width, 240);

            // Lane Dividers
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 3;
            for (let i = 0; i <= 3; i++) {
                ctx.beginPath();
                ctx.moveTo(0, 60 + i * 80);
                ctx.lineTo(canvas.width, 60 + i * 80);
                ctx.stroke();
            }

            // Track Distance markers passing by
            const trackOffset = (distance * 25) % 100;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
            ctx.lineWidth = 2;
            for (let x = -trackOffset; x < canvas.width; x += 100) {
                ctx.beginPath();
                ctx.moveTo(x, 60);
                ctx.lineTo(x, 300);
                ctx.stroke();
            }

            // Finish Line Ribbon (rushes from right towards runner as distance approaches 100)
            if (distance >= 75) {
                const finishX = 140 + (100 - distance) * 24;
                if (finishX <= canvas.width + 30 && finishX >= -50) {
                    ctx.save();
                    // Glow backdrop
                    ctx.strokeStyle = "rgba(0, 230, 118, 0.4)";
                    ctx.lineWidth = 12;
                    ctx.beginPath();
                    ctx.moveTo(finishX, 60);
                    ctx.lineTo(finishX, 300);
                    ctx.stroke();

                    // Solid Green Finish Line
                    ctx.strokeStyle = "#00e676";
                    ctx.lineWidth = 5;
                    ctx.beginPath();
                    ctx.moveTo(finishX, 60);
                    ctx.lineTo(finishX, 300);
                    ctx.stroke();

                    // White Checkered Hash Marks
                    ctx.strokeStyle = "#ffffff";
                    ctx.lineWidth = 5;
                    ctx.setLineDash([8, 8]);
                    ctx.beginPath();
                    ctx.moveTo(finishX, 60);
                    ctx.lineTo(finishX, 300);
                    ctx.stroke();

                    // "FINISH" Marker Flag
                    ctx.fillStyle = "#00e676";
                    ctx.font = "bold 11px sans-serif";
                    ctx.textAlign = "center";
                    ctx.fillText("FINISH 🏁", finishX, 52);
                    ctx.restore();
                }
            }

            // Draw Runners (Lane 1: Opponent 1, Lane 2: Player, Lane 3: Opponent 2)
            const drawRunner = (x, y, jerseyColor, isPlayer = false, flag = "", countryName = "") => {
                ctx.save();

                // 1. Head (Realistic skin tone with clear outline)
                const skinColor = isPlayer ? "#fed7aa" : "#e2e8f0";
                ctx.fillStyle = skinColor;
                ctx.beginPath();
                ctx.arc(x, y - 20, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = "#0f172a";
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // Headband
                ctx.fillStyle = isPlayer ? "#00c8ff" : "#f59e0b";
                ctx.fillRect(x - 9, y - 26, 18, 4);

                // 2. Torso / Athletic Singlet
                ctx.fillStyle = jerseyColor;
                ctx.beginPath();
                ctx.roundRect(x - 8, y - 9, 16, 22, 3);
                ctx.fill();
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 1;
                ctx.stroke();

                // 3. Cadence-animated Pumping Arms
                const armSwing = Math.sin(performance.now() * 0.02 * (speed + 0.6)) * 14;
                ctx.strokeStyle = skinColor;
                ctx.lineWidth = 3.5;
                ctx.lineCap = "round";
                // Left arm
                ctx.beginPath();
                ctx.moveTo(x - 6, y - 4);
                ctx.lineTo(x + armSwing, y + 5);
                ctx.stroke();
                // Right arm
                ctx.beginPath();
                ctx.moveTo(x + 6, y - 4);
                ctx.lineTo(x - armSwing, y + 5);
                ctx.stroke();

                // 4. Running Shorts & Legs
                const legSwing = Math.sin(performance.now() * 0.02 * (speed + 0.6)) * 16;
                ctx.fillStyle = isPlayer ? "#0284c7" : "#334155";
                ctx.fillRect(x - 7, y + 13, 14, 8);

                ctx.strokeStyle = skinColor;
                ctx.lineWidth = 4;
                // Front leg
                ctx.beginPath();
                ctx.moveTo(x - 3, y + 20);
                ctx.lineTo(x + legSwing, y + 33);
                ctx.stroke();
                // Back leg
                ctx.beginPath();
                ctx.moveTo(x + 3, y + 20);
                ctx.lineTo(x - legSwing, y + 33);
                ctx.stroke();

                // Sprint Spikes / Shoes
                ctx.fillStyle = "#ffd700";
                ctx.fillRect(x + legSwing - 4, y + 32, 8, 3);
                ctx.fillRect(x - legSwing - 4, y + 32, 8, 3);

                // Flag & Name Banner above runner
                ctx.fillStyle = isPlayer ? "#38bdf8" : "#cbd5e1";
                ctx.font = isPlayer ? "bold 12px sans-serif" : "600 11px sans-serif";
                ctx.textAlign = "center";
                const label = isPlayer ? `${flag} ${countryName} (YOU)` : `${flag} ${countryName}`;
                ctx.fillText(label, x, y - 36);

                ctx.restore();
            };

            const playerX = 140;
            // Relative position strictly determined by time/distance difference
            const oppX1 = 140 + (oppDist1 - distance) * 7.5;
            const oppX2 = 140 + (oppDist2 - distance) * 7.5;

            drawRunner(oppX1, 100, "#475569", false, topOpp1.flag, topOpp1.name);
            drawRunner(playerX, 180, "#00c8ff", true, competition.playerCountry.flag, competition.playerCountry.name);
            drawRunner(oppX2, 260, "#334155", false, topOpp2.flag, topOpp2.name);

            // Draw Rhythm Cadence Bar at the bottom
            const barW = Math.min(340, canvas.width - 60);
            const barH = 26;
            const barX = (canvas.width - barW) / 2;
            const barY = 360;

            // Bar background
            ctx.fillStyle = "rgba(4, 18, 36, 0.85)";
            ctx.strokeStyle = "rgba(0, 200, 255, 0.3)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(barX, barY, barW, barH, 6);
            ctx.fill();
            ctx.stroke();

            // Center Sweet Spot (Green)
            const sweetSpotW = 54;
            ctx.fillStyle = "rgba(0, 230, 118, 0.4)";
            ctx.fillRect(barX + (barW - sweetSpotW) / 2, barY + 2, sweetSpotW, barH - 4);

            // Moving Rhythm Indicator (Yellow Pill)
            const indicatorX = barX + barW / 2 + (rhythmPos * (barW / 2 - 14));
            ctx.fillStyle = "#ffd700";
            ctx.beginPath();
            ctx.roundRect(indicatorX - 6, barY + 2, 12, barH - 4, 4);
            ctx.fill();

            // Label
            ctx.fillStyle = "#94a3b8";
            ctx.font = "11px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("TAP ON GREEN SWEET SPOT FOR CADENCE", canvas.width / 2, barY + 44);

            activeGameLoop = requestAnimationFrame(render);
        };

        render();
    };

    // -------------------------------------------------------------
    // MINI-GAME 3: TABLE TENNIS (16-Nation Knockout Tournament)
    // -------------------------------------------------------------
    const playTableTennis = () => {
        const getRating = (code) => {
            const p = getCountryProfile(code);
            return (p && p.tableTennis) ? p.tableTennis : 75;
        };

        // Simulates an AI vs AI match weighted probabilistically by rating
        const simulateAIMatch = (teamA, teamB) => {
            const rA = getRating(teamA.code);
            const rB = getRating(teamB.code);
            const probA = 1 / (1 + Math.pow(10, (rB - rA) / 26));
            return Math.random() < probA
                ? { winner: teamA, loser: teamB }
                : { winner: teamB, loser: teamA };
        };

        const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

        // Sort all 15 opponents by TT rating
        const sortedOpps = [...competition.opponents].sort((a, b) => getRating(b.code) - getRating(a.code));

        // Draw Player's R16 opponent randomly from lower/mid seeds (index 8 to 14) so it's not always New Zealand
        const lowerSeeds = sortedOpps.slice(8);
        const oppR16 = lowerSeeds[Math.floor(Math.random() * lowerSeeds.length)];

        // Remaining 14 opponents distributed across tournament bracket
        const remaining = sortedOpps.filter((o) => o.code !== oppR16.code);
        const top4 = shuffle(remaining.slice(0, 4));
        const mids = shuffle(remaining.slice(4, 9));
        const rest = shuffle(remaining.slice(9));

        // Upper Half - Quarter 1: Match 2 (winner faces Player in QF if Player wins R16)
        const m2 = simulateAIMatch(top4[0], mids[0]);
        const oppQF = m2.winner;
        const r16Loser_m2 = m2.loser;

        // Upper Half - Quarter 2: Match 3 & Match 4 (winner of QF 2 faces Player in SF)
        const m3 = simulateAIMatch(top4[1], rest[0]);
        const m4 = simulateAIMatch(mids[1], mids[2]);
        const qf2 = simulateAIMatch(m3.winner, m4.winner);
        const oppSF = qf2.winner;
        const qfLoser_q2 = qf2.loser;
        const r16Loser_m3 = m3.loser;
        const r16Loser_m4 = m4.loser;

        // Lower Half - Quarter 3 & Quarter 4 (produces Finalist and Bronze Match opponent)
        const m5 = simulateAIMatch(top4[2], rest[1]);
        const m6 = simulateAIMatch(mids[3], mids[4]);
        const qf3 = simulateAIMatch(m5.winner, m6.winner);
        const r16Loser_m5 = m5.loser;
        const r16Loser_m6 = m6.loser;

        const m7 = simulateAIMatch(top4[3], rest[2]);
        const m8 = simulateAIMatch(rest[3], rest[4]);
        const qf4 = simulateAIMatch(m7.winner, m8.winner);
        const r16Loser_m7 = m7.loser;
        const r16Loser_m8 = m8.loser;

        // Lower Half Semi-Final 2:
        const sf2 = simulateAIMatch(qf3.winner, qf4.winner);
        const oppFinal = sf2.winner;
        const oppBronze = sf2.loser;
        const qfLoser_q3 = qf3.loser;
        const qfLoser_q4 = qf4.loser;

        let currentStage = "R16"; // "R16" -> "QF" -> "SF" -> "FINAL" or "BRONZE"
        let currentOpp = oppR16;
        let playerScore = 0;
        let oppScore = 0;
        const TARGET_POINTS = 3;

        let totalPlayerReturns = 0;
        let currentPointRally = 0;
        let lastHitWasPerfect = false;

        // Stage configurations (increased difficulty by 1 notch)
        const STAGE_CONFIG = {
            R16: {
                title: "ROUND OF 16",
                badge: "ROUND OF 16",
                baseSpeed: 0.0185,
                getMissChance: (rally) => rally <= 1 ? 0.15 : (rally === 2 ? 0.30 : 0.48),
                perfectBonus: 0.20
            },
            QF: {
                title: "QUARTER-FINALS",
                badge: "QUARTER-FINALS",
                baseSpeed: 0.022,
                getMissChance: (rally) => rally <= 1 ? 0.09 : (rally === 2 ? 0.20 : 0.36),
                perfectBonus: 0.16
            },
            SF: {
                title: "SEMI-FINALS",
                badge: "SEMI-FINALS",
                baseSpeed: 0.0255,
                getMissChance: (rally) => rally <= 1 ? 0.05 : (rally === 2 ? 0.12 : (rally === 3 ? 0.20 : 0.32)),
                perfectBonus: 0.13
            },
            BRONZE: {
                title: "BRONZE MEDAL MATCH",
                badge: "BRONZE MATCH",
                baseSpeed: 0.0245,
                getMissChance: (rally) => rally <= 1 ? 0.06 : (rally === 2 ? 0.13 : (rally === 3 ? 0.22 : 0.33)),
                perfectBonus: 0.13
            },
            FINAL: {
                title: "GOLD MEDAL FINAL",
                badge: "GOLD FINAL",
                baseSpeed: 0.0285,
                getMissChance: (rally) => rally <= 1 ? 0.03 : (rally === 2 ? 0.08 : (rally === 3 ? 0.14 : 0.24)),
                perfectBonus: 0.10
            }
        };

        const updateHud = () => {
            const cfg = STAGE_CONFIG[currentStage];
            hudStat1Label.textContent = "ROUND";
            hudStat1Val.textContent = cfg.badge;
            hudStat2Label.textContent = "MATCH SCORE";
            hudStat2Val.textContent = `${playerScore} - ${oppScore}`;
        };
        updateHud();

        // Ball 3D state
        let ball = { x: 0, y: 0, z: 0.1, vx: 0.015, vy: 0, vz: 0.018 };
        let ballState = "TOWARD_PLAYER"; // TOWARD_PLAYER, TOWARD_OPPONENT, BOT_MISSED, POINT_OVER
        let rallySpeedMult = 1.0;
        let pointActive = true;

        const swingBtn = document.createElement("button");
        swingBtn.className = "mo-btn mo-btn-gold mo-action-large";
        swingBtn.textContent = "RETURN BALL 🏓";
        arenaControls.appendChild(swingBtn);

        const serveBall = () => {
            const cfg = STAGE_CONFIG[currentStage];
            currentPointRally = 0;
            rallySpeedMult = 1.0;
            lastHitWasPerfect = false;
            ball = {
                x: (Math.random() - 0.5) * 0.3,
                y: 0.1,
                z: 0.12,
                vx: (Math.random() - 0.5) * 0.018,
                vy: -0.015,
                vz: cfg.baseSpeed
            };
            ballState = "TOWARD_PLAYER";
            pointActive = true;
            swingBtn.disabled = false;
        };

        const handlePointWonByPlayer = () => {
            if (!pointActive) return;
            pointActive = false;
            ballState = "POINT_OVER";
            playerScore++;
            updateHud();
            showToast(`POINT TO YOU! (${playerScore}-${oppScore}) 🏓`, "#10b981");

            if (playerScore >= TARGET_POINTS) {
                handleMatchWon();
            } else {
                setTimeout(serveBall, 1200);
            }
        };

        const handlePointWonByOpponent = () => {
            if (!pointActive) return;
            pointActive = false;
            ballState = "POINT_OVER";
            oppScore++;
            updateHud();
            showToast(`POINT TO ${currentOpp.name}! (${playerScore}-${oppScore}) ❌`, "#ef4444");

            if (oppScore >= TARGET_POINTS) {
                handleMatchLost();
            } else {
                setTimeout(serveBall, 1200);
            }
        };

        const handleMatchWon = () => {
            swingBtn.disabled = true;
            if (currentStage === "R16") {
                showToast("ROUND OF 16 WON! ADVANCING TO QUARTER-FINALS ➔", "#ffd700");
                setTimeout(() => {
                    currentStage = "QF";
                    currentOpp = oppQF;
                    playerScore = 0;
                    oppScore = 0;
                    updateHud();
                    serveBall();
                }, 1800);
            } else if (currentStage === "QF") {
                showToast("QUARTER-FINALS WON! ADVANCING TO SEMI-FINALS ➔", "#ffd700");
                setTimeout(() => {
                    currentStage = "SF";
                    currentOpp = oppSF;
                    playerScore = 0;
                    oppScore = 0;
                    updateHud();
                    serveBall();
                }, 1800);
            } else if (currentStage === "SF") {
                showToast("SEMI-FINALS WON! ADVANCING TO GOLD MEDAL FINAL! 🥇", "#ffd700");
                setTimeout(() => {
                    currentStage = "FINAL";
                    currentOpp = oppFinal;
                    playerScore = 0;
                    oppScore = 0;
                    updateHud();
                    serveBall();
                }, 1800);
            } else if (currentStage === "FINAL") {
                showToast("OLYMPIC CHAMPION! 🥇 GOLD MEDAL WON!!", "#ffd700");
                concludeTournament(1);
            } else if (currentStage === "BRONZE") {
                showToast("BRONZE MEDAL SECURED! 🥉", "#cd7f32");
                concludeTournament(3);
            }
        };

        const handleMatchLost = () => {
            swingBtn.disabled = true;
            if (currentStage === "R16") {
                showToast(`ROUND OF 16 DEFEAT (${playerScore}-${oppScore})`, "#ef4444");
                concludeTournament(10);
            } else if (currentStage === "QF") {
                showToast(`QUARTER-FINAL DEFEAT (${playerScore}-${oppScore})`, "#ef4444");
                concludeTournament(6);
            } else if (currentStage === "SF") {
                showToast("SEMI-FINAL DEFEAT! MOVING TO BRONZE MEDAL MATCH 🥉", "#f59e0b");
                setTimeout(() => {
                    currentStage = "BRONZE";
                    currentOpp = oppBronze;
                    playerScore = 0;
                    oppScore = 0;
                    updateHud();
                    serveBall();
                }, 1800);
            } else if (currentStage === "FINAL") {
                showToast(`SILVER MEDALIST! 🥈 (${playerScore}-${oppScore})`, "#e0e8f0");
                concludeTournament(2);
            } else if (currentStage === "BRONZE") {
                showToast(`4TH PLACE FINISH (${playerScore}-${oppScore})`, "#94a3b8");
                concludeTournament(4);
            }
        };

        const concludeTournament = (playerRank) => {
            setTimeout(() => {
                const assigned = new Map();

                if (playerRank === 1) {
                    // Player won Gold
                    assigned.set(competition.playerCountry.code, 1);
                    assigned.set(oppFinal.code, 2);
                    const bm = simulateAIMatch(oppSF, oppBronze);
                    assigned.set(bm.winner.code, 3);
                    assigned.set(bm.loser.code, 4);

                    const qfLosers = [oppQF, qfLoser_q2, qfLoser_q3, qfLoser_q4]
                        .sort((a, b) => getRating(b.code) - getRating(a.code));
                    qfLosers.forEach((team, idx) => assigned.set(team.code, 5 + idx));

                    const r16Losers = [oppR16, r16Loser_m2, r16Loser_m3, r16Loser_m4, r16Loser_m5, r16Loser_m6, r16Loser_m7, r16Loser_m8]
                        .sort((a, b) => getRating(b.code) - getRating(a.code));
                    r16Losers.forEach((team, idx) => assigned.set(team.code, 9 + idx));
                } else if (playerRank === 2) {
                    // Player won Silver
                    assigned.set(oppFinal.code, 1);
                    assigned.set(competition.playerCountry.code, 2);
                    const bm = simulateAIMatch(oppSF, oppBronze);
                    assigned.set(bm.winner.code, 3);
                    assigned.set(bm.loser.code, 4);

                    const qfLosers = [oppQF, qfLoser_q2, qfLoser_q3, qfLoser_q4]
                        .sort((a, b) => getRating(b.code) - getRating(a.code));
                    qfLosers.forEach((team, idx) => assigned.set(team.code, 5 + idx));

                    const r16Losers = [oppR16, r16Loser_m2, r16Loser_m3, r16Loser_m4, r16Loser_m5, r16Loser_m6, r16Loser_m7, r16Loser_m8]
                        .sort((a, b) => getRating(b.code) - getRating(a.code));
                    r16Losers.forEach((team, idx) => assigned.set(team.code, 9 + idx));
                } else if (playerRank === 3) {
                    // Player won Bronze match
                    const gm = simulateAIMatch(oppSF, oppFinal);
                    assigned.set(gm.winner.code, 1);
                    assigned.set(gm.loser.code, 2);
                    assigned.set(competition.playerCountry.code, 3);
                    assigned.set(oppBronze.code, 4);

                    const qfLosers = [oppQF, qfLoser_q2, qfLoser_q3, qfLoser_q4]
                        .sort((a, b) => getRating(b.code) - getRating(a.code));
                    qfLosers.forEach((team, idx) => assigned.set(team.code, 5 + idx));

                    const r16Losers = [oppR16, r16Loser_m2, r16Loser_m3, r16Loser_m4, r16Loser_m5, r16Loser_m6, r16Loser_m7, r16Loser_m8]
                        .sort((a, b) => getRating(b.code) - getRating(a.code));
                    r16Losers.forEach((team, idx) => assigned.set(team.code, 9 + idx));
                } else if (playerRank === 4) {
                    // Player lost Bronze match
                    const gm = simulateAIMatch(oppSF, oppFinal);
                    assigned.set(gm.winner.code, 1);
                    assigned.set(gm.loser.code, 2);
                    assigned.set(oppBronze.code, 3);
                    assigned.set(competition.playerCountry.code, 4);

                    const qfLosers = [oppQF, qfLoser_q2, qfLoser_q3, qfLoser_q4]
                        .sort((a, b) => getRating(b.code) - getRating(a.code));
                    qfLosers.forEach((team, idx) => assigned.set(team.code, 5 + idx));

                    const r16Losers = [oppR16, r16Loser_m2, r16Loser_m3, r16Loser_m4, r16Loser_m5, r16Loser_m6, r16Loser_m7, r16Loser_m8]
                        .sort((a, b) => getRating(b.code) - getRating(a.code));
                    r16Losers.forEach((team, idx) => assigned.set(team.code, 9 + idx));
                } else if (playerRank <= 8) {
                    // Player lost in Quarter-Finals
                    const sf1 = simulateAIMatch(oppQF, oppSF);
                    const gm = simulateAIMatch(sf1.winner, oppFinal);
                    const bm = simulateAIMatch(sf1.loser, oppBronze);
                    assigned.set(gm.winner.code, 1);
                    assigned.set(gm.loser.code, 2);
                    assigned.set(bm.winner.code, 3);
                    assigned.set(bm.loser.code, 4);

                    const qfLosers = [competition.playerCountry, qfLoser_q2, qfLoser_q3, qfLoser_q4]
                        .sort((a, b) => getRating(b.code) - getRating(a.code));
                    qfLosers.forEach((team, idx) => assigned.set(team.code, 5 + idx));

                    const r16Losers = [oppR16, r16Loser_m2, r16Loser_m3, r16Loser_m4, r16Loser_m5, r16Loser_m6, r16Loser_m7, r16Loser_m8]
                        .sort((a, b) => getRating(b.code) - getRating(a.code));
                    r16Losers.forEach((team, idx) => assigned.set(team.code, 9 + idx));
                } else {
                    // Player lost in Round of 16
                    const qf1 = simulateAIMatch(oppR16, oppQF);
                    const sf1 = simulateAIMatch(qf1.winner, oppSF);
                    const gm = simulateAIMatch(sf1.winner, oppFinal);
                    const bm = simulateAIMatch(sf1.loser, oppBronze);
                    assigned.set(gm.winner.code, 1);
                    assigned.set(gm.loser.code, 2);
                    assigned.set(bm.winner.code, 3);
                    assigned.set(bm.loser.code, 4);

                    const qfLosers = [qf1.loser, qfLoser_q2, qfLoser_q3, qfLoser_q4]
                        .sort((a, b) => getRating(b.code) - getRating(a.code));
                    qfLosers.forEach((team, idx) => assigned.set(team.code, 5 + idx));

                    const r16Losers = [competition.playerCountry, r16Loser_m2, r16Loser_m3, r16Loser_m4, r16Loser_m5, r16Loser_m6, r16Loser_m7, r16Loser_m8]
                        .sort((a, b) => getRating(b.code) - getRating(a.code));
                    r16Losers.forEach((team, idx) => assigned.set(team.code, 9 + idx));
                }

                const getScoreForRank = (rank) => {
                    if (rank === 1) return { score: 100, text: "🥇 Gold Champion" };
                    if (rank === 2) return { score: 92, text: "🥈 Silver Finalist" };
                    if (rank === 3) return { score: 86, text: "🥉 Bronze Winner" };
                    if (rank === 4) return { score: 80, text: "4th Place (Semi-Finals)" };
                    if (rank <= 8) return { score: Math.max(68, 76 - (rank - 5) * 2), text: "Quarter-Finalist" };
                    return { score: Math.max(40, 54 - (rank - 9) * 2), text: "Round of 16" };
                };

                const simOpponents = competition.opponents.map((opp) => {
                    const r = assigned.get(opp.code) || 12;
                    const meta = getScoreForRank(r);
                    return {
                        code: opp.code,
                        name: opp.name,
                        flag: opp.flag,
                        knockoutRank: r,
                        normalizedScore: meta.score,
                        rawScore: meta.score,
                        metricDisplay: meta.text,
                        isPlayer: false
                    };
                });

                const actualPlayerRank = assigned.get(competition.playerCountry.code) || playerRank;
                const playerMeta = getScoreForRank(actualPlayerRank);

                finishEvent("tableTennis", {
                    knockoutRank: actualPlayerRank,
                    stageName: playerMeta.text,
                    rawScore: playerMeta.score
                }, simOpponents);
            }, 1200);
        };

        const handleSwing = () => {
            if (!pointActive || ballState !== "TOWARD_PLAYER") return;

            // Check if ball is inside the hit zone (z between 0.72 and 0.95)
            if (ball.z >= 0.72 && ball.z <= 0.95) {
                totalPlayerReturns++;
                currentPointRally++;
                const timingDiff = Math.abs(ball.z - 0.835);
                let hitQuality = "GOOD RETURN!";
                let hitColor = "#00c8ff";
                lastHitWasPerfect = false;

                if (timingDiff <= 0.05) {
                    hitQuality = "PERFECT DRIVE! 🔥";
                    hitColor = "#ffd700";
                    lastHitWasPerfect = true;
                }

                showToast(hitQuality, hitColor);

                // Drive ball back across table
                rallySpeedMult = Math.min(1.85, rallySpeedMult + 0.08);
                const cfg = STAGE_CONFIG[currentStage];
                ballState = "TOWARD_OPPONENT";
                ball.vz = -cfg.baseSpeed * rallySpeedMult * 1.25;
                ball.vx = (Math.random() - 0.5) * 0.024;
            } else if (ball.z < 0.72) {
                showToast("TOO EARLY! ❌", "#ef4444");
            }
        };

        swingBtn.addEventListener("click", handleSwing);
        canvas.addEventListener("click", handleSwing);
        activeKeyHandler = (e) => {
            if (e.code === "Space") {
                e.preventDefault();
                handleSwing();
            }
        };
        window.addEventListener("keydown", activeKeyHandler);

        serveBall();

        const render = () => {
            // Update physics
            ball.x += ball.vx;
            ball.z += ball.vz;
            ball.y = Math.sin(ball.z * Math.PI * 2) * 0.28; // Bounce arc

            // Opponent defensive reaction
            if (pointActive && ballState === "TOWARD_OPPONENT" && ball.z <= 0.12) {
                const cfg = STAGE_CONFIG[currentStage];
                const missChance = cfg.getMissChance(currentPointRally) + (lastHitWasPerfect ? cfg.perfectBonus : 0);

                if (Math.random() < missChance) {
                    // Bot error - point to player!
                    ballState = "BOT_MISSED";
                    ball.vz = -0.028;
                    ball.vx = (Math.random() - 0.5) * 0.035;
                    ball.vy = -0.04;
                    setTimeout(handlePointWonByPlayer, 350);
                } else {
                    // Bot clean return
                    ballState = "TOWARD_PLAYER";
                    ball.vz = cfg.baseSpeed * rallySpeedMult;
                    ball.vx = (Math.random() - 0.5) * 0.022;
                }
            }

            // Player misses ball
            if (pointActive && ballState === "TOWARD_PLAYER" && ball.z > 1.05) {
                handlePointWonByOpponent();
            }

            // Draw Perspective Ping Pong Table
            ctx.fillStyle = "#040d1a";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const cx = canvas.width / 2;
            const cy = canvas.height * 0.56;

            // Table trapezoid (3D perspective)
            const topW = canvas.width * 0.36;
            const topY = cy - 70;
            const botW = canvas.width * 0.74;
            const botY = cy + 120;

            ctx.fillStyle = "#0c4a6e"; // Classic Olympic blue table
            ctx.beginPath();
            ctx.moveTo(cx - topW / 2, topY);
            ctx.lineTo(cx + topW / 2, topY);
            ctx.lineTo(cx + botW / 2, botY);
            ctx.lineTo(cx - botW / 2, botY);
            ctx.closePath();
            ctx.fill();

            // White table border
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 4;
            ctx.stroke();

            // Center dividing line
            ctx.beginPath();
            ctx.moveTo(cx, topY);
            ctx.lineTo(cx, botY);
            ctx.lineWidth = 2;
            ctx.stroke();

            // Net
            const netY = (topY + botY) / 2;
            const netW = (topW + botW) / 2 + 30;
            ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 3;
            ctx.strokeRect(cx - netW / 2, netY - 26, netW, 26);
            ctx.fillRect(cx - netW / 2, netY - 26, netW, 26);

            // Hit Zone indicator near bottom edge (z = 0.835)
            const hitZoneY = topY + (botY - topY) * 0.835;
            const hitZoneW = topW + (botW - topW) * 0.835;
            ctx.save();
            ctx.strokeStyle = ballState === "TOWARD_PLAYER" && ball.z >= 0.72 && ball.z <= 0.95 ? "#ffd700" : "rgba(0, 200, 255, 0.35)";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.ellipse(cx, hitZoneY, hitZoneW * 0.42, 28, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            // Project ball coordinates to screen
            const screenBallY = topY + (botY - topY) * ball.z - ball.y * 120;
            const currentW = topW + (botW - topW) * ball.z;
            const screenBallX = cx + ball.x * (currentW * 0.8);
            const ballRadius = Math.max(5, 6 + ball.z * 10);

            // Ball shadow on table
            ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
            ctx.beginPath();
            ctx.ellipse(screenBallX, topY + (botY - topY) * ball.z, ballRadius * 1.1, ballRadius * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();

            // Ball (Bright orange ping-pong)
            ctx.fillStyle = "#ff9800";
            ctx.beginPath();
            ctx.arc(screenBallX, screenBallY, ballRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#fff3e0";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Top Broadcast Scoreboard Banner
            const scoreBarW = Math.min(460, canvas.width - 30);
            ctx.fillStyle = "rgba(4, 18, 36, 0.92)";
            ctx.strokeStyle = "#ffd700";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(cx - scoreBarW / 2, 14, scoreBarW, 58, 8);
            ctx.fill();
            ctx.stroke();

            // Match header
            ctx.fillStyle = "#ffd700";
            ctx.font = "bold 11px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(`${STAGE_CONFIG[currentStage].title} • FIRST TO 3 POINTS`, cx, 30);

            // Score details
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 15px sans-serif";
            ctx.fillText(`${competition.playerCountry.flag} ${competition.playerCountry.name}  ${playerScore}  :  ${oppScore}  ${currentOpp.name} ${currentOpp.flag}`, cx, 54);

            activeGameLoop = requestAnimationFrame(render);
        };

        render();
    };

    // -------------------------------------------------------------
    // MINI-GAME 4: WEIGHTLIFTING (Timing & Barbell Control)
    // -------------------------------------------------------------
    const playWeightlifting = () => {
        // 9 progressive levels from 140kg to 220kg (marginally calibrated speed for fair gold achievement)
        const levels = [
            { weight: 140, speed: 0.028, zoneWidth: 0.35 },
            { weight: 150, speed: 0.033, zoneWidth: 0.31 },
            { weight: 160, speed: 0.038, zoneWidth: 0.28 },
            { weight: 170, speed: 0.044, zoneWidth: 0.25 },
            { weight: 180, speed: 0.050, zoneWidth: 0.22 },
            { weight: 190, speed: 0.056, zoneWidth: 0.19 },
            { weight: 200, speed: 0.063, zoneWidth: 0.16 },
            { weight: 210, speed: 0.070, zoneWidth: 0.13 },
            { weight: 220, speed: 0.077, zoneWidth: 0.11 }
        ];

        let currentLevelIdx = 0;
        let currentChance = 1; // 1 or 2
        let bestLiftKg = 0;
        let totalFails = 0;
        const attemptsHistory = [];
        let attemptActive = true;
        let lifterState = "READY"; // READY -> LIFTING_SUCCESS -> LIFTING_FAIL

        // Oscillating Needle (-1 to 1)
        let needlePos = 0;
        let needleDir = 1;

        hudStat1Label.textContent = "LEVEL & CHANCE";
        hudStat1Val.textContent = "1 / 9 (CHANCE 1)";
        hudStat2Label.textContent = "BEST LIFT / FAILS";
        hudStat2Val.textContent = "0 kg (0 fails)";

        const liftBtn = document.createElement("button");
        liftBtn.className = "mo-btn mo-btn-gold mo-action-large";
        liftBtn.textContent = `HOIST ${levels[0].weight} KG (CHANCE 1) 🏋️`;
        arenaControls.appendChild(liftBtn);

        const executeLift = () => {
            if (!attemptActive) return;
            attemptActive = false;

            const curLvl = levels[currentLevelIdx];
            const inZone = Math.abs(needlePos) <= curLvl.zoneWidth;

            if (inZone) {
                // Success: Good lift!
                lifterState = "LIFTING_SUCCESS";
                bestLiftKg = Math.max(bestLiftKg, curLvl.weight);

                if (currentChance === 1) {
                    showToast(`GOOD LIFT! ${curLvl.weight} KG! ⚪⚪⚪`, "var(--emerald)");
                    attemptsHistory.push({ weight: curLvl.weight, status: "⚪", fails: 0, cleared: true });
                } else {
                    showToast(`CLEARED ON 2ND CHANCE! ${curLvl.weight} KG! ⚪`, "var(--gold)");
                    attemptsHistory.push({ weight: curLvl.weight, status: "🔴⚪", fails: 1, cleared: true });
                }

                hudStat2Val.textContent = `${bestLiftKg} kg (${totalFails} ${totalFails === 1 ? "fail" : "fails"})`;

                setTimeout(() => {
                    currentLevelIdx++;
                    currentChance = 1;

                    if (currentLevelIdx < levels.length) {
                        attemptActive = true;
                        lifterState = "READY";
                        hudStat1Val.textContent = `${currentLevelIdx + 1} / 9 (CHANCE 1)`;
                        liftBtn.textContent = `HOIST ${levels[currentLevelIdx].weight} KG (CHANCE 1) 🏋️`;
                    } else {
                        // Flawless run: Cleared all 9 levels up to 220kg!
                        liftBtn.disabled = true;
                        setTimeout(() => {
                            finishEvent("weightlifting", {
                                bestLiftKg,
                                totalFails,
                                attempts: attemptsHistory,
                                rawScore: bestLiftKg
                            });
                        }, 1200);
                    }
                }, 1600);
            } else {
                // Missed lift
                lifterState = "LIFTING_FAIL";
                totalFails++;

                if (currentChance === 1) {
                    // First failure at this weight: Give Chance 2
                    showToast(`NO LIFT (CHANCE 1)! 🔴 ONE CHANCE REMAINING`, "var(--crimson)");
                    hudStat2Val.textContent = `${bestLiftKg} kg (${totalFails} ${totalFails === 1 ? "fail" : "fails"})`;

                    setTimeout(() => {
                        currentChance = 2;
                        attemptActive = true;
                        lifterState = "READY";
                        hudStat1Val.textContent = `${currentLevelIdx + 1} / 9 (CHANCE 2)`;
                        liftBtn.textContent = `RE-HOIST ${curLvl.weight} KG (CHANCE 2) 🏋️`;
                    }, 1400);
                } else {
                    // Second failure: Eliminated from competition
                    showToast(`NO LIFT (CHANCE 2)! 🔴🔴 ELIMINATED AT ${curLvl.weight} KG`, "var(--crimson)");
                    hudStat2Val.textContent = `${bestLiftKg} kg (${totalFails} ${totalFails === 1 ? "fail" : "fails"})`;
                    attemptsHistory.push({ weight: curLvl.weight, status: "🔴🔴", fails: 2, cleared: false });

                    // Mark unattempted levels
                    for (let r = currentLevelIdx + 1; r < levels.length; r++) {
                        attemptsHistory.push({ weight: levels[r].weight, status: "—", fails: 0, cleared: false });
                    }

                    liftBtn.disabled = true;
                    setTimeout(() => {
                        finishEvent("weightlifting", {
                            bestLiftKg,
                            totalFails,
                            attempts: attemptsHistory,
                            rawScore: bestLiftKg
                        });
                    }, 1800);
                }
            }
        };

        liftBtn.addEventListener("click", executeLift);
        canvas.addEventListener("click", executeLift);
        activeKeyHandler = (e) => {
            if (e.code === "Space") {
                e.preventDefault();
                executeLift();
            }
        };
        window.addEventListener("keydown", activeKeyHandler);

        const render = () => {
            const att = levels[currentLevelIdx] || levels[levels.length - 1];

            if (attemptActive) {
                needlePos += needleDir * att.speed;
                if (needlePos > 1) { needlePos = 1; needleDir = -1; }
                if (needlePos < -1) { needlePos = -1; needleDir = 1; }
            }

            // Draw Background Platform
            ctx.fillStyle = "#071326";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Platform Wood Floor
            const platX = canvas.width * 0.15;
            const platY = canvas.height * 0.72;
            const platW = canvas.width * 0.7;
            const platH = 45;

            ctx.fillStyle = "#b45309";
            ctx.fillRect(platX, platY, platW, platH);
            ctx.strokeStyle = "#ffd700";
            ctx.lineWidth = 3;
            ctx.strokeRect(platX, platY, platW, platH);

            // Draw Lifter Athlete
            const lx = canvas.width / 2;
            const ly = platY - 40;

            ctx.save();
            // Lifter Head
            ctx.fillStyle = "#fed7aa";
            ctx.beginPath();
            ctx.arc(lx, ly - 70, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#1e293b";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Torso
            ctx.strokeStyle = "#00c8ff";
            ctx.lineWidth = 14;
            ctx.beginPath();
            ctx.moveTo(lx, ly - 54);
            ctx.lineTo(lx, ly - 10);
            ctx.stroke();

            // Barbell Height based on state
            let barY = ly - 20;
            if (lifterState === "LIFTING_SUCCESS") barY = ly - 110; // Overhead
            if (lifterState === "LIFTING_FAIL") barY = ly + 15; // Dropped

            // Barbell Shaft
            ctx.strokeStyle = "#e2e8f0";
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(lx - 120, barY);
            ctx.lineTo(lx + 120, barY);
            ctx.stroke();

            // Weight Plates
            const plateR = 34;
            ctx.fillStyle = att.weight >= 210 ? "#dc2626" : att.weight >= 180 ? "#2563eb" : att.weight >= 160 ? "#d97706" : "#16a34a";
            ctx.fillRect(lx - 130, barY - plateR, 16, plateR * 2);
            ctx.fillRect(lx + 114, barY - plateR, 16, plateR * 2);

            // Weight Text Label
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 20px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(`${att.weight} KG (LEVEL ${currentLevelIdx + 1}/9)`, lx, 46);

            // Chance Indicator Text
            ctx.fillStyle = currentChance === 1 ? "#00c8ff" : "#fbbf24";
            ctx.font = "600 13px sans-serif";
            ctx.fillText(currentChance === 1 ? "CHANCE 1 OF 2" : "CHANCE 2 (FINAL ATTEMPT)", lx, 70);
            ctx.restore();

            // Draw Gauge Meter at bottom
            const meterW = Math.min(360, canvas.width - 60);
            const meterH = 30;
            const meterX = (canvas.width - meterW) / 2;
            const meterY = canvas.height - 60;

            ctx.fillStyle = "rgba(4, 18, 36, 0.9)";
            ctx.strokeStyle = "rgba(0, 200, 255, 0.3)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(meterX, meterY, meterW, meterH, 6);
            ctx.fill();
            ctx.stroke();

            // Green Sweet Spot
            const zonePx = att.zoneWidth * (meterW / 2);
            ctx.fillStyle = "rgba(0, 230, 118, 0.45)";
            ctx.fillRect(meterX + meterW / 2 - zonePx, meterY + 2, zonePx * 2, meterH - 4);

            // Needle
            const nx = meterX + meterW / 2 + needlePos * (meterW / 2 - 8);
            ctx.fillStyle = "#ffd700";
            ctx.fillRect(nx - 4, meterY + 1, 8, meterH - 2);

            activeGameLoop = requestAnimationFrame(render);
        };

        render();
    };

    // -------------------------------------------------------------
    // MINI-GAME 5: FENCING (Decisions & Response Speed)
    // -------------------------------------------------------------
    const playFencing = () => {
        const maxBouts = 10;
        let currentBout = 0;
        let correctCount = 0;
        let totalReactionTime = 0;
        let boutActive = false;
        let startTime = 0;
        let timerDuration = 1200; // ms
        let timerRemaining = 1200;

        const attacks = [
            { cue: "HIGH THRUST 🤺", keyPrompt: "PRESS [W] ➔ HIGH PARRY", correctAction: "highParry", name: "High Parry", key: "W" },
            { cue: "LOW LUNGE 🗡️", keyPrompt: "PRESS [S] ➔ LOW PARRY", correctAction: "lowParry", name: "Low Parry", key: "S" },
            { cue: "SWEEP SLASH ⚔️", keyPrompt: "PRESS [A] ➔ DODGE BACK", correctAction: "dodge", name: "Dodge", key: "A" },
            { cue: "EXPOSED OPENING 🎯", keyPrompt: "PRESS [D] ➔ RIPOSTE ATTACK", correctAction: "riposte", name: "Riposte", key: "D" }
        ];

        let currentAttack = attacks[0];

        hudStat1Label.textContent = "BOUT";
        hudStat1Val.textContent = "1 / 10";
        hudStat2Label.textContent = "HITS LANDED";
        hudStat2Val.textContent = "0";

        // Action Buttons in Diamond Controller Pad (PlayStation controller layout)
        // Buttons show strictly WASD and nothing else
        const diamondPad = document.createElement("div");
        diamondPad.className = "mo-diamond-pad";
        diamondPad.setAttribute("role", "group");
        diamondPad.setAttribute("aria-label", "Fencing directional controls");

        const btnMap = {};

        const createDiamondBtn = (keyLetter, actionId, cls) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = `mo-diamond-btn ${cls}`;
            btn.textContent = keyLetter;
            btn.setAttribute("aria-label", keyLetter);
            btn.addEventListener("click", () => handleAction(actionId));
            btnMap[keyLetter] = btn;
            return btn;
        };

        const btnW = createDiamondBtn("W", "highParry", "mo-btn-w");
        const btnA = createDiamondBtn("A", "dodge", "mo-btn-a");
        const btnD = createDiamondBtn("D", "riposte", "mo-btn-d");
        const btnS = createDiamondBtn("S", "lowParry", "mo-btn-s");

        diamondPad.appendChild(btnW);
        diamondPad.appendChild(btnA);
        diamondPad.appendChild(btnD);
        diamondPad.appendChild(btnS);

        arenaControls.innerHTML = "";
        arenaControls.appendChild(diamondPad);

        const flashBtn = (k) => {
            if (btnMap[k]) {
                btnMap[k].classList.add("is-active");
                setTimeout(() => btnMap[k]?.classList.remove("is-active"), 140);
            }
        };

        const startBout = () => {
            if (currentBout >= maxBouts) {
                const avgMs = correctCount > 0 ? Math.round(totalReactionTime / correctCount) : 1000;
                finishEvent("fencing", {
                    correctCount: correctCount,
                    avgReactionMs: avgMs
                });
                return;
            }

            currentBout++;
            hudStat1Val.textContent = `${currentBout} / ${maxBouts}`;
            currentAttack = attacks[Math.floor(Math.random() * attacks.length)];
            timerDuration = Math.max(750, 1250 - currentBout * 40);
            timerRemaining = timerDuration;
            boutActive = true;
            startTime = performance.now();
        };

        const handleAction = (chosenAction) => {
            if (!boutActive) return;
            boutActive = false;
            const elapsed = performance.now() - startTime;

            if (chosenAction === currentAttack.correctAction) {
                correctCount++;
                totalReactionTime += elapsed;
                hudStat2Val.textContent = `${correctCount}`;
                showToast(`PARRY & TOUCHÉ! (${Math.round(elapsed)}ms) 💥`, "#10b981");
            } else {
                showToast("TOUCHED AGAINST! ❌", "#ef4444");
            }

            setTimeout(startBout, 1200);
        };

        activeKeyHandler = (e) => {
            if (e.code === "KeyW") {
                flashBtn("W");
                handleAction("highParry");
            } else if (e.code === "KeyS") {
                flashBtn("S");
                handleAction("lowParry");
            } else if (e.code === "KeyA") {
                flashBtn("A");
                handleAction("dodge");
            } else if (e.code === "KeyD") {
                flashBtn("D");
                handleAction("riposte");
            }
        };
        window.addEventListener("keydown", activeKeyHandler);

        setTimeout(startBout, 800);

        const render = () => {
            if (boutActive) {
                const elapsed = performance.now() - startTime;
                timerRemaining = Math.max(0, timerDuration - elapsed);

                if (timerRemaining <= 0) {
                    boutActive = false;
                    showToast("TOO SLOW! TIME OUT ⏱️", "#ef4444");
                    setTimeout(startBout, 1200);
                }
            }

            // Draw Piste
            ctx.fillStyle = "#030e20";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Metallic Fencing Piste Strip
            const stripY = canvas.height * 0.65;
            ctx.fillStyle = "#334155";
            ctx.fillRect(40, stripY, canvas.width - 80, 24);
            ctx.strokeStyle = "#00c8ff";
            ctx.lineWidth = 2;
            ctx.strokeRect(40, stripY, canvas.width - 80, 24);

            // Center warning lines
            ctx.strokeStyle = "#ffd700";
            ctx.strokeRect(canvas.width / 2 - 40, stripY, 80, 24);

            // Fencer Silhouettes
            const playerX = canvas.width * 0.32;
            const oppX = canvas.width * 0.68;
            const fy = stripY - 10;

            // Player Fencer (White jacket)
            ctx.fillStyle = "#f8fafc";
            ctx.beginPath();
            ctx.arc(playerX, fy - 65, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#f8fafc";
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(playerX, fy - 52);
            ctx.lineTo(playerX + 20, fy - 15);
            ctx.stroke();

            // Opponent Fencer (Dark grey jacket)
            ctx.fillStyle = "#94a3b8";
            ctx.beginPath();
            ctx.arc(oppX, fy - 65, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#94a3b8";
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(oppX, fy - 52);
            ctx.lineTo(oppX - 20, fy - 15);
            ctx.stroke();

            // Opponent Attack Cue Banner with explicit paired key prompt
            if (boutActive) {
                const bW = Math.min(320, canvas.width - 40);
                ctx.fillStyle = "rgba(4, 18, 36, 0.92)";
                ctx.strokeStyle = "#ffd700";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.roundRect(canvas.width / 2 - bW / 2, 28, bW, 58, 8);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = "#ffd700";
                ctx.font = "bold 18px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText(currentAttack.cue, canvas.width / 2, 52);

                ctx.fillStyle = "#38bdf8";
                ctx.font = "bold 12px sans-serif";
                ctx.fillText(currentAttack.keyPrompt, canvas.width / 2, 72);

                // Reaction Timer Gauge Bar
                const timerRatio = timerRemaining / timerDuration;
                ctx.fillStyle = timerRatio > 0.35 ? "#00c8ff" : "#ef4444";
                ctx.fillRect(canvas.width / 2 - bW / 2 + 2, 88, (bW - 4) * timerRatio, 4);
            }

            activeGameLoop = requestAnimationFrame(render);
        };

        render();
    };

    // -------------------------------------------------------------
    // EVENT COMPLETION & RESULTS ENGINE
    // -------------------------------------------------------------
    const finishEvent = async (eventId, metrics, simOpponents = null) => {
        try {
            const bodyPayload = {
                competitionId: competition.competitionId,
                eventId: eventId,
                metrics: metrics,
                rawScore: metrics.rawScore
            };
            if (simOpponents) {
                bodyPayload.simOpponents = simOpponents;
            }

            const res = await window.GamingSession.fetch(`${API_BASE}/competition/event-result`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodyPayload)
            });

            const json = await res.json();
            if (json.success) {
                displayEventResults(json.data);
            } else {
                alert(json.error?.message || "Error submitting score.");
            }
        } catch (_e) {
            alert("Could not reach server to finalize event.");
        }
    };

    const displayEventResults = (data) => {
        showScreen("eventResults");

        const ranked = data.eventRanked;
        const playerEntry = ranked.rankings.find((r) => r.isPlayer);

        // Player Result Card
        resFlag.innerHTML = getFlagImgHtml(playerEntry.code, playerEntry.flag, "large");
        resCountryName.textContent = playerEntry.name;

        if (data.eventId === "archery") {
            resScoreText.textContent = `Points: ${playerEntry.rawScore} / 50 pts`;
        } else if (data.eventId === "sprint") {
            const sprintTime = playerEntry.metricDisplay || (playerEntry.finishTime ? Number(playerEntry.finishTime).toFixed(2) + " s" : playerEntry.rawScore + " s");
            resScoreText.textContent = `Time: ${sprintTime}`;
        } else if (data.eventId === "tableTennis") {
            resScoreText.textContent = `Finish: ${playerEntry.metricDisplay || playerEntry.rawScore}`;
        } else if (data.eventId === "weightlifting") {
            const fText = playerEntry.totalFails === 0 ? "Flawless (0 fails)" : `${playerEntry.totalFails} ${playerEntry.totalFails === 1 ? 'fail' : 'fails'}`;
            resScoreText.textContent = `Best Cleared: ${playerEntry.bestLiftKg || playerEntry.rawScore} kg (${fText})`;
        } else if (data.eventId === "fencing") {
            resScoreText.textContent = `Hits: ${playerEntry.metricDisplay || playerEntry.rawScore} • Score: ${playerEntry.normalizedScore} / 100`;
        } else {
            resScoreText.textContent = `Performance: ${playerEntry.metricDisplay || playerEntry.rawScore}`;
        }

        if (playerEntry.rank === 1) {
            resMedalBadge.className = "mo-medal-badge mo-medal-gold";
            resMedalBadge.textContent = "🥇";
            resRankText.textContent = "1ST PLACE — GOLD MEDAL";
            resFeedbackText.textContent = "Olympic Champion! A peerless performance takes top podium honors.";
        } else if (playerEntry.rank === 2) {
            resMedalBadge.className = "mo-medal-badge mo-medal-silver";
            resMedalBadge.textContent = "🥈";
            resRankText.textContent = "2ND PLACE — SILVER MEDAL";
            resFeedbackText.textContent = "Outstanding display! Silver medal secured in a tight contest.";
        } else if (playerEntry.rank === 3) {
            resMedalBadge.className = "mo-medal-badge mo-medal-bronze";
            resMedalBadge.textContent = "🥉";
            resRankText.textContent = "3RD PLACE — BRONZE MEDAL";
            resFeedbackText.textContent = "On the podium! A bronze medal captured for your country.";
        } else {
            resMedalBadge.className = "mo-medal-badge mo-medal-none";
            resMedalBadge.textContent = `${playerEntry.rank}`;
            resRankText.textContent = `${playerEntry.rank}TH PLACE`;
            resFeedbackText.textContent = "Solid contest against 15 global competitors.";
        }

        const eventMeta = {
            archery: { name: "ARCHERY", metric: "POINTS", col: "POINTS" },
            sprint: { name: "100m SPRINT", metric: "TIME", col: "TIME" },
            tableTennis: { name: "TABLE TENNIS", metric: "STAGE", col: "STAGE" },
            weightlifting: { name: "WEIGHTLIFTING", metric: "PROGRESSION & BEST LIFT", col: "BEST LIFT & FAILS" },
            fencing: { name: "FENCING", metric: "BOUTS & SCORE", col: "SCORE" }
        };

        const eInfo = eventMeta[data.eventId] || { name: (data.eventId || "").toUpperCase(), metric: "PERFORMANCE", col: "RESULT" };

        if (eventScoreboardTitle) eventScoreboardTitle.textContent = `🎯 ${eInfo.name} SCOREBOARD (ALL 16 NATIONS)`;
        if (eventMetricHeader) eventMetricHeader.textContent = eInfo.metric;
        if (thPerformance) thPerformance.textContent = eInfo.col;

        // 1. RENDER EVENT SCOREBOARD FOR ALL 16 NATIONS
        renderEventScoreboard(eventScoreboardBody, ranked.rankings, data.eventId);

        // SHOW EVENT SCOREBOARD SCREEN FIRST
        showScreen("eventScoreboard");

        // When user clicks "NEXT: VIEW MEDAL STANDINGS", show cumulative standings
        if (btnToCumulativeStandings) {
            btnToCumulativeStandings.onclick = () => {
                displayCumulativeStandings(data);
            };
        }
    };

    /**
     * Step 2 of Post-Game Flow: Displays the cumulative Olympic medal standings
     * up to this point across all completed events.
     */
    const displayCumulativeStandings = (data) => {
        showScreen("cumulativeStandings");

        const completedEventNumber = data.currentEventIndex;
        if (cumulativeStandingsTitle) {
            cumulativeStandingsTitle.textContent = `🏅 MEDAL TALLY (AFTER EVENT ${completedEventNumber} OF 5)`;
        }

        // Highlight player's overall standing up to this point
        const playerStanding = data.standings.find((s) => s.isPlayer);
        if (playerStanding && playerStandingText) {
            playerStandingText.innerHTML = `
                <div style="display:inline-flex; align-items:center; gap:8px; margin-bottom:4px;">
                    ${getFlagImgHtml(competition.playerCountry.code, competition.playerCountry.flag)}
                    <strong>${competition.playerCountry.name}: Currently Ranked #${playerStanding.rank} Overall</strong>
                </div><br>
                Medals Earned: <strong>${playerStanding.gold} Gold</strong>, <strong>${playerStanding.silver} Silver</strong>, <strong>${playerStanding.bronze} Bronze</strong> (${playerStanding.totalMedals} total medals).
            `;
        }

        // Render cumulative medal standings table for all 16 nations
        renderStandingsTable(eventStandingsBody, data.standings);

        // Allow navigating back to the event scoreboard
        if (btnBackToScoreboard) {
            btnBackToScoreboard.onclick = () => {
                showScreen("eventScoreboard");
            };
        }

        // Next event button action
        if (btnNextEventAction) {
            if (data.isCompleted) {
                btnNextEventAction.textContent = "PROCEED TO CLOSING CEREMONY 🏆";
                btnNextEventAction.onclick = () => displayFinalCeremony(data);
            } else {
                competition.currentEventIndex = data.currentEventIndex;
                competition.standings = data.standings;
                btnNextEventAction.textContent = `CONTINUE TO EVENT ${competition.currentEventIndex + 1} OF 5 ➔`;
                btnNextEventAction.onclick = prepareEventIntro;
            }
        }
    };

    const renderAttemptsStrip = (attempts) => {
        if (!attempts || !attempts.length) return '<span style="color: #64748b;">—</span>';
        const cells = attempts.map((a) => {
            const status = a.status || (a.cleared ? "⚪" : a.fails >= 2 ? "🔴🔴" : a.fails === 1 ? "🔴⚪" : "—");
            let cls = "mo-cell-idle";
            let mark = "—";
            let tooltip = `${a.weight}kg: Did not attempt`;

            if (status === "⚪") {
                cls = "mo-cell-good";
                mark = "✓";
                tooltip = `${a.weight}kg: Cleared on 1st attempt (0 fails)`;
            } else if (status === "🔴⚪") {
                cls = "mo-cell-second";
                mark = "2nd";
                tooltip = `${a.weight}kg: Cleared on 2nd attempt (1 fail)`;
            } else if (status === "🔴🔴") {
                cls = "mo-cell-fail";
                mark = "✗";
                tooltip = `${a.weight}kg: Missed both attempts (2 fails)`;
            }

            return `
                <div class="mo-attempt-cell ${cls}" title="${tooltip}">
                    <span class="cell-weight">${a.weight}</span>
                    <span class="cell-mark">${mark}</span>
                </div>
            `;
        }).join("");

        return `<div class="mo-attempts-strip">${cells}</div>`;
    };

    const renderEventScoreboard = (tbody, rankings, eventId) => {
        if (!tbody) return;
        tbody.innerHTML = "";

        // Dynamic Olympic Legend for Weightlifting
        const legendContainer = document.getElementById("mo-event-scoreboard-legend");
        if (legendContainer) {
            if (eventId === "weightlifting") {
                legendContainer.style.display = "flex";
                legendContainer.className = "mo-attempts-legend";
                legendContainer.innerHTML = `
                    <span class="mo-attempts-legend-item"><span class="mo-legend-dot mo-dot-good"></span> <strong>1st Try (✓)</strong></span>
                    <span class="mo-attempts-legend-item"><span class="mo-legend-dot mo-dot-second"></span> <strong>2nd Try (2nd)</strong></span>
                    <span class="mo-attempts-legend-item"><span class="mo-legend-dot mo-dot-fail"></span> <strong>Missed (✗)</strong></span>
                    <span class="mo-attempts-legend-item"><span class="mo-legend-dot mo-dot-idle"></span> <strong>Unattempted (—)</strong></span>
                `;
            } else {
                legendContainer.style.display = "none";
                legendContainer.innerHTML = "";
            }
        }

        const headRow = document.getElementById("event-scoreboard-head-row");
        if (headRow) {
            if (eventId === "weightlifting") {
                headRow.innerHTML = `
                    <th class="col-rank">#</th>
                    <th>NATION</th>
                    <th style="text-align: center; min-width: 320px;">LIFT PROGRESSION (140 – 220 KG)</th>
                    <th style="text-align: right; padding-right: 20px;">BEST LIFT &amp; FAILS</th>
                `;
            } else if (eventId === "archery") {
                headRow.innerHTML = `
                    <th class="col-rank">#</th>
                    <th>NATION</th>
                    <th style="text-align: right; padding-right: 20px;">POINTS</th>
                `;
            } else if (eventId === "sprint") {
                headRow.innerHTML = `
                    <th class="col-rank">#</th>
                    <th>NATION</th>
                    <th style="text-align: right; padding-right: 20px;">TIME</th>
                `;
            } else if (eventId === "tableTennis") {
                headRow.innerHTML = `
                    <th class="col-rank">#</th>
                    <th>NATION</th>
                    <th style="text-align: right; padding-right: 20px;">STAGE</th>
                `;
            } else if (eventId === "fencing") {
                headRow.innerHTML = `
                    <th class="col-rank">#</th>
                    <th>NATION</th>
                    <th style="text-align: center;">BOUTS WON</th>
                    <th style="text-align: right; padding-right: 20px;">SCORE</th>
                `;
            }
        }

        rankings.forEach((entry) => {
            const tr = document.createElement("tr");
            let rowClasses = [];
            if (entry.isPlayer) rowClasses.push("is-player");
            if (entry.medal) rowClasses.push(`row-medal row-${entry.medal}`);
            tr.className = rowClasses.join(" ");

            const rankBadge =
                entry.medal === "gold" ? `<span class="mo-rank-badge rank-gold"><span class="mo-medal-ico">🥇</span> 1</span>` :
                entry.medal === "silver" ? `<span class="mo-rank-badge rank-silver"><span class="mo-medal-ico">🥈</span> 2</span>` :
                entry.medal === "bronze" ? `<span class="mo-rank-badge rank-bronze"><span class="mo-medal-ico">🥉</span> 3</span>` :
                `<span class="mo-rank-num">${entry.rank}</span>`;

            const medalPill =
                entry.medal === "gold" ? `<span class="mo-medal-pill pill-gold">GOLD</span>` :
                entry.medal === "silver" ? `<span class="mo-medal-pill pill-silver">SILVER</span>` :
                entry.medal === "bronze" ? `<span class="mo-medal-pill pill-bronze">BRONZE</span>` : "";

            const nationHtml = `
                <div class="mo-country-cell">
                    ${getFlagImgHtml(entry.code, entry.flag)}
                    <span class="mo-country-name">${entry.name}</span>
                    ${entry.isPlayer ? '<span class="mo-player-tag">YOU</span>' : ""}
                    ${medalPill}
                </div>
            `;

            if (eventId === "weightlifting") {
                const stripHtml = renderAttemptsStrip(entry.attempts);
                const failsCount = entry.totalFails !== undefined ? entry.totalFails : 0;
                const failsText = `${failsCount} ${failsCount === 1 ? "fail" : "fails"}`;
                tr.innerHTML = `
                    <td class="col-rank">${rankBadge}</td>
                    <td class="col-country">${nationHtml}</td>
                    <td style="text-align: center; padding: 6px 10px;">${stripHtml}</td>
                    <td style="text-align: right; padding-right: 20px; font-weight: 700; color: var(--gold);">
                        <div style="font-size: 15px;">${entry.bestLiftKg || entry.rawScore} kg</div>
                        <div style="font-size: 11px; color: ${failsCount === 0 ? 'var(--emerald)' : '#94a3b8'}; font-weight: 600;">
                            ${failsCount === 0 ? 'FLAWLESS (0 fails)' : `(${failsText})`}
                        </div>
                    </td>
                `;
            } else if (eventId === "archery") {
                const pts = Number(entry.rawScore) > 50 ? Math.round(Number(entry.rawScore) / 10) : entry.rawScore;
                tr.innerHTML = `
                    <td class="col-rank">${rankBadge}</td>
                    <td class="col-country">${nationHtml}</td>
                    <td style="text-align: right; padding-right: 20px; font-weight: 700; color: var(--gold); font-size: 15px;">
                        ${pts} / 50 pts
                    </td>
                `;
            } else if (eventId === "sprint") {
                const timeText = entry.metricDisplay || (entry.finishTime ? Number(entry.finishTime).toFixed(2) + " s" : entry.rawScore + " s");
                tr.innerHTML = `
                    <td class="col-rank">${rankBadge}</td>
                    <td class="col-country">${nationHtml}</td>
                    <td style="text-align: right; padding-right: 20px; font-weight: 700; color: var(--gold); font-size: 15px;">
                        ${timeText}
                    </td>
                `;
            } else if (eventId === "tableTennis") {
                tr.innerHTML = `
                    <td class="col-rank">${rankBadge}</td>
                    <td class="col-country">${nationHtml}</td>
                    <td style="text-align: right; padding-right: 20px; font-weight: 700; color: var(--gold); font-size: 14px;">
                        ${entry.metricDisplay || entry.rawScore}
                    </td>
                `;
            } else if (eventId === "fencing") {
                tr.innerHTML = `
                    <td class="col-rank">${rankBadge}</td>
                    <td class="col-country">${nationHtml}</td>
                    <td style="text-align: center; font-weight: 600; color: #94a3b8;">
                        ${entry.metricDisplay || (entry.metrics?.correctCount !== undefined ? entry.metrics.correctCount + ' / 10 hits' : '')}
                    </td>
                    <td style="text-align: right; padding-right: 20px; font-weight: 700; color: var(--gold); font-size: 15px;">
                        ${entry.normalizedScore} / 100
                    </td>
                `;
            }

            tbody.appendChild(tr);
        });
    };

    const renderStandingsTable = (tbody, standings) => {
        tbody.innerHTML = "";
        standings.forEach((entry, idx) => {
            const tr = document.createElement("tr");
            if (entry.isPlayer) tr.className = "is-player";
            tr.innerHTML = `
                <td class="col-rank">${entry.rank || idx + 1}</td>
                <td class="col-country">
                    <div class="mo-country-cell">
                        ${getFlagImgHtml(entry.code, entry.flag)}
                        <span class="mo-country-name">${entry.name}</span>
                        ${entry.isPlayer ? '<span class="mo-player-tag">YOU</span>' : ""}
                    </div>
                </td>
                <td class="col-medals badge-gold">${entry.gold}</td>
                <td class="col-medals badge-silver">${entry.silver}</td>
                <td class="col-medals badge-bronze">${entry.bronze}</td>
                <td class="col-medals" style="font-weight:800;">${entry.totalMedals}</td>
            `;
            tbody.appendChild(tr);
        });
    };

    // -------------------------------------------------------------
    // CLOSING CEREMONY & FINAL MEDAL PRESENTATION
    // -------------------------------------------------------------
    const displayFinalCeremony = async (data) => {
        showScreen("finalCeremony");

        const finalStandings = data.standings;
        const goldNation = finalStandings[0];
        const silverNation = finalStandings[1];
        const bronzeNation = finalStandings[2];

        // Podium Populate
        podiumGoldFlag.innerHTML = getFlagImgHtml(goldNation.code, goldNation.flag, "xl");
        podiumGoldName.textContent = goldNation.name;
        podiumGoldMedals.textContent = `${goldNation.gold}G • ${goldNation.silver}S • ${goldNation.bronze}B`;

        podiumSilverFlag.innerHTML = getFlagImgHtml(silverNation.code, silverNation.flag, "xl");
        podiumSilverName.textContent = silverNation.name;
        podiumSilverMedals.textContent = `${silverNation.gold}G • ${silverNation.silver}S • ${silverNation.bronze}B`;

        podiumBronzeFlag.innerHTML = getFlagImgHtml(bronzeNation.code, bronzeNation.flag, "xl");
        podiumBronzeName.textContent = bronzeNation.name;
        podiumBronzeMedals.textContent = `${bronzeNation.gold}G • ${bronzeNation.silver}S • ${bronzeNation.bronze}B`;

        // Highlight Player Finish
        const playerFinal = finalStandings.find((s) => s.isPlayer);
        const goldXp = (playerFinal?.gold || 0) * 30;
        const silverXp = (playerFinal?.silver || 0) * 20;
        const bronzeXp = (playerFinal?.bronze || 0) * 10;
        const totalXpEarned = 30 + goldXp + silverXp + bronzeXp;

        playerFinalSummary.innerHTML = `
            <span class="info-icon">${playerFinal.rank <= 3 ? "🏆" : "🎖️"}</span>
            <div class="info-content" style="flex: 1; min-width: 0; text-align: left;">
                <div style="display:inline-flex; align-items:center; gap:8px; margin-bottom:6px; flex-wrap:wrap;">
                    ${getFlagImgHtml(competition.playerCountry.code, competition.playerCountry.flag)}
                    <span style="font-size:16px; font-weight:800; color:#ffffff;">${competition.playerCountry.name}: Finished ${playerFinal.rank}${getOrdinal(playerFinal.rank)} Worldwide!</span>
                </div>
                <div style="font-size:13px; color:#e0e8f0; line-height:1.6; margin-bottom:8px;">
                    Medals Earned: <strong style="color:var(--gold);">${playerFinal.gold} Gold</strong>, <strong style="color:#cbd5e1;">${playerFinal.silver} Silver</strong>, <strong style="color:#f59e0b;">${playerFinal.bronze} Bronze</strong> (${playerFinal.totalMedals} total medals). Overall Champions: <strong style="color:#ffffff;">${goldNation.name}</strong>.
                </div>
                <div>
                    <span style="display:inline-flex; align-items:center; gap:6px; padding:4px 12px; background:rgba(0,200,255,0.12); border:1px solid rgba(0,200,255,0.35); border-radius:6px; font-weight:800; color:var(--gold); font-size:13px;">
                        ⚡ +${totalXpEarned} XP Earned (30 base + ${goldXp + silverXp + bronzeXp} medals)
                    </span>
                </div>
            </div>
        `;

        // Render Complete 16-Country Final Medal Table
        renderStandingsTable(finalStandingsBody, finalStandings);

        // Optionally persist to DB
        try {
            await window.GamingSession.fetch(`${API_BASE}/competition/complete`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ competitionId: competition.competitionId })
            });
        } catch (_e) {}
    };

    const getOrdinal = (n) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return s[(v - 20) % 10] || s[v] || s[0];
    };

    // Play Again button
    btnPlayAgain.addEventListener("click", () => {
        const prevCountry = selectedCountry || competition?.playerCountry;
        competition = null;
        btnStartGames.disabled = false;
        btnStartGames.innerHTML = 'CONFIRM & ENTER ARENA <span>➔</span>';
        showScreen("countrySelect");
        if (allCountries.length === 0) {
            loadCountries().then(() => {
                if (prevCountry) selectCountry(prevCountry);
            });
        } else {
            renderCountriesList(allCountries);
            if (prevCountry) {
                selectCountry(prevCountry);
            }
        }
    });
});

