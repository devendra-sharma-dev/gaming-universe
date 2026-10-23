"use strict";

/**
 * PUZZLE QUEST: MAIN CONTROLLER & ROUTER
 * Orchestrates screens (Landing, Map, Game), session check,
 * and high-level navigation.
 */

window.PuzzleQuest = (() => {
    let currentScreen = "landing";

    function showScreen(screenName) {
        currentScreen = screenName;
        const screens = ["landing", "map", "game"];

        screens.forEach(s => {
            const el = document.getElementById(`screen-${s}`);
            if (el) {
                if (s === screenName) {
                    el.classList.add("active");
                } else {
                    el.classList.remove("active");
                }
            }
        });

        // Trigger map render when switching to map
        if (screenName === "map" && window.PuzzleMap) {
            window.PuzzleMap.renderMap();
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function initPlayerSession() {
        try {
            if (window.GamingSession?.ready) {
                await window.GamingSession.ready;
            }
            const origin = window.GamingSession?.apiOrigin || "";
            const resp = await window.GamingSession.fetch(`${origin}/api/v1/users/me`);
            if (resp.ok) {
                const json = await resp.json();
                const user = json.data?.user || json.data;
                const name = user?.username;
                if (name) {
                    const playerNameEl = document.getElementById("pq-player-name");
                    if (playerNameEl) playerNameEl.textContent = `@${name}`;
                    const allPlayerEls = document.querySelectorAll(".player-name");
                    allPlayerEls.forEach(el => { el.textContent = `@${name}`; });
                    const statusDot = document.querySelector(".player-status");
                    if (statusDot) statusDot.classList.add("is-active");
                }
            }
        } catch (_e) {
            // Keep default guest state
        }
    }

    async function init() {
        console.log("Initializing Clever Chaos: 50 Challenges...");

        // Check player session & update username in header
        initPlayerSession();

        const playerMenuBtn = document.getElementById("player-menu-button");
        if (playerMenuBtn) {
            playerMenuBtn.addEventListener("click", () => {
                window.location.href = "./index.html";
            });
            playerMenuBtn.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    window.location.href = "./index.html";
                }
            });
        }

        // Hook Navigation Buttons immediately
        const resumeBtn = document.getElementById("pq-landing-resume-btn");
        if (resumeBtn) {
            resumeBtn.onclick = () => {
                const progress = window.PuzzleQuestProgress ? window.PuzzleQuestProgress.getProgress() : { resumeLevel: 1 };
                const targetLvl = (progress && progress.resumeLevel) ? progress.resumeLevel : 1;
                if (window.PuzzleShell) {
                    window.PuzzleShell.startLevel(targetLvl);
                }
            };
        }

        const viewMapBtn = document.getElementById("pq-landing-map-btn");
        if (viewMapBtn) {
            viewMapBtn.onclick = () => {
                showScreen("map");
            };
        }

        const mapBackBtn = document.getElementById("pq-map-back-btn");
        if (mapBackBtn) {
            mapBackBtn.onclick = () => {
                showScreen("landing");
            };
        }

        const gameMapBtn = document.getElementById("pq-game-back-map");
        if (gameMapBtn) {
            gameMapBtn.onclick = () => {
                showScreen("map");
            };
        }

        // Initialize progress & session in background
        if (window.PuzzleQuestProgress) {
            try {
                await window.PuzzleQuestProgress.init();
            } catch (err) {
                console.warn("Could not load remote progress, using in-memory guest mode:", err);
            }
        }

        // Default screen: Landing
        showScreen("landing");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    return {
        showScreen,
        init
    };
})();

