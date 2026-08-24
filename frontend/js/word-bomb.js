"use strict";
document.addEventListener("DOMContentLoaded", () => {
    const host = window.location.hostname === "[::]" ? "[::]" : window.location.hostname || "localhost";
    const apiOrigin = `http://${host}:5051`;
    const socket = window.io(apiOrigin, { withCredentials: true });
    const gameCatalog = [{ id: "001", slug: "tic-tac-toe", title: "Tic Tac Toe", status: "LIVE" }, { id: "002", slug: "word-bomb", title: "Word Bomb", status: "LIVE" }];
    const $ = (id) => document.getElementById(id);
    const message = $("word-bomb-message"), sequence = $("word-bomb-sequence"), timer = $("word-bomb-timer"), turn = $("word-bomb-turn"), form = $("word-bomb-form"), input = $("word-bomb-input"), feed = $("word-bomb-feed"), lobby = $("word-bomb-lobby"), players = $("word-bomb-players"), start = $("word-bomb-start"), arena = $("word-bomb-arena"), orbit = $("word-bomb-orbit"), turnArrow = $("word-bomb-turn-arrow"), usedWords = $("word-bomb-used-words");
    let room = null; let timerId = null;
    const searchInput = $("game-search");
    const searchResults = $("game-search-results");
    searchInput?.addEventListener("input", () => {
        const query = searchInput.value.trim().toLowerCase();
        if (!query) { searchResults.hidden = true; searchResults.innerHTML = ""; return; }
        const matches = gameCatalog.filter((game) => game.title.toLowerCase().includes(query)).slice(0, 5);
        searchResults.innerHTML = matches.map((game) => `<a href="./${game.slug === "word-bomb" ? "word-bomb.html" : `game.html?game=${game.slug}`}" ><span>${game.id}</span><strong>${game.title}</strong><small>${game.status}</small></a>`).join("") || `<p class="search-empty">NO GAME FOUND</p>`;
        searchResults.hidden = false;
    });
    const render = (next) => { room = next; sequence.textContent = next.sequence || "—"; const roster = next.players || []; const step = roster.length ? 360 / roster.length : 360; const activeIndex = Math.max(0, roster.findIndex((p) => p.id === next.turnPlayerId)); const arrowAngle = activeIndex * step - 90; if (turnArrow) turnArrow.style.setProperty("--arrow-angle", `${arrowAngle}deg`); const nodeMarkup = roster.map((p, index) => { const angle = index * step - 90; return `<div class="orbit-player ${p.id === next.turnPlayerId ? "is-active" : ""}" style="--player-angle:${angle}deg;--counter-angle:${-angle}deg;"><strong>${p.username}</strong><span class="life-hearts">${"♥".repeat(p.lives)}${"💔".repeat(Math.max(0, 3 - p.lives))}</span></div>`; }).join(""); orbit.innerHTML = nodeMarkup; players.innerHTML = roster.map((p) => `<li><span>${p.username}</span><span class="life-hearts" aria-label="${p.lives} lives">${"♥".repeat(p.lives)}${"💔".repeat(Math.max(0, 3 - p.lives))}</span></li>`).join(""); usedWords.innerHTML = (next.usedWords || []).slice().reverse().map((word) => `<li>${word.toUpperCase()}</li>`).join("") || "<li class=used-empty>NO WORDS YET</li>"; lobby.hidden = !next.code || next.status !== "lobby"; start.hidden = !(next.code && roster.length >= 2 && next.hostId === roster.find((p) => p.id)?.id); const current = roster.find((p) => p.id === next.turnPlayerId); turn.textContent = next.status === "active" ? `${current?.username || "PLAYER"}'S TURN` : next.status === "lobby" ? `ROOM ${next.code}` : "MATCH COMPLETE"; clearInterval(timerId); if (next.status === "active") { timerId = setInterval(() => { const remain = Math.max(0, (next.deadline - Date.now()) / 1000); timer.textContent = remain.toFixed(1); }, 100); } else timer.textContent = "—"; };
    $("word-bomb-quick").onclick = () => { message.textContent = "Solo streak online."; socket.emit("word-bomb:solo-start"); };
    $("word-bomb-live").onclick = () => { message.textContent = "Scanning for players..."; socket.emit("word-bomb:quick-play"); };
    $("word-bomb-create").onclick = () => { message.textContent = "Private room created. Share the code."; socket.emit("word-bomb:create-room"); };
    $("word-bomb-join").onclick = () => { socket.emit("word-bomb:join-room", { code: $("word-bomb-code").value }); };
    start.onclick = () => socket.emit("word-bomb:start-room");
    form.onsubmit = (event) => { event.preventDefault(); if (!room || room.status !== "active") return; socket.emit("word-bomb:submit", { word: input.value }); input.select(); };
    fetch(`${apiOrigin}/api/v1/users/me`, { credentials: "include" })
        .then((response) => response.ok ? response.json() : null)
        .then((body) => {
            const user = body?.data?.user || body?.data;
            if (user?.username) $("word-bomb-identity").textContent = `@${user.username}`;
        })
        .catch(() => {});
    socket.on("connect", () => { if ($("word-bomb-identity").textContent === "") $("word-bomb-identity").textContent = "GUEST"; });
    socket.on("word-bomb:queue", () => { message.textContent = "Waiting for another player..."; });
    socket.on("word-bomb:room-created", ({ room: created }) => { message.textContent = `Room ${created.code} ready. Invite friends.`; render(created); });
    socket.on("word-bomb:solo-started", ({ room: started }) => { message.textContent = "Solo streak online. Keep the core alive."; render(started); input.focus(); });
    socket.on("word-bomb:state", ({ room: next }) => { render(next); message.textContent = next.status === "active" ? "Find a word containing the sequence." : `Room ${next.code || ""} lobby`; });
    socket.on("word-bomb:valid", ({ username, word }) => { feed.textContent = `${username} played ${word.toUpperCase()}`; });
    socket.on("word-bomb:invalid", ({ message: text }) => { feed.textContent = text; });
    socket.on("word-bomb:penalty", ({ username, reason }) => { feed.textContent = `${username} lost a life (${reason}).`; arena?.classList.remove("bomb-blast"); void arena?.offsetWidth; arena?.classList.add("bomb-blast"); setTimeout(() => arena?.classList.remove("bomb-blast"), 900); });
    socket.on("word-bomb:eliminated", ({ username }) => { feed.textContent = `${username} has been eliminated.`; });
    socket.on("word-bomb:alphabet-bonus", ({ username }) => { feed.textContent = `${username} completed A–Z and earned an extra life.`; });
    socket.on("word-bomb:finished", ({ winner, xpEarned, totalXp }) => { message.textContent = winner ? `${winner.username} wins the arena.` : "Match ended."; feed.textContent = xpEarned ? `+${xpEarned} XP · TOTAL XP ${totalXp}` : "No XP awarded."; });
    socket.on("word-bomb:error", ({ message: text }) => { message.textContent = text; });
});
