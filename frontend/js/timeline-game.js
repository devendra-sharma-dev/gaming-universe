"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const host = window.location.hostname === "127.0.0.1" ? "127.0.0.1" : "localhost";
    const API = `${window.GamingSession.apiOrigin}/api/v1`;
    const track = document.querySelector("#timeline-track");
    const drawer = document.querySelector("#timeline-cards");
    const submit = document.querySelector("#timeline-submit");
    const next = document.querySelector("#timeline-next");
    const status = document.querySelector("#timeline-status");
    const score = document.querySelector("#timeline-score");
    const progress = document.querySelector("#timeline-progress");
    const result = document.querySelector("#timeline-result");
    let daily; let roundIndex = 0; let placing = []; let drawerOrder = []; let locked = false;

    // Auto-scroll controller for drag operations
    let autoScrollRaf = null;
    let autoScrollSpeed = 0;

    const startAutoScroll = (speed) => {
        autoScrollSpeed = speed;
        if (autoScrollRaf) return;
        const step = () => {
            if (autoScrollSpeed !== 0) {
                window.scrollBy(0, autoScrollSpeed);
                autoScrollRaf = requestAnimationFrame(step);
            } else {
                autoScrollRaf = null;
            }
        };
        autoScrollRaf = requestAnimationFrame(step);
    };

    const stopAutoScroll = () => {
        autoScrollSpeed = 0;
        if (autoScrollRaf) {
            cancelAnimationFrame(autoScrollRaf);
            autoScrollRaf = null;
        }
    };

    const checkAutoScroll = (clientY) => {
        const threshold = 85;
        const viewportHeight = window.innerHeight;
        if (clientY < threshold) {
            // Slow, controllable scroll up
            const intensity = Math.min(1, Math.max(0, (threshold - clientY) / threshold));
            const speed = -Math.round(3 + intensity * 4);
            startAutoScroll(speed);
        } else if (clientY > viewportHeight - threshold) {
            // Slow, controllable scroll down
            const intensity = Math.min(1, Math.max(0, (clientY - (viewportHeight - threshold)) / threshold));
            const speed = Math.round(3 + intensity * 4);
            startAutoScroll(speed);
        } else {
            stopAutoScroll();
        }
    };

    window.addEventListener("dragover", (e) => {
        if (!locked) checkAutoScroll(e.clientY);
    });
    window.addEventListener("dragend", stopAutoScroll);
    window.addEventListener("drop", stopAutoScroll);

    const api = async (path, options = {}) => {
        const response = await window.GamingSession.fetch(`${API}${path}`, { credentials: "include", headers: { "Content-Type": "application/json" }, ...options });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error?.message || "The timeline could not be reached.");
        return body.data;
    };

    const unpackEvent = (event) => {
        if (Array.isArray(event)) return unpackEvent(event[0]);
        return event?.event || event?._doc || event;
    };

    const activeEvents = () => (daily.rounds[roundIndex].events || []).map(unpackEvent).filter(Boolean);

    const shuffle = (items) => {
        const shuffled = [...items];
        for (let index = shuffled.length - 1; index > 0; index -= 1) {
            const target = Math.floor(Math.random() * (index + 1));
            [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
        }
        return shuffled;
    };

    const placedCount = () => placing.filter(Boolean).length;

    const escapeAttr = (str) => String(str || "").replace(/"/g, "&quot;");

    const eventCard = (event, placed = false) => `
        <article class="timeline-event-card ${placed ? "is-placed" : ""}" draggable="${locked ? "false" : "true"}" data-event-id="${event.id}">
            <span>${event.category}</span>
            <h3>${event.title}</h3>
            <p title="${escapeAttr(event.description)}">${event.description}</p>
        </article>
    `;

    const renderBoard = () => {
        const unplaced = drawerOrder.filter((event) => !placing.some((placed) => placed?.id === event.id));
        track.innerHTML = [0, 1, 2, 3].map((index) => `
            <div class="timeline-slot ${index % 2 === 0 ? "is-top" : "is-bottom"}" data-slot="${index}">
                <span class="timeline-node">${index + 1}</span>
                ${placing[index] ? eventCard(placing[index], true) : "<div class=\"timeline-drop\">DROP EVENT</div>"}
            </div>
        `).join("");
        drawer.innerHTML = unplaced.map((event) => eventCard(event, false)).join("");
        submit.disabled = locked || placedCount() !== 4;
        bindDrag();
    };

    const move = (eventId, target) => {
        if (locked) return;
        const event = activeEvents().find((item) => item.id === eventId);
        const from = placing.findIndex((item) => item?.id === eventId);
        if (!event || from === target) return;
        const displaced = placing[target];
        placing[target] = event;
        if (from >= 0) placing[from] = displaced;
        renderBoard();
    };

    const returnToDrawer = (eventId) => {
        const from = placing.findIndex((item) => item?.id === eventId);
        if (!locked && from >= 0) {
            placing[from] = undefined;
            renderBoard();
        }
    };

    const activateDropTarget = (element, onDrop) => {
        element.addEventListener("dragover", (event) => {
            if (!locked) {
                event.preventDefault();
                element.classList.add("is-over");
            }
        });
        element.addEventListener("dragleave", () => element.classList.remove("is-over"));
        element.addEventListener("drop", (event) => {
            event.preventDefault();
            element.classList.remove("is-over");
            stopAutoScroll();
            onDrop(event.dataTransfer.getData("text/plain"));
        });
    };

    // Mobile touch dragging state
    let activeTouchDrag = null;

    const cleanupTouchDrag = () => {
        if (!activeTouchDrag) return;
        stopAutoScroll();
        if (activeTouchDrag.ghost && activeTouchDrag.ghost.parentNode) {
            activeTouchDrag.ghost.remove();
        }
        if (activeTouchDrag.element) {
            activeTouchDrag.element.classList.remove("is-dragging");
        }
        document.querySelectorAll(".timeline-slot.is-over, #timeline-cards.is-over").forEach((el) => el.classList.remove("is-over"));
        activeTouchDrag = null;
    };

    const bindTouchDrag = () => {
        document.querySelectorAll(".timeline-event-card").forEach((card) => {
            if (locked) return;

            let startX = 0;
            let startY = 0;
            let isDragging = false;
            let startTime = 0;

            const onTouchStart = (e) => {
                if (locked || e.touches.length !== 1) return;
                const touch = e.touches[0];
                startX = touch.clientX;
                startY = touch.clientY;
                startTime = Date.now();
                isDragging = false;
            };

            const onTouchMove = (e) => {
                if (locked || e.touches.length !== 1) return;
                const touch = e.touches[0];
                const dx = touch.clientX - startX;
                const dy = touch.clientY - startY;
                const dist = Math.hypot(dx, dy);

                if (!isDragging) {
                    if (dist > 8) {
                        isDragging = true;
                        card.classList.add("is-dragging");
                        if (navigator.vibrate) {
                            try { navigator.vibrate(15); } catch {}
                        }
                        const ghost = card.cloneNode(true);
                        ghost.classList.add("timeline-drag-ghost");
                        ghost.classList.remove("is-dragging");
                        ghost.style.left = `${touch.clientX}px`;
                        ghost.style.top = `${touch.clientY}px`;
                        document.body.appendChild(ghost);

                        activeTouchDrag = {
                            element: card,
                            eventId: card.dataset.eventId,
                            ghost
                        };
                    }
                }

                if (isDragging && activeTouchDrag) {
                    if (e.cancelable) e.preventDefault();
                    activeTouchDrag.ghost.style.left = `${touch.clientX}px`;
                    activeTouchDrag.ghost.style.top = `${touch.clientY}px`;

                    checkAutoScroll(touch.clientY);

                    activeTouchDrag.ghost.style.display = "none";
                    const targetUnder = document.elementFromPoint(touch.clientX, touch.clientY);
                    activeTouchDrag.ghost.style.display = "";

                    document.querySelectorAll(".timeline-slot.is-over, #timeline-cards.is-over").forEach((el) => el.classList.remove("is-over"));
                    if (targetUnder) {
                        const slot = targetUnder.closest(".timeline-slot");
                        const drawerEl = targetUnder.closest("#timeline-cards");
                        if (slot) {
                            slot.classList.add("is-over");
                        } else if (drawerEl) {
                            drawerEl.classList.add("is-over");
                        }
                    }
                }
            };

            let lastTouchTime = 0;
            const handleCardActivate = () => {
                if (locked) return;
                const eventId = card.dataset.eventId;
                const fromSlot = [0, 1, 2, 3].findIndex((s) => placing[s]?.id === eventId);
                if (fromSlot >= 0) {
                    returnToDrawer(eventId);
                } else {
                    const firstEmpty = [0, 1, 2, 3].findIndex((s) => !placing[s]);
                    if (firstEmpty >= 0) {
                        move(eventId, firstEmpty);
                        if (navigator.vibrate) {
                            try { navigator.vibrate(20); } catch {}
                        }
                    }
                }
            };

            const onTouchEnd = (e) => {
                if (isDragging && activeTouchDrag) {
                    if (e.cancelable) e.preventDefault();
                    const touch = e.changedTouches[0];
                    activeTouchDrag.ghost.style.display = "none";
                    const targetUnder = document.elementFromPoint(touch.clientX, touch.clientY);
                    const eventId = activeTouchDrag.eventId;

                    cleanupTouchDrag();

                    if (targetUnder) {
                        const slot = targetUnder.closest(".timeline-slot");
                        const drawerEl = targetUnder.closest("#timeline-cards");
                        if (slot) {
                            move(eventId, Number(slot.dataset.slot));
                            if (navigator.vibrate) {
                                try { navigator.vibrate(25); } catch {}
                            }
                        } else if (drawerEl) {
                            returnToDrawer(eventId);
                        }
                    }
                } else if (!isDragging && Date.now() - startTime < 450) {
                    lastTouchTime = Date.now();
                    handleCardActivate();
                }
            };

            card.addEventListener("touchstart", onTouchStart, { passive: true });
            card.addEventListener("touchmove", onTouchMove, { passive: false });
            card.addEventListener("touchend", onTouchEnd, { passive: false });
            card.addEventListener("touchcancel", cleanupTouchDrag);
            card.addEventListener("click", () => {
                if (Date.now() - lastTouchTime < 450) return;
                handleCardActivate();
            });
        });
    };

    const bindDrag = () => {
        // Desktop HTML5 drag
        document.querySelectorAll(".timeline-event-card[draggable='true']").forEach((element) => {
            element.addEventListener("dragstart", (event) => {
                event.dataTransfer.setData("text/plain", element.dataset.eventId);
                element.classList.add("is-dragging");
            });
            element.addEventListener("dragend", () => {
                element.classList.remove("is-dragging");
                stopAutoScroll();
            });
        });
        document.querySelectorAll(".timeline-slot").forEach((slot) => activateDropTarget(slot, (eventId) => move(eventId, Number(slot.dataset.slot))));
        activateDropTarget(drawer, returnToDrawer);

        // Mobile touch drag
        bindTouchDrag();
    };

    const renderRound = () => {
        const round = daily.rounds[roundIndex];
        placing = [];
        drawerOrder = shuffle(activeEvents());
        locked = false;
        result.hidden = true;
        next.hidden = true;
        submit.hidden = false;
        document.querySelector("#timeline-category").textContent = [...new Set(activeEvents().map((event) => event.category))].join(" / ");
        progress.textContent = `ROUND ${roundIndex + 1} OF ${daily.roundsTotal}`;
        status.textContent = "Move events freely between points or back to the drawer before locking your answer.";
        renderBoard();
    };

    const showOutcome = (outcome) => {
        locked = true;
        stopAutoScroll();
        document.querySelectorAll(".timeline-slot").forEach((slot, index) => {
            const correct = placing[index].id === outcome.solution[index].id;
            slot.classList.add(correct ? "is-correct" : "is-wrong");
            const cardElement = slot.querySelector(".timeline-event-card");
            if (cardElement) {
                cardElement.classList.add(correct ? "is-correct" : "is-wrong");
                const color = correct ? "#70f2a2" : "#ff5269";
                cardElement.style.border = `2px solid ${color}`;
                cardElement.style.boxShadow = `0 0 32px ${color}`;
                cardElement.style.animationDelay = `${index * 110}ms`;
                cardElement.classList.add("is-revealed");
            }
        });
        result.hidden = false;
        result.innerHTML = `<div class="timeline-result-heading"><div><span>ROUND REVIEW</span><h2>${outcome.correctPositions === 4 ? "Perfect sequence" : "Order revealed"}</h2><p>${outcome.correctPositions} of 4 moments landed in the right place. Here is the verified timeline.</p></div><div class="timeline-xp-badge"><strong>+${outcome.xpEarned}</strong><span>XP EARNED</span></div></div><ol class="timeline-solution">${outcome.solution.map((event, index) => `<li><span class="solution-index">${String(index + 1).padStart(2, "0")}</span><div><time>${event.date}</time><strong>${event.title}</strong><p>${event.description}</p></div></li>`).join("")}</ol>`;
    };

    const showDailyComplete = (outcome) => {
        document.querySelector("#timeline-complete-popup")?.remove();
        document.querySelector("#timeline-complete-backdrop")?.remove();
        const closePopup = () => {
            document.querySelector("#timeline-complete-popup")?.remove();
            document.querySelector("#timeline-complete-backdrop")?.remove();
        };
        const backdrop = document.createElement("div");
        backdrop.id = "timeline-complete-backdrop";
        backdrop.className = "timeline-complete-backdrop";

        const popup = document.createElement("section");
        popup.id = "timeline-complete-popup";
        popup.className = "game-result-panel timeline-complete-popup";
        popup.setAttribute("role", "dialog");
        popup.setAttribute("aria-modal", "true");
        popup.setAttribute("aria-labelledby", "timeline-complete-title");
        popup.innerHTML = `<button class="game-result-close" type="button" aria-label="Close daily summary">&times;</button><div class="timeline-complete-mark" aria-hidden="true">✓</div><span class="result-kicker">DAILY CHALLENGE COMPLETE</span><h2 id="timeline-complete-title">A day well played.</h2><p>You completed all five timeline rounds.</p><div class="timeline-final-score"><span>FINAL SCORE</span><strong>${daily.totalScore} <small>/ 200 XP</small></strong></div><div class="result-actions"><a class="game-action-button" href="./index.html">EXPLORE MORE GAMES</a></div>`;
        popup.querySelector(".game-result-close").addEventListener("click", closePopup);

        backdrop.addEventListener("click", (e) => {
            if (e.target === backdrop) closePopup();
        });

        backdrop.appendChild(popup);
        document.body.appendChild(backdrop);
    };

    const load = async () => {
        try {
            const user = await api("/users/me");
            document.querySelector("#timeline-player-name").textContent = `@${(user.user || user).username}`;
            daily = await api("/timeline/daily");
            score.textContent = `${daily.totalScore} / 200 XP`;
            roundIndex = daily.rounds.findIndex((round) => !round.completed);
            if (roundIndex < 0) {
                progress.textContent = "DAILY COMPLETE";
                status.textContent = "You have completed all five rounds. Return tomorrow for fresh events.";
                submit.hidden = true;
                next.hidden = true;
                const divider = document.querySelector(".timeline-divider");
                if (divider) divider.hidden = true;
                drawer.innerHTML = "";
                track.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 36px 18px;">
                        <div class="timeline-complete-mark" style="margin: 0 auto 16px;">✓</div>
                        <h3 style="font-size: clamp(22px, 4vw, 28px); margin-bottom: 8px; color: #fff;">All 5 Rounds Completed</h3>
                        <p style="color: rgba(255,255,255,0.7); font-size: 14px; margin-bottom: 22px;">Final score today: <strong style="color: var(--color-cyan); font-size: 20px;">${daily.totalScore} / 200 XP</strong></p>
                        <button id="timeline-reopen-modal" class="game-action-button" type="button">VIEW SUMMARY</button>
                    </div>
                `;
                document.querySelector("#timeline-reopen-modal")?.addEventListener("click", () => showDailyComplete());
                showDailyComplete();
                return;
            }
            renderRound();
        } catch (error) {
            status.textContent = error.message === "Authentication required." ? "Sign in from the home page to start Timeline." : error.message;
        }
    };

    submit.addEventListener("click", async () => {
        if (locked || placedCount() !== 4) return;
        submit.disabled = true;
        try {
            const outcome = await api(`/timeline/daily/rounds/${roundIndex}`, { method: "POST", body: JSON.stringify({ eventIds: placing.map((event) => event.id) }) });
            daily.totalScore += outcome.xpEarned;
            score.textContent = `${daily.totalScore} / 200 XP`;
            status.textContent = `${outcome.correctPositions} of 4 positions correct. Review the sequence below.`;
            showOutcome(outcome);
            submit.hidden = true;
            if (outcome.dailyComplete) {
                progress.textContent = "DAILY COMPLETE";
                status.textContent = "All five rounds complete. A fresh timeline arrives tomorrow.";
                showDailyComplete(outcome);
            } else {
                next.hidden = false;
            }
        } catch (error) {
            status.textContent = error.message;
            submit.disabled = false;
        }
    });

    next.addEventListener("click", () => {
        daily.rounds[roundIndex].completed = true;
        roundIndex += 1;
        renderRound();
    });

    load();
});
