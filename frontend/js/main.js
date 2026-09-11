"use strict";

document.addEventListener("DOMContentLoaded", () => {
    if (new URLSearchParams(window.location.search).get("game") === "timeline") {
        window.location.replace("./timeline.html");
        return;
    }
    if (new URLSearchParams(window.location.search).get("game") === "mystery-country") {
        window.location.replace("./mystery-country.html");
        return;
    }
    const browserHost = window.location.hostname;
    const localApiHost = browserHost === "[::]"
        ? "[::]"
        : browserHost === "::1"
            ? "[::1]"
            : browserHost === "127.0.0.1"
                ? "127.0.0.1"
                : "localhost";
    const API_ORIGIN = window.GAMING_UNIVERSE_API_ORIGIN || `http://${localApiHost}:5051`;
    const API = `${API_ORIGIN}/api/v1`;
    const navigation = document.querySelector(".main-navigation");
    const playerButton = document.querySelector(".navigation-player");
    const playerName = document.querySelector(".player-name");
    const overlay = document.querySelector("#auth-overlay");
    const authView = document.querySelector("#auth-view");
    const authMessage = document.querySelector("#auth-message");
    const authTitle = document.querySelector("#auth-title");
    const gameStatus = document.querySelector("#game-status");
    const gameXp = document.querySelector("#game-account-xp");
    const gamePlayerName = document.querySelector("#game-player-name");
    const opponentName = document.querySelector("#game-opponent-name");
    const board = document.querySelector("#tic-tac-toe-board");
    const turn = document.querySelector("#game-turn");
    const command = document.querySelector("#game-command-copy");
    const primary = document.querySelector("#game-primary-action");
    const resultPanel = document.querySelector("#game-result-panel");
    const resultTitle = document.querySelector("#game-result-title");
    const resultCopy = document.querySelector("#game-result-copy");
    const startToast = document.querySelector("#game-start-toast");
    let currentUser = null; let authStep = "login"; let authContext = {};
    let mode = "computer"; let match = null; let ownSymbol = "X";
    let socket = null; let socketHandlersReady = false;
    let computerThinking = false;
    let toastTimer = null;
    let authReady = Promise.resolve();
    const isGamePage = /game\.html$/i.test(window.location.pathname);
    const gameCatalog = [
        { id: "001", slug: "tic-tac-toe", title: "Tic Tac Toe", type: "STRATEGY / 2 PLAYERS", status: "LIVE" },
        { id: "002", slug: "word-bomb", title: "Word Bomb", type: "WORD / REALTIME ARENA", status: "LIVE" },
        { id: "003", slug: "timeline", title: "Timeline", type: "KNOWLEDGE / DAILY CHALLENGE", status: "DAILY" },
        { id: "004", slug: "mystery-country", title: "Mystery Country", type: "GEOGRAPHY / DAILY CHALLENGE", status: "DAILY" }
    ];

    const renderLibrary = () => {
        const stage = document.querySelector(".platform-stage");
        if (!stage) return;
        stage.innerHTML = `<section class="game-library" aria-labelledby="library-title"><div class="library-heading"><div><span class="game-kicker">GAMING UNIVERSE / LIBRARY</span><h1 id="library-title">CHOOSE YOUR <span>UNIVERSE</span></h1><p>Enter a world, master its rules, and leave your mark.</p></div><span class="library-count">01 / ${String(gameCatalog.length).padStart(2, "0")} ACTIVE</span></div><div class="game-library-grid">${gameCatalog.map((game) => `<article class="game-library-card"><div class="library-card-art"><span class="library-card-index">${game.id}</span><div class="library-orbit"></div><div class="library-card-symbol">${game.slug === "word-bomb" ? "W<span>B</span>" : "X<span>O</span>"}</div></div><div class="library-card-body"><span>${game.type}</span><h2>${game.title}</h2><p>${game.slug === "word-bomb" ? "Keep the sequence alive. Pass the pressure." : "Read the grid. Hold the line. Make your move."}</p><a class="game-action-button" href="./${game.slug === "word-bomb" ? "word-bomb.html" : `game.html?game=${game.slug}`}">PLAY GAME <span>↗</span></a></div><span class="library-card-status">${game.status}</span></article>`).join("")}</div></section>`;
    };

    const setupGameSearch = () => {
        const header = document.querySelector(".main-navigation");
        if (!header) return;
        let search = header.querySelector(".navigation-search");
        if (!search) {
            search = document.createElement("div");
            search.className = "navigation-search";
            search.setAttribute("role", "search");
            search.innerHTML = `<input id="game-search" type="search" placeholder="SEARCH GAMES" autocomplete="off" aria-label="Search games"><div id="game-search-results" class="game-search-results" hidden></div>`;
            header.insertBefore(search, header.querySelector(".navigation-links"));
        }
        const input = search.querySelector("input");
        const results = search.querySelector(".game-search-results");
        const close = () => { results.hidden = true; results.innerHTML = ""; };
        input.addEventListener("input", () => {
            const query = input.value.trim().toLowerCase();
            if (!query) { close(); return; }
            const matches = gameCatalog.filter((game) => game.title.toLowerCase().includes(query) || game.slug.includes(query)).slice(0, 5);
            results.innerHTML = matches.length ? matches.map((game) => `<a href="./${game.slug === "word-bomb" ? "word-bomb.html" : game.slug === "timeline" ? "timeline.html" : `game.html?game=${game.slug}`}" ><span>${game.id}</span><strong>${game.title}</strong><small>${game.status}</small></a>`).join("") : `<p class="search-empty">NO GAME FOUND</p>`;
            results.hidden = false;
        });
        document.addEventListener("click", (event) => { if (!search.contains(event.target)) close(); });
    };

    const setMessage = (message, isError = false) => { if (authMessage) { authMessage.textContent = message || ""; authMessage.classList.toggle("is-error", isError); } };
    const showStartToast = () => { if (!startToast) return; clearTimeout(toastTimer); startToast.hidden = false; startToast.classList.add("is-visible"); toastTimer = setTimeout(() => { startToast.classList.remove("is-visible"); startToast.hidden = true; }, 5000); };
    const api = async (path, options = {}) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
            const response = await fetch(`${API}${path}`, { credentials: "include", headers: { "Content-Type": "application/json", ...(options.headers || {}) }, ...options, signal: controller.signal });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(body.error?.message || "Request could not be completed.");
            return body.data;
        } catch (error) {
            if (error.name === "AbortError") throw new Error("Server response timed out. Restart the backend and try again.");
            throw error;
        } finally {
            clearTimeout(timeout);
        }
    };
    const updateIdentity = (user) => {
        currentUser = user || null; const name = user ? `@${user.username}` : "GUEST"; const xp = user ? `${user.xp || 0} XP` : "GUEST";
        if (playerName) playerName.textContent = name; if (gameXp) gameXp.textContent = xp; if (gamePlayerName) gamePlayerName.textContent = name;
        if (!user && gameStatus) gameStatus.textContent = "Sign in to enter the arena.";
    };
    const openAuth = (step = "login", context = {}) => { authStep = step; authContext = context; if (overlay) { overlay.hidden = false; overlay.setAttribute("aria-hidden", "false"); } renderAuth(); };
    const closeAuth = () => {
        if (!overlay) return;
        if (overlay.contains(document.activeElement)) document.activeElement.blur();
        overlay.hidden = true;
        overlay.setAttribute("aria-hidden", "true");
        playerButton?.focus({ preventScroll: true });
    };
    const field = (name, type = "text", placeholder = "") => `<label>${name.toUpperCase()}<input name="${name}" type="${type}" placeholder="${placeholder}" required autocomplete="off"></label>`;
    const form = (title, submit, fields) => `<form class="auth-form" data-auth-form="${authStep}"><h3>${title}</h3>${fields}<button class="game-action-button" type="submit">${submit}</button></form>`;
    const renderAuth = () => {
        if (!authView) return;
        if (authStep === "account") { authTitle.textContent = "YOUR UNIVERSE"; authView.innerHTML = `<div class="auth-account"><strong>@${currentUser?.username || "GUEST"}</strong><span>${currentUser?.xp || 0} XP</span><button class="game-action-button" type="button" data-auth-logout>LOG OUT</button></div>`; return; }
        authTitle.textContent = authStep.startsWith("signup") ? "CREATE YOUR UNIVERSE ID" : "ENTER THE UNIVERSE";
        if (authStep === "login") authView.innerHTML = form("WELCOME BACK", "LOGIN", field("mobile", "tel", "+91...") + field("password", "password", "Your password"));
        else if (authStep === "signup") authView.innerHTML = form("BEGIN YOUR ACCOUNT", "SEND SIGNUP OTP", field("mobile", "tel", "+91..."));
        else if (authStep === "signup-otp") authView.innerHTML = form("VERIFY MOBILE", "VERIFY OTP", field("otp", "text", "6 digit code"));
        else if (authStep === "signup-username") authView.innerHTML = form("CHOOSE USERNAME", "CONTINUE", field("username", "text", "Unique handle"));
        else if (authStep === "signup-password") authView.innerHTML = form("SECURE ACCOUNT", "CREATE ACCOUNT", field("password", "password", "At least 8 characters"));
        else if (authStep === "forgot") authView.innerHTML = form("RESET ACCESS", "SEND RESET OTP", field("mobile", "tel", "+91..."));
        else if (authStep === "forgot-otp") authView.innerHTML = form("VERIFY RESET OTP", "VERIFY OTP", field("otp", "text", "6 digit code"));
        else if (authStep === "reset-password") authView.innerHTML = form("NEW PASSWORD", "RESET PASSWORD", field("password", "password", "At least 8 characters"));
    };
    const refreshUser = async () => { try { const data = await api("/users/me"); updateIdentity(data.user || data); } catch (_error) { updateIdentity(null); } };
    const handleAuthSubmit = async (formElement) => {
        const data = Object.fromEntries(new FormData(formElement).entries());
        try {
            setMessage("Processing...");
            if (authStep === "login") { const result = await api("/auth/login", { method: "POST", body: JSON.stringify(data) }); updateIdentity(result.user); closeAuth(); startComputer(); return; }
            if (authStep === "signup") { await api("/auth/otp/send", { method: "POST", body: JSON.stringify({ mobile: data.mobile, purpose: "signup" }) }); authContext.mobile = data.mobile; authStep = "signup-otp"; renderAuth(); return; }
            if (authStep === "signup-otp") { await api("/auth/otp/verify", { method: "POST", body: JSON.stringify({ mobile: authContext.mobile, otp: data.otp, purpose: "signup" }) }); authStep = "signup-username"; renderAuth(); return; }
            if (authStep === "signup-username") { const available = await api(`/auth/username/check?username=${encodeURIComponent(data.username)}`); if (!available.available) throw new Error("That username is already taken."); authContext.username = data.username; authStep = "signup-password"; renderAuth(); return; }
            if (authStep === "signup-password") { const result = await api("/auth/register", { method: "POST", body: JSON.stringify({ mobile: authContext.mobile, username: authContext.username, password: data.password }) }); updateIdentity(result.user); closeAuth(); startComputer(); return; }
            if (authStep === "forgot") { await api("/auth/otp/send", { method: "POST", body: JSON.stringify({ mobile: data.mobile, purpose: "password_reset" }) }); authContext.mobile = data.mobile; authStep = "forgot-otp"; renderAuth(); return; }
            if (authStep === "forgot-otp") { await api("/auth/otp/verify", { method: "POST", body: JSON.stringify({ mobile: authContext.mobile, otp: data.otp, purpose: "password_reset" }) }); authStep = "reset-password"; renderAuth(); return; }
            if (authStep === "reset-password") { await api("/auth/password/reset", { method: "POST", body: JSON.stringify({ mobile: authContext.mobile, password: data.password }) }); authStep = "login"; renderAuth(); setMessage("Password reset. You can log in now."); }
        } catch (error) { setMessage(error.message, true); }
    };
    const clearBoard = () => document.querySelectorAll(".board-cell").forEach((cell) => { cell.textContent = ""; cell.classList.remove("is-x", "is-o", "is-winning"); cell.disabled = true; });
    const showResult = (state, xpEarned = 0) => { if (!resultPanel) return; resultPanel.hidden = false; const won = state.winner === ownSymbol || state.winnerSymbol === ownSymbol; resultTitle.textContent = won ? "VICTORY" : state.status === "draw" ? "DRAW" : "MATCH LOST"; resultCopy.textContent = xpEarned ? `+${xpEarned} XP  ·  TOTAL XP: ${currentUser?.xp || 0}` : won ? "The line is yours." : state.status === "draw" ? "No line conquered this time." : "The universe has another answer."; };
    const renderMatch = (state) => { match = state; document.querySelectorAll(".board-cell").forEach((cell) => { const index = Number(cell.dataset.cell); const value = state.board?.[index]; cell.textContent = value || ""; cell.classList.toggle("is-x", value === "X"); cell.classList.toggle("is-o", value === "O"); cell.classList.toggle("is-winning", (state.winningCells || []).includes(index)); cell.disabled = state.status !== "active" || Boolean(value) || state.currentTurn !== ownSymbol || computerThinking; }); turn.textContent = state.status === "active" ? state.currentTurn : "—"; opponentName.textContent = state.players?.find((p) => p.symbol !== ownSymbol)?.username || (mode === "computer" ? "COMPUTER" : "SEARCHING..."); command.textContent = state.status === "active" ? (computerThinking ? "Computer is thinking..." : state.currentTurn === ownSymbol ? "Your move. Read the next line." : "Opponent is calculating the next move.") : "Match complete."; if (state.status !== "active") showResult(state); };
    const startComputer = async () => { await authReady; if (!currentUser) { openAuth("login"); return; } showStartToast(); mode = "computer"; resultPanel.hidden = true; clearBoard(); ownSymbol = "X"; gameStatus.textContent = "Computer match online."; opponentName.textContent = "COMPUTER"; try { const data = await api("/games/tic-tac-toe/computer/matches", { method: "POST" }); renderMatch(data.match); } catch (error) { gameStatus.textContent = error.message; } };
    const startPlayer = async () => { await authReady; if (!currentUser) { openAuth("login"); return; } showStartToast(); mode = "player"; resultPanel.hidden = true; clearBoard(); gameStatus.textContent = "Searching for a live player..."; command.textContent = "Scanning the live queue."; if (!socket) socket = window.io(API_ORIGIN, { withCredentials: true, autoConnect: false }); if (!socketHandlersReady) { socket.on("tic-tac-toe:matched", (data) => { ownSymbol = data.ownSymbol; gameStatus.textContent = `Live match · ${data.opponentUsername}`; renderMatch(data.match); }); socket.on("tic-tac-toe:queue-status", () => { gameStatus.textContent = "Searching for a live player..."; }); socket.on("tic-tac-toe:state", (data) => renderMatch(data.match)); socket.on("tic-tac-toe:xp-awarded", (data) => { if (currentUser) { currentUser.xp = data.totalXp; updateIdentity(currentUser); } showResult(match, data.xpEarned); }); socket.on("tic-tac-toe:matchmaking-timeout", () => { gameStatus.textContent = "No player is live right now. Starting a match against the computer..."; setTimeout(startComputer, 1200); }); socket.on("tic-tac-toe:opponent-left", (data) => { gameStatus.textContent = data.message; }); socket.on("tic-tac-toe:error", (data) => { gameStatus.textContent = data.message; }); socketHandlersReady = true; } if (!socket.connected) socket.connect(); socket.emit("tic-tac-toe:queue"); };
    board?.addEventListener("click", async (event) => { const cell = event.target.closest(".board-cell"); if (!cell || !match || match.status !== "active" || computerThinking) return; const index = Number(cell.dataset.cell); try { if (mode === "computer") { computerThinking = true; const previousMatch = match; const optimisticBoard = match.board.slice(); optimisticBoard[index] = "X"; renderMatch({ ...match, board: optimisticBoard, currentTurn: "O", status: "active" }); gameStatus.textContent = "Computer is thinking..."; await new Promise((resolve) => setTimeout(resolve, 850)); const data = await api(`/games/tic-tac-toe/computer/matches/${previousMatch.matchId}/moves`, { method: "POST", body: JSON.stringify({ cell: index }) }); const completedMatch = data.match; computerThinking = false; renderMatch(completedMatch); if (completedMatch.xpEarned) { currentUser.xp = completedMatch.totalXp; updateIdentity(currentUser); showResult(completedMatch, completedMatch.xpEarned); } } else socket.emit("tic-tac-toe:move", { matchId: match.matchId, cell: index }); } catch (error) { computerThinking = false; gameStatus.textContent = error.message; } });
    document.querySelectorAll("[data-game-mode]").forEach((button) => button.addEventListener("click", () => button.dataset.gameMode === "computer" ? startComputer() : startPlayer()));
    primary?.addEventListener("click", () => mode === "player" ? startPlayer() : startComputer()); document.querySelector("#game-replay-button")?.addEventListener("click", () => mode === "player" ? startPlayer() : startComputer()); document.querySelector("#game-new-player-button")?.addEventListener("click", () => { window.location.href = "./index.html"; }); document.querySelector("#game-result-close")?.addEventListener("click", () => { if (resultPanel) resultPanel.hidden = true; }); document.querySelector("#game-exit-button")?.addEventListener("click", () => { socket?.emit("tic-tac-toe:cancel"); match = null; resultPanel.hidden = true; clearBoard(); gameStatus.textContent = "Arena reset."; });
    document.querySelector("#auth-close-button")?.addEventListener("click", closeAuth); overlay?.addEventListener("click", (event) => { if (event.target === overlay) closeAuth(); }); authView?.addEventListener("submit", (event) => { event.preventDefault(); handleAuthSubmit(event.target); }); document.querySelector("#auth-navigation")?.addEventListener("click", (event) => { const button = event.target.closest("[data-auth-switch]"); if (button) openAuth(button.dataset.authSwitch); }); authView?.addEventListener("click", async (event) => { if (event.target.matches("[data-auth-logout]")) { await api("/auth/logout", { method: "POST" }); updateIdentity(null); closeAuth(); } });
    playerButton?.addEventListener("click", () => currentUser ? openAuth("account") : openAuth("login")); playerButton?.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") playerButton.click(); });
    navigation?.addEventListener("mousemove", (event) => { const rect = navigation.getBoundingClientRect(); if (rect.width && rect.height) { navigation.style.setProperty("--mouse-x", `${((event.clientX - rect.left) / rect.width) * 100}%`); navigation.style.setProperty("--mouse-y", `${((event.clientY - rect.top) / rect.height) * 100}%`); } }); navigation?.addEventListener("mouseleave", () => { navigation.style.setProperty("--mouse-x", "50%"); navigation.style.setProperty("--mouse-y", "50%"); });
    if (!isGamePage) renderLibrary();
    setupGameSearch();
    clearBoard();
    authReady = refreshUser();
});
