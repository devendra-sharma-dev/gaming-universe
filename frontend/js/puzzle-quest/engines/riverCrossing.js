"use strict";

/**
 * ENGINE: River Crossing & Bridge Transport
 * Level 11: Fox, Goose & Beans
 * Level 35: Bridge and Torch (1, 2, 5, 8 min -> 15 min)
 * Level 36: Three Jealous Animal Pairs (Option A)
 */

window.PuzzleEngines = window.PuzzleEngines || {};

window.PuzzleEngines.riverCrossing = {
    init: (container, puzzle, shell) => {
        const variant = puzzle.config.variant || "foxGooseBeans";
        const isBridge = (variant === "bridgeTorch");

        // Initial entities setup
        let entities = [];
        let boatCapacity = 2;
        let boatPosition = "left"; // "left" or "right"
        let inBoat = [];
        let leftBank = [];
        let rightBank = [];
        let elapsedMinutes = 0; // For Bridge & Torch

        if (variant === "foxGooseBeans") {
            entities = [
                { id: "farmer", name: "Farmer", icon: "👨‍🌾", isDriver: true, bg: "#3b82f6" },
                { id: "fox", name: "Fox", icon: "🦊", bg: "#f97316" },
                { id: "goose", name: "Goose", icon: "🪿", bg: "#eab308" },
                { id: "beans", name: "Beans", icon: "🫘", bg: "#22c55e" }
            ];
            leftBank = entities.map(e => e.id);
            boatCapacity = 2; // Farmer + 1 item
        } else if (variant === "bridgeTorch") {
            entities = [
                { id: "p1", name: "Speedy (1m)", icon: "🏃", time: 1, bg: "#38bdf8" },
                { id: "p2", name: "Brisk (2m)", icon: "🚶", time: 2, bg: "#4ade80" },
                { id: "p5", name: "Steady (5m)", icon: "🧓", time: 5, bg: "#fbbf24" },
                { id: "p8", name: "Slow (8m)", icon: "🐢", time: 8, bg: "#f87171" }
            ];
            leftBank = entities.map(e => e.id);
            boatCapacity = 2;
        } else if (variant === "jealousPairs") {
            entities = [
                { id: "A", name: "Lion A", icon: "🦁", isDominant: true, pair: "A", bg: "#ef4444" },
                { id: "a", name: "Cub a", icon: "🐱", isDominant: false, pair: "A", bg: "#fca5a5" },
                { id: "B", name: "Bear B", icon: "🐻", isDominant: true, pair: "B", bg: "#3b82f6" },
                { id: "b", name: "Cub b", icon: "🐻‍❄️", isDominant: false, pair: "B", bg: "#93c5fd" },
                { id: "C", name: "Wolf C", icon: "🐺", isDominant: true, pair: "C", bg: "#10b981" },
                { id: "c", name: "Pup c", icon: "🐶", isDominant: false, pair: "C", bg: "#6ee7b7" }
            ];
            leftBank = entities.map(e => e.id);
            boatCapacity = 2;
        }

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; width: 100%;">
                ${isBridge ? `
                    <div style="font-size: 14px; font-weight: 800; color: var(--gold); margin-bottom: 12px; letter-spacing: 0.5px;">
                        ELAPSED BRIDGE TIME: <span id="pq-torch-time" style="color:var(--cyan); font-size:18px; font-family:monospace;">0</span> MIN
                    </div>
                ` : ""}

                <div class="pq-river-scroll-wrapper">
                    <div class="pq-river-scene ${isBridge ? "is-bridge" : ""}">
                        <!-- Left Bank / Near Side -->
                        <div class="pq-river-bank ${isBridge ? "is-bridge" : ""}" id="pq-bank-left">
                            <span style="font-size: 11px; font-weight: 900; color: var(--silver); text-transform: uppercase; letter-spacing: 0.5px;">
                                ${isBridge ? "NEAR SIDE (START)" : "LEFT BANK (START)"}
                            </span>
                            ${isBridge ? `
                                <div id="pq-torch-indicator-left" style="font-size: 11px; font-weight: 800; color: #f59e0b; display: flex; align-items: center; gap: 4px;">
                                    🔥 TORCH HERE
                                </div>
                            ` : ""}
                            <div id="pq-left-items" class="pq-bank-items"></div>
                        </div>

                        <!-- River Water / Bridge Span -->
                        <div class="pq-river-water ${isBridge ? "is-bridge" : ""}">
                            <div class="pq-river-boat left ${isBridge ? "is-bridge" : ""}" id="pq-boat">
                                <span id="pq-boat-passengers" style="display: flex; align-items: center; gap: 6px;"></span>
                            </div>
                        </div>

                        <!-- Right Bank / Far Side -->
                        <div class="pq-river-bank ${isBridge ? "is-bridge" : ""}" id="pq-bank-right">
                            <span style="font-size: 11px; font-weight: 900; color: var(--silver); text-transform: uppercase; letter-spacing: 0.5px;">
                                ${isBridge ? "FAR SIDE (GOAL)" : "RIGHT BANK (GOAL)"}
                            </span>
                            ${isBridge ? `
                                <div id="pq-torch-indicator-right" style="font-size: 11px; font-weight: 800; color: #f59e0b; display: none; align-items: center; gap: 4px;">
                                    🔥 TORCH HERE
                                </div>
                            ` : ""}
                            <div id="pq-right-items" class="pq-bank-items"></div>
                        </div>
                    </div>
                </div>

                <div style="display: flex; gap: 14px; margin-top: 18px;">
                    <button id="pq-boat-cross" class="pq-btn pq-btn-gold" type="button">
                        ${isBridge ? "CROSS BRIDGE 🌉" : "CROSS RIVER"}
                    </button>
                </div>

                <div id="pq-river-feedback" style="min-height: 24px; margin-top: 10px; font-size: 13px; font-weight: 700; text-align: center;"></div>
            </div>
        `;

        const boatEl = container.querySelector("#pq-boat");
        const crossBtn = container.querySelector("#pq-boat-cross");
        const leftItemsEl = container.querySelector("#pq-left-items");
        const rightItemsEl = container.querySelector("#pq-right-items");
        const boatPassEl = container.querySelector("#pq-boat-passengers");
        const feedbackEl = container.querySelector("#pq-river-feedback");
        const torchTimeEl = container.querySelector("#pq-torch-time");
        const torchLeftEl = container.querySelector("#pq-torch-indicator-left");
        const torchRightEl = container.querySelector("#pq-torch-indicator-right");

        function render() {
            leftItemsEl.innerHTML = "";
            rightItemsEl.innerHTML = "";
            boatPassEl.innerHTML = "";

            boatEl.className = `pq-river-boat ${boatPosition} ${isBridge ? "is-bridge" : ""}`;

            // Torch location indicators
            if (isBridge && torchLeftEl && torchRightEl) {
                torchLeftEl.style.display = (boatPosition === "left") ? "flex" : "none";
                torchRightEl.style.display = (boatPosition === "right") ? "flex" : "none";
            }

            // Left bank / Near side items
            leftBank.forEach(id => {
                const ent = entities.find(e => e.id === id);
                const chip = document.createElement("div");
                chip.className = "pq-entity-chip in-bank";
                chip.style.background = ent.bg;
                chip.innerHTML = `<span>${ent.icon}</span> <span>${ent.name}</span>`;
                chip.onclick = () => onEntityClick(id, "left");
                leftItemsEl.appendChild(chip);
            });

            // Right bank / Far side items
            rightBank.forEach(id => {
                const ent = entities.find(e => e.id === id);
                const chip = document.createElement("div");
                chip.className = "pq-entity-chip in-bank";
                chip.style.background = ent.bg;
                chip.innerHTML = `<span>${ent.icon}</span> <span>${ent.name}</span>`;
                chip.onclick = () => onEntityClick(id, "right");
                rightItemsEl.appendChild(chip);
            });

            // Boat / Bridge items
            if (isBridge) {
                const torchIcon = document.createElement("span");
                torchIcon.innerHTML = "🔥";
                torchIcon.title = "Torch";
                torchIcon.style.cssText = "font-size: 20px; filter: drop-shadow(0 0 6px #f59e0b); margin-right: 2px;";
                boatPassEl.appendChild(torchIcon);
            }

            inBoat.forEach(id => {
                const ent = entities.find(e => e.id === id);
                const chip = document.createElement("div");
                chip.className = "pq-entity-chip in-boat";
                chip.style.background = ent.bg;
                chip.innerHTML = `<span>${ent.icon}</span>`;
                chip.title = ent.name;
                chip.onclick = () => onEntityClick(id, "boat");
                boatPassEl.appendChild(chip);
            });

            if (torchTimeEl) { torchTimeEl.innerText = elapsedMinutes; torchTimeEl.style.color = (elapsedMinutes > 15) ? "var(--crimson)" : "var(--cyan)"; }
        }

        function onEntityClick(id, location) {
            feedbackEl.innerText = "";

            if (location === "boat") {
                // Return to current bank / side
                inBoat = inBoat.filter(x => x !== id);
                if (boatPosition === "left") leftBank.push(id);
                else rightBank.push(id);
                render();
            } else if (location === boatPosition) {
                // Board boat / bridge if space available
                if (inBoat.length >= boatCapacity) {
                    feedbackEl.innerHTML = `<span style="color:var(--crimson);">${isBridge ? "The fragile bridge holds at most 2 people!" : `The boat is already full (Capacity: ${boatCapacity})!`}</span>`;
                    return;
                }

                if (variant === "foxGooseBeans") {
                    // Must be farmer or farmer must board
                    if (id !== "farmer" && inBoat.includes("farmer") && inBoat.length >= 2) {
                        feedbackEl.innerHTML = `<span style="color:var(--crimson);">Farmer can only take ONE companion at a time!</span>`;
                        return;
                    }
                }

                if (location === "left") leftBank = leftBank.filter(x => x !== id);
                else rightBank = rightBank.filter(x => x !== id);

                inBoat.push(id);
                render();
            }
        }

        crossBtn.onclick = () => {
            feedbackEl.innerText = "";

            if (inBoat.length === 0) {
                feedbackEl.innerHTML = `<span style="color:var(--crimson);">${isBridge ? "At least one traveler must carry the torch across the bridge!" : "The boat cannot row itself! At least one passenger must row."}</span>`;
                return;
            }

            if (variant === "foxGooseBeans" && !inBoat.includes("farmer")) {
                feedbackEl.innerHTML = `<span style="color:var(--crimson);">The Farmer must be in the boat to row!</span>`;
                return;
            }

            // Move boat / travelers across bridge
            const fromBank = boatPosition === "left" ? leftBank : rightBank;
            const toBank = boatPosition === "left" ? rightBank : leftBank;

            // Check safety of the bank being LEFT UNATTENDED
            if (variant === "foxGooseBeans") {
                if (fromBank.includes("fox") && fromBank.includes("goose") && !fromBank.includes("farmer")) {
                    shell.failLevel("Disaster! The Fox was left alone with the Goose and ate it!");
                    return;
                }
                if (fromBank.includes("goose") && fromBank.includes("beans") && !fromBank.includes("farmer")) {
                    shell.failLevel("Disaster! The Goose was left alone with the Beans and ate them!");
                    return;
                }
            } else if (variant === "jealousPairs") {
                // Option A: check safety of fromBank and boat
                if (!checkOptionASafety(fromBank) || !checkOptionASafety(inBoat)) {
                    shell.failLevel("Safety violation! A companion was left unattended in the presence of a dominant animal of another species!");
                    return;
                }
            } else if (variant === "bridgeTorch") {
                const tripTime = Math.max(...inBoat.map(id => entities.find(e => e.id === id).time));
                elapsedMinutes += tripTime;
            }

            boatPosition = boatPosition === "left" ? "right" : "left";
            shell.incrementMoves();
            render();

            // After arrival, check safety of arrival bank (with boat passengers temporarily considered)
            const arrivalBank = boatPosition === "left" ? leftBank : rightBank;
            const fullArrival = [...arrivalBank, ...inBoat];
            if (variant === "jealousPairs") {
                if (!checkOptionASafety(fullArrival)) {
                    shell.failLevel("Safety violation upon landing! A companion is exposed to a foreign dominant animal!");
                    return;
                }
            }

            // Automatically unload boat / bridge party
            if (boatPosition === "left") {
                leftBank.push(...inBoat);
            } else {
                rightBank.push(...inBoat);
            }
            inBoat = [];
            render();

            // Check win/fail conditions
            if (variant === "bridgeTorch") {
                if (rightBank.length === entities.length) {
                    if (elapsedMinutes <= 15) {
                        feedbackEl.innerHTML = `<span style="color:var(--emerald); font-weight: 800;">✓ Optimal Crossing! Everyone made it across the bridge in ${elapsedMinutes} minutes!</span>`;
                        setTimeout(() => {
                            shell.completeLevel();
                        }, 900);
                    } else {
                        feedbackEl.innerHTML = `<span style="color:var(--crimson); font-weight: 800;">You have exceeded the optimal crossing time!</span>`;
                        setTimeout(() => {
                            shell.failLevel("You have exceeded the optimal crossing time! Find a faster strategy to cross the bridge.", "Challenge Failed");
                        }, 800);
                    }
                    return;
                }
                if (elapsedMinutes > 15) {
                    feedbackEl.innerHTML = `<span style="color:var(--crimson); font-weight: 800;">You have exceeded the optimal crossing time!</span>`;
                    setTimeout(() => {
                        shell.failLevel("You have exceeded the optimal crossing time! Find a faster strategy to cross the bridge.", "Challenge Failed");
                    }, 800);
                    return;
                }
            } else if (rightBank.length === entities.length) {
                feedbackEl.innerHTML = `<span style="color:var(--emerald); font-weight: 800;">✓ Journey complete! All passengers transported safely!</span>`;
                setTimeout(() => {
                    shell.completeLevel();
                }, 900);
            }
        };

        function checkOptionASafety(group) {
            const doms = group.filter(id => ["A", "B", "C"].includes(id));
            const comps = group.filter(id => ["a", "b", "c"].includes(id));
            for (const c of comps) {
                const partner = c.toUpperCase();
                if (!doms.includes(partner) && doms.length > 0) {
                    return false;
                }
            }
            return true;
        }

        function resetState() {
            boatPosition = "left";
            inBoat = [];
            leftBank = entities.map(e => e.id);
            rightBank = [];
            elapsedMinutes = 0;
            if (feedbackEl) feedbackEl.innerText = "";
            render();
        }

        shell.onReset = resetState;
        render();
    }
};

