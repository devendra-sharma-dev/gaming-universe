"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const host = window.location.hostname === "127.0.0.1" ? "127.0.0.1" : "localhost";
    const API = `${window.GAMING_UNIVERSE_API_ORIGIN || `http://${host}:5051`}/api/v1`;
    const track = document.querySelector("#timeline-track");
    const drawer = document.querySelector("#timeline-cards");
    const submit = document.querySelector("#timeline-submit");
    const next = document.querySelector("#timeline-next");
    const status = document.querySelector("#timeline-status");
    const score = document.querySelector("#timeline-score");
    const progress = document.querySelector("#timeline-progress");
    const result = document.querySelector("#timeline-result");
    let daily; let roundIndex = 0; let placing = []; let drawerOrder = []; let locked = false;

    const api = async (path, options = {}) => {
        const response = await fetch(`${API}${path}`, { credentials: "include", headers: { "Content-Type": "application/json" }, ...options });
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
    const eventCard = (event) => `<article class="timeline-event-card" draggable="${locked ? "false" : "true"}" data-event-id="${event.id}"><span>${event.category}</span><h3>${event.title}</h3><p>${event.description}</p></article>`;

    const renderBoard = () => {
        const unplaced = drawerOrder.filter((event) => !placing.some((placed) => placed?.id === event.id));
        track.innerHTML = [0, 1, 2, 3].map((index) => `<div class="timeline-slot ${index % 2 === 0 ? "is-top" : "is-bottom"}" data-slot="${index}"><span class="timeline-node">${index + 1}</span>${placing[index] ? eventCard(placing[index]) : "<div class=\"timeline-drop\">DROP EVENT</div>"}</div>`).join("");
        drawer.innerHTML = unplaced.map(eventCard).join("");
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
        if (!locked && from >= 0) { placing[from] = undefined; renderBoard(); }
    };
    const activateDropTarget = (element, onDrop) => {
        element.addEventListener("dragover", (event) => { if (!locked) { event.preventDefault(); element.classList.add("is-over"); } });
        element.addEventListener("dragleave", () => element.classList.remove("is-over"));
        element.addEventListener("drop", (event) => { event.preventDefault(); element.classList.remove("is-over"); onDrop(event.dataTransfer.getData("text/plain")); });
    };
    const bindDrag = () => {
        document.querySelectorAll(".timeline-event-card[draggable='true']").forEach((element) => {
            element.addEventListener("dragstart", (event) => { event.dataTransfer.setData("text/plain", element.dataset.eventId); element.classList.add("is-dragging"); });
            element.addEventListener("dragend", () => element.classList.remove("is-dragging"));
        });
        document.querySelectorAll(".timeline-slot").forEach((slot) => activateDropTarget(slot, (eventId) => move(eventId, Number(slot.dataset.slot))));
        activateDropTarget(drawer, returnToDrawer);
    };
    const renderRound = () => {
        const round = daily.rounds[roundIndex];
        placing = []; drawerOrder = shuffle(activeEvents()); locked = false; result.hidden = true; next.hidden = true; submit.hidden = false;
        document.querySelector("#timeline-category").textContent = [...new Set(activeEvents().map((event) => event.category))].join(" / ");
        progress.textContent = `ROUND ${roundIndex + 1} OF ${daily.roundsTotal}`;
        status.textContent = "Move events freely between points or back to the drawer before locking your answer.";
        renderBoard();
    };
    const showOutcome = (outcome) => {
        locked = true;
        document.querySelectorAll(".timeline-slot").forEach((slot, index) => {
            const correct = placing[index].id === outcome.solution[index].id;
            slot.classList.add(correct ? "is-correct" : "is-wrong");
            const cardElement = slot.querySelector(".timeline-event-card");
            cardElement?.classList.add(correct ? "is-correct" : "is-wrong");
            if (cardElement) {
                const color = correct ? "#70f2a2" : "#ff5269";
                cardElement.style.border = `2px solid ${color}`;
                cardElement.style.boxShadow = `0 0 32px ${color}`;
                cardElement.animate([{ transform: "scale(.94)" }, { transform: "scale(1.04)" }, { transform: "scale(1)" }], { duration: 620, delay: index * 120, easing: "ease-out", fill: "both" });
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
        backdrop.addEventListener("click", closePopup);
        const popup = document.createElement("section");
        popup.id = "timeline-complete-popup";
        popup.className = "game-result-panel timeline-complete-popup";
        popup.setAttribute("role", "dialog");
        popup.setAttribute("aria-modal", "true");
        popup.setAttribute("aria-labelledby", "timeline-complete-title");
        popup.innerHTML = `<button class="game-result-close" type="button" aria-label="Close daily summary">&times;</button><div class="timeline-complete-mark" aria-hidden="true">✓</div><span class="result-kicker">DAILY CHALLENGE COMPLETE</span><h2 id="timeline-complete-title">A day well played.</h2><p>You completed all five timeline rounds.</p><div class="timeline-final-score"><span>FINAL SCORE</span><strong>${daily.totalScore} <small>/ 200 XP</small></strong></div><div class="result-actions"><a class="game-action-button" href="./index.html">EXPLORE MORE GAMES</a></div>`;
        popup.querySelector(".game-result-close").addEventListener("click", closePopup);
        document.body.append(backdrop, popup);
    };
    
    const load = async () => {
        try {
            const user = await api("/users/me");
            document.querySelector("#timeline-player-name").textContent = `@${(user.user || user).username}`;
            daily = await api("/timeline/daily"); score.textContent = `${daily.totalScore} / 200 XP`;
            roundIndex = daily.rounds.findIndex((round) => !round.completed);
            if (roundIndex < 0) { progress.textContent = "DAILY COMPLETE"; status.textContent = "You have completed all five rounds. Return tomorrow for fresh events."; return; }
            renderRound();
        } catch (error) { status.textContent = error.message === "Authentication required." ? "Sign in from the home page to start Timeline." : error.message; }
    };
    submit.addEventListener("click", async () => {
        if (locked || placedCount() !== 4) return;
        submit.disabled = true;
        try {
            const outcome = await api(`/timeline/daily/rounds/${roundIndex}`, { method: "POST", body: JSON.stringify({ eventIds: placing.map((event) => event.id) }) });
            daily.totalScore += outcome.xpEarned; score.textContent = `${daily.totalScore} / 200 XP`;
            status.textContent = `${outcome.correctPositions} of 4 positions correct. Review the sequence below.`;
            showOutcome(outcome); submit.hidden = true;
            if (outcome.dailyComplete) { progress.textContent = "DAILY COMPLETE"; status.textContent = "All five rounds complete. A fresh timeline arrives tomorrow."; showDailyComplete(outcome); } else next.hidden = false;
        } catch (error) { status.textContent = error.message; submit.disabled = false; }
    });
    next.addEventListener("click", () => { daily.rounds[roundIndex].completed = true; roundIndex += 1; renderRound(); });
    load();
});
