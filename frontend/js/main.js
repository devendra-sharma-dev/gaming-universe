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
    /* Estimate It */
    if (new URLSearchParams(window.location.search).get("game") === "estimate-it") {
        window.location.replace("./estimate-it.html");
        return;
    }
    if (new URLSearchParams(window.location.search).get("game") === "mini-olympics") {
        window.location.replace("./mini-olympics.html");
        return;
    }
    if (new URLSearchParams(window.location.search).get("game") === "puzzle-quest") {
        window.location.replace("./puzzle-quest.html");
        return;
    }
    if (new URLSearchParams(window.location.search).get("game") === "cricket") {
        window.location.replace("./cricket.html");
        return;
    }
    const API_ORIGIN = window.GamingSession.apiOrigin;
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

    let currentUser = null;
    let authStep = "login";
    let authContext = {};
    let mode = "computer";
    let match = null;
    let ownSymbol = "X";
    let socket = null;
    let socketHandlersReady = false;
    let computerThinking = false;
    let toastTimer = null;
    let authReady = Promise.resolve();

    // Mode variant: "standard" vs "infinite"
    let activeVariant = "standard";
    try {
        const saved = sessionStorage.getItem("tictactoe_variant");
        if (saved === "infinite" || saved === "standard") activeVariant = saved;
    } catch (_) {}

    let xQueue = [];
    let oQueue = [];

    const isGamePage = /game\.html$/i.test(window.location.pathname);
    const gameCatalog = [
        { id: "001", slug: "tic-tac-toe", title: "Tic Tac Toe", type: "STRATEGY / 2 PLAYERS", status: "LIVE" },
        { id: "002", slug: "word-bomb", title: "Word Bomb", type: "WORD / REALTIME ARENA", status: "LIVE" },
        { id: "003", slug: "timeline", title: "Timeline", type: "KNOWLEDGE / DAILY CHALLENGE", status: "DAILY" },
        { id: "004", slug: "mystery-country", title: "Mystery Country", type: "GEOGRAPHY / DAILY CHALLENGE", status: "DAILY" },
        { id: "005", slug: "estimate-it", title: "Estimate It", type: "ESTIMATION / DAILY CHALLENGE", status: "DAILY" }, /* Estimate It */
        { id: "006", slug: "mini-olympics", title: "Mini Olympics", type: "SPORTS / 5-EVENT CHAMPIONSHIP", status: "LIVE" },
        { id: "007", slug: "puzzle-quest", title: "Clever Chaos", type: "PUZZLE / 50-STAGE SAGA", status: "LIVE" },
        { id: "008", slug: "cricket", title: "Cricket Arcade", type: "SPORTS / RUN CHASE", status: "LIVE" }
    ];

    const getGameUrl = (slug) => {
        if (slug === "word-bomb") return "word-bomb.html";
        if (slug === "timeline") return "timeline.html";
        if (slug === "mystery-country") return "mystery-country.html";
        if (slug === "estimate-it") return "estimate-it.html";
        if (slug === "mini-olympics") return "mini-olympics.html";
        if (slug === "puzzle-quest") return "puzzle-quest.html";
        if (slug === "cricket") return "cricket.html";
        return `game.html?game=${slug}`;
    };

    const renderLibrary = () => {
        const stage = document.querySelector(".platform-stage");
        if (!stage) return;
        stage.innerHTML = `<section class="game-library" aria-labelledby="library-title"><div class="library-heading"><div><span class="game-kicker">GAMING UNIVERSE / LIBRARY</span><h1 id="library-title">CHOOSE YOUR <span>UNIVERSE</span></h1><p>Enter a world, master its rules, and leave your mark.</p></div><span class="library-count">01 / ${String(gameCatalog.length).padStart(2, "0")} ACTIVE</span></div><div class="game-library-grid">${gameCatalog.map((game) => `<article class="game-library-card"><div class="library-card-art"><span class="library-card-index">${game.id}</span><div class="library-orbit"></div><div class="library-card-symbol">${game.slug === "word-bomb" ? "W<span>B</span>" : game.slug === "mini-olympics" ? "🏅" : game.slug === "puzzle-quest" ? "🧩" : game.slug === "cricket" ? "🏏" : "X<span>O</span>"}</div></div><div class="library-card-body"><span>${game.type}</span><h2>${game.title}</h2><p>${game.slug === "word-bomb" ? "Keep the sequence alive. Pass the pressure." : game.slug === "mini-olympics" ? "Represent your nation in a 5-event world championship." : game.slug === "puzzle-quest" ? "An epic saga of logic, deduction & spatial mastery." : game.slug === "cricket" ? "Step onto the pitch. Time your shots and chase arcade glory." : "Read the grid. Hold the line. Make your move."}</p><a class="game-action-button" href="./${getGameUrl(game.slug)}">PLAY GAME <span>↗</span></a></div><span class="library-card-status">${game.status}</span></article>`).join("")}</div></section>`;
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
            results.innerHTML = matches.length ? matches.map((game) => `<a href="./${getGameUrl(game.slug)}"><span>${game.id}</span><strong>${game.title}</strong><small>${game.status}</small></a>`).join("") : `<p class="search-empty">NO GAME FOUND</p>`;
            results.hidden = false;
        });
        document.addEventListener("click", (event) => { if (!search.contains(event.target)) close(); });
    };

    const setMessage = (message, isError = false) => {
        if (authMessage) {
            authMessage.textContent = message || "";
            authMessage.classList.toggle("is-error", isError);
        }
    };

    const showStartToast = () => {
        if (!startToast) return;
        clearTimeout(toastTimer);
        startToast.hidden = false;
        startToast.classList.add("is-visible");
        toastTimer = setTimeout(() => {
            startToast.classList.remove("is-visible");
            startToast.hidden = true;
        }, 5000);
    };

    const api = async (path, options = {}) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), path === "/auth/otp/send" ? 45000 : 15000);
        try {
            const response = await window.GamingSession.fetch(`${API}${path}`, {
                credentials: "include",
                headers: { "Content-Type": "application/json", ...(options.headers || {}) },
                ...options,
                signal: controller.signal
            });
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
        currentUser = user || null;
        const name = user ? `@${user.username}` : "GUEST";
        const xp = user ? `${user.xp || 0} XP` : "GUEST";
        if (playerName) playerName.textContent = name;
        if (gameXp) gameXp.textContent = xp;
        if (gamePlayerName) gamePlayerName.textContent = name;
        if (!user && gameStatus) gameStatus.textContent = "Sign in to enter the arena.";
    };

    const openAuth = (step = "login", context = {}) => {
        authStep = step;
        authContext = context;
        if (overlay) {
            overlay.hidden = false;
            overlay.setAttribute("aria-hidden", "false");
        }
        renderAuth();
    };

    const closeAuth = () => {
        if (!overlay) return;
        if (overlay.contains(document.activeElement)) document.activeElement.blur();
        overlay.hidden = true;
        overlay.setAttribute("aria-hidden", "true");
        playerButton?.focus({ preventScroll: true });
    };

    let usernameTimer = null;
    let usernameRevision = 0;
    let availableUsername = null;
    let resendTimer = null;
    let authBusy = false;

    const renderAuth = () => {
        if (!authView) return;
        clearTimeout(usernameTimer);
        clearInterval(resendTimer);
        usernameRevision += 1;
        availableUsername = null;
        setMessage("");
        const navEl = document.querySelector("#auth-navigation");

        if (authStep === "account") {
            authTitle.innerHTML = "PLAYER <span>PROFILE</span>";
            setMessage("Manage your player profile and security credentials.");
            authView.innerHTML = `
                <div class="auth-account">
                    <div class="auth-account-badge">
                        <div class="auth-account-info">
                            <strong class="auth-account-username">@${currentUser?.username || "PLAYER"}</strong>
                            <span class="auth-account-email">${currentUser?.email || "Authenticated User"}</span>
                        </div>
                        <div class="auth-account-xp">${currentUser?.xp || 0} XP</div>
                    </div>
                    <div class="auth-account-actions">
                        <button class="game-action-button auth-update-pw-btn" type="button" data-auth-start-update-pw>UPDATE PASSWORD</button>
                        <button class="game-secondary-button auth-logout-btn" type="button" data-auth-logout>LOG OUT</button>
                    </div>
                </div>
            `;
            if (navEl) navEl.hidden = true;
            return;
        }

        if (authStep === "update-password") {
            authTitle.innerHTML = "SECURITY <span>SETTINGS</span>";
            setMessage("We sent a 6-digit verification code to " + (currentUser?.email || "your email") + ". Enter the code and your new password.");
            authView.innerHTML = `
                <form class="auth-form" data-auth-action="update-password">
                    <h3>UPDATE YOUR PASSWORD</h3>
                    <div class="auth-field">
                        <label class="auth-field-label" for="auth-upd-otp">EMAIL VERIFICATION CODE</label>
                        <input id="auth-upd-otp" name="otp" type="text" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" placeholder="6-digit code" required>
                    </div>
                    <div class="auth-field">
                        <label class="auth-field-label" for="auth-upd-newpass">NEW PASSWORD</label>
                        <input id="auth-upd-newpass" name="newPassword" type="password" minlength="6" autocomplete="new-password" placeholder="At least 6 characters" required>
                    </div>
                    <div class="auth-field">
                        <label class="auth-field-label" for="auth-upd-confpass">CONFIRM NEW PASSWORD</label>
                        <input id="auth-upd-confpass" name="confirmNewPassword" type="password" minlength="6" autocomplete="new-password" placeholder="Repeat new password" required>
                    </div>
                    <button class="game-action-button" type="submit">SAVE NEW PASSWORD</button>
                    <button class="game-secondary-button" type="button" data-auth-switch="account">BACK TO PROFILE</button>
                </form>
            `;
            if (navEl) navEl.hidden = true;
            authView.querySelector("input")?.focus();
            return;
        }

        if (authStep === "otp") {
            authTitle.innerHTML = "EMAIL <span>VERIFICATION</span>";
            setMessage("We sent a 6-digit code to " + authContext.email + ". Enter it below to continue creating your account.");
            authView.innerHTML = `
                <form class="auth-form" data-auth-action="verify-otp">
                    <h3>ENTER 6-DIGIT CODE</h3>
                    <div class="auth-field">
                        <label class="auth-field-label" for="auth-otp-input">VERIFICATION CODE</label>
                        <input id="auth-otp-input" name="otp" type="text" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" placeholder="6 digit code" required>
                    </div>
                    <button class="game-action-button" type="submit">VERIFY CODE</button>
                    <button class="game-secondary-button" type="button" data-auth-resend>RESEND CODE</button>
                </form>
            `;
            if (navEl) {
                navEl.hidden = false;
                navEl.innerHTML = `
                    <div class="auth-nav-row">
                        <button type="button" class="auth-nav-link" data-auth-switch="signup">USE ANOTHER EMAIL</button>
                        <button type="button" class="auth-nav-link secondary" data-auth-switch="login">BACK TO SIGN IN</button>
                    </div>
                `;
            }
            const updateResend = () => {
                const button = authView.querySelector("[data-auth-resend]");
                if (!button) return;
                const seconds = Math.max(0, Math.ceil((authContext.resendAt - Date.now()) / 1000));
                button.disabled = authBusy || seconds > 0;
                button.textContent = seconds ? "RESEND IN " + seconds + "s" : "RESEND CODE";
            };
            updateResend();
            resendTimer = setInterval(updateResend, 1000);
            authView.querySelector("input")?.focus();
            return;
        }

        if (authStep === "username") {
            authTitle.innerHTML = "SETUP <span>IDENTITY</span>";
            setMessage("Choose your unique gaming handle and password for returning logins.");
            authView.innerHTML = `
                <form class="auth-form" data-auth-action="register">
                    <h3>CREATE PROFILE & PASSWORD</h3>
                    <div class="auth-field">
                        <label class="auth-field-label" for="auth-reg-user">CHOOSE USERNAME</label>
                        <input id="auth-reg-user" name="username" type="text" minlength="3" maxlength="20" pattern="[A-Za-z0-9_]{3,20}" autocomplete="username" aria-describedby="username-status" placeholder="Unique handle" required>
                        <p id="username-status" class="username-status" aria-live="polite">Use 3–20 letters, numbers, or underscores.</p>
                    </div>
                    <div class="auth-field">
                        <label class="auth-field-label" for="auth-reg-pass">PASSWORD</label>
                        <input id="auth-reg-pass" name="password" type="password" minlength="6" autocomplete="new-password" placeholder="At least 6 characters" required>
                    </div>
                    <div class="auth-field">
                        <label class="auth-field-label" for="auth-reg-conf">CONFIRM PASSWORD</label>
                        <input id="auth-reg-conf" name="confirmPassword" type="password" minlength="6" autocomplete="new-password" placeholder="Repeat your password" required>
                    </div>
                    <button class="game-action-button" type="submit" disabled>COMPLETE SIGN UP</button>
                </form>
            `;
            if (navEl) navEl.hidden = true;
            authView.querySelector("input")?.focus();
            return;
        }

        if (authStep === "signup") {
            authTitle.innerHTML = "JOIN THE <span>UNIVERSE</span>";
            setMessage("Enter your email address to receive a 6-digit verification code to create your account.");
            authView.innerHTML = `
                <form class="auth-form" data-auth-action="send-otp">
                    <h3>CREATE ACCOUNT</h3>
                    <div class="auth-field">
                        <label class="auth-field-label" for="auth-signup-email">EMAIL ADDRESS</label>
                        <input id="auth-signup-email" name="email" type="email" maxlength="254" autocomplete="email" placeholder="you@example.com" required>
                    </div>
                    <button class="game-action-button" type="submit">SEND VERIFICATION CODE</button>
                </form>
            `;
            if (navEl) {
                navEl.hidden = false;
                navEl.innerHTML = `
                    <div class="auth-nav-row">
                        <button type="button" class="auth-nav-link" data-auth-switch="login">ALREADY REGISTERED? SIGN IN</button>
                    </div>
                `;
            }
            authView.querySelector("input")?.focus();
            return;
        }

        // Default: login view (Username & Password only - no email code signin)
        authStep = "login";
        authTitle.innerHTML = "ENTER THE <span>UNIVERSE</span>";
        setMessage("Sign in with your handle and password. Existing accounts can use their username and 'admin123'.");
        authView.innerHTML = `
            <form class="auth-form" data-auth-action="login">
                <div class="auth-field">
                    <label class="auth-field-label" for="auth-login-identifier">USERNAME OR EMAIL</label>
                    <input id="auth-login-identifier" name="identifier" type="text" autocomplete="username" placeholder="Enter username or email" required>
                </div>
                <div class="auth-field">
                    <label class="auth-field-label" for="auth-login-password">PASSWORD</label>
                    <input id="auth-login-password" name="password" type="password" autocomplete="current-password" placeholder="Enter your password" required>
                </div>
                <button class="game-action-button auth-submit-button" type="submit">SIGN IN</button>
            </form>
        `;
        if (navEl) {
            navEl.hidden = false;
            navEl.innerHTML = `
                <div class="auth-nav-row">
                    <button type="button" class="auth-nav-link" data-auth-switch="signup">NEW HERE? CREATE ACCOUNT</button>
                </div>
            `;
        }
        authView.querySelector("input")?.focus();
    };

    const refreshUser = async () => {
        try {
            const data = await api("/users/me");
            updateIdentity(data.user || data);
        } catch (_error) {
            updateIdentity(null);
        }
    };

    const completeLogin = (user) => {
        socket?.disconnect();
        updateIdentity(user);
        closeAuth();
        window.GamingSession.identityChanged();
        if (isGamePage) startComputer();
    };

    const sendCode = async (email) => {
        const result = await api("/auth/otp/send", { method: "POST", body: JSON.stringify({ email }) });
        authContext = { email: result.email, resendAt: Date.now() + (result.retryAfter || 60) * 1000 };
        authStep = "otp";
        renderAuth();
    };

    const handleAuthSubmit = async (formElement) => {
        if (authBusy) return;
        const data = Object.fromEntries(new FormData(formElement).entries());
        const action = formElement.dataset.authAction;

        if (action === "register" && availableUsername !== data.username?.trim()) return;

        authBusy = true;
        formElement.querySelectorAll("input,button").forEach((el) => { el.disabled = true; });
        try {
            setMessage("Processing...");
            if (action === "login") {
                const identifier = (data.identifier || data.email || "").trim();
                const password = (data.password || "").trim();
                if (!password) {
                    throw new Error("Please enter your password.");
                }
                const result = await api("/auth/login", {
                    method: "POST",
                    body: JSON.stringify({ identifier, password })
                });
                completeLogin(result.user);
            } else if (action === "send-otp") {
                await sendCode(data.email.trim());
            } else if (action === "verify-otp") {
                const result = await api("/auth/otp/verify", {
                    method: "POST",
                    body: JSON.stringify({ email: authContext.email, otp: data.otp.trim() })
                });
                if (result.needsUsername) {
                    authStep = "username";
                    renderAuth();
                } else {
                    completeLogin(result.user);
                }
            } else if (action === "register") {
                if (data.password !== data.confirmPassword) {
                    throw new Error("Passwords do not match.");
                }
                const result = await api("/auth/register", {
                    method: "POST",
                    body: JSON.stringify({
                        username: data.username.trim(),
                        password: data.password.trim()
                    })
                });
                completeLogin(result.user);
            } else if (action === "update-password") {
                if (data.newPassword !== data.confirmNewPassword) {
                    throw new Error("New passwords do not match.");
                }
                await api("/auth/password/update", {
                    method: "POST",
                    body: JSON.stringify({
                        otp: data.otp.trim(),
                        newPassword: data.newPassword.trim()
                    })
                });
                setMessage("Password updated successfully! You can now sign in with your new password.", false);
                setTimeout(() => {
                    openAuth("account");
                }, 1500);
            }
        } catch (error) {
            setMessage(error.message, true);
        } finally {
            authBusy = false;
            if (formElement.isConnected) {
                formElement.querySelectorAll("input,button").forEach((el) => { el.disabled = false; });
                if (action === "register") {
                    formElement.querySelector('[type="submit"]').disabled = !availableUsername;
                }
            }
        }
    };

    authView?.addEventListener("input", (event) => {
        if (event.target.name !== "username") return;
        clearTimeout(usernameTimer);
        const revision = ++usernameRevision;
        const username = event.target.value.trim();
        const feedback = authView.querySelector("#username-status");
        const submit = authView.querySelector('[type="submit"]');
        availableUsername = null;
        if (submit) submit.disabled = true;
        if (!feedback) return;
        feedback.className = "username-status";
        if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
            feedback.textContent = "Use 3–20 letters, numbers, or underscores.";
            return;
        }
        feedback.textContent = "Checking availability...";
        usernameTimer = setTimeout(async () => {
            try {
                const result = await api("/auth/username/check?username=" + encodeURIComponent(username));
                if (revision !== usernameRevision) return;
                availableUsername = result.available ? username : null;
                feedback.textContent = result.available ? "Username available." : "Username already taken. Choose another.";
                feedback.className = "username-status " + (result.available ? "is-available" : "is-error");
                if (submit) submit.disabled = !result.available;
            } catch (error) {
                if (revision !== usernameRevision) return;
                feedback.textContent = error.message;
                feedback.className = "username-status is-error";
            }
        }, 300);
    });

    authView?.addEventListener("click", async (event) => {
        const updateBtn = event.target.closest("[data-auth-start-update-pw]");
        if (updateBtn && !authBusy) {
            authBusy = true;
            setMessage("Sending verification code to your registered email...");
            try {
                const res = await api("/auth/password/otp/send", { method: "POST" });
                authContext = { email: res.email, resendAt: Date.now() + (res.retryAfter || 60) * 1000 };
                authStep = "update-password";
                renderAuth();
            } catch (err) {
                setMessage(err.message, true);
            } finally {
                authBusy = false;
            }
            return;
        }

        if (event.target.matches("[data-auth-resend]") && !authBusy) {
            authBusy = true;
            event.target.disabled = true;
            try {
                await sendCode(authContext.email);
            } catch (error) {
                setMessage(error.message, true);
            } finally {
                authBusy = false;
            }
            return;
        }

        if (event.target.matches("[data-auth-logout]")) {
            try {
                await api("/auth/logout", { method: "POST" });
                window.GamingSession.clearSession();
                socket?.disconnect();
                updateIdentity(null);
                closeAuth();
                window.GamingSession.identityChanged();
                if (isGamePage) window.location.reload();
            } catch (error) {
                setMessage(error.message, true);
            }
        }
    });

    document.addEventListener("click", (event) => {
        const switchBtn = event.target.closest("[data-auth-switch]");
        if (switchBtn && !authBusy) {
            openAuth(switchBtn.dataset.authSwitch);
        }
    });

    // -------------------------------------------------------------
    // TIC-TAC-TOE: VARIANT & GAME LOGIC
    // -------------------------------------------------------------

    const updateVariantButtons = () => {
        document.querySelectorAll("[data-game-variant]").forEach((btn) => {
            const isActive = btn.dataset.gameVariant === activeVariant;
            btn.classList.toggle("active", isActive);
            btn.setAttribute("aria-selected", isActive ? "true" : "false");
            btn.setAttribute("aria-pressed", isActive ? "true" : "false");
        });
        const titleEl = document.querySelector("#variant-info-title");
        const ruleEl = document.querySelector("#variant-bar-rule .rule-text");
        if (titleEl) {
            titleEl.textContent = activeVariant === "infinite" ? "INFINITE TIC-TAC-TOE" : "STANDARD TIC-TAC-TOE";
        }
        if (ruleEl) {
            ruleEl.textContent = activeVariant === "infinite"
                ? "3 active markers max. 4th marker replaces your oldest!"
                : "Classic 3x3 rules. First to align 3 wins.";
        }
    };

    const clearBoard = () => {
        document.querySelectorAll(".board-cell").forEach((cell) => {
            cell.textContent = "";
            cell.classList.remove("is-x", "is-o", "is-winning", "is-vanishing");
            cell.removeAttribute("title");
            cell.disabled = true;
        });
    };

    const showResult = (state, xpEarned = 0) => {
        if (!resultPanel) return;
        resultPanel.hidden = false;
        const won = state.winner === ownSymbol || state.winnerSymbol === ownSymbol;
        resultTitle.textContent = won ? "VICTORY" : state.status === "draw" ? "DRAW" : "MATCH LOST";
        resultCopy.textContent = xpEarned
            ? `+${xpEarned} XP  ·  TOTAL XP: ${currentUser?.xp || 0}`
            : won
                ? "The line is yours."
                : state.status === "draw"
                    ? "No line conquered this time."
                    : "The universe has another answer.";
    };

    const renderMatch = (state) => {
        match = state;
        if (state.variant) {
            activeVariant = state.variant;
            try { sessionStorage.setItem("tictactoe_variant", activeVariant); } catch (_) {}
            updateVariantButtons();
        }

        if (state.moveOrder?.X) xQueue = state.moveOrder.X.slice();
        if (state.moveOrder?.O) oQueue = state.moveOrder.O.slice();

        // Warning indicator: Visually fade or blink the oldest marker on the board
        // when it is that player's turn, warning them which piece will vanish next.
        let vanishingCell = null;
        if (activeVariant === "infinite" && state.status === "active") {
            if (state.currentTurn === "X" && xQueue.length >= 3) {
                vanishingCell = xQueue[0];
            } else if (state.currentTurn === "O" && oQueue.length >= 3) {
                vanishingCell = oQueue[0];
            }
        }

        document.querySelectorAll(".board-cell").forEach((cell) => {
            const index = Number(cell.dataset.cell);
            const value = state.board?.[index];
            cell.textContent = value || "";
            cell.classList.toggle("is-x", value === "X");
            cell.classList.toggle("is-o", value === "O");
            cell.classList.toggle("is-winning", (state.winningCells || []).includes(index));

            const isVanishing = index === vanishingCell;
            cell.classList.toggle("is-vanishing", isVanishing);
            if (isVanishing) {
                cell.setAttribute("title", "Oldest marker — will vanish when next piece is placed");
            } else {
                cell.removeAttribute("title");
            }

            cell.disabled =
                state.status !== "active" ||
                Boolean(value) ||
                state.currentTurn !== ownSymbol ||
                computerThinking;
        });

        turn.textContent = state.status === "active" ? state.currentTurn : "—";
        opponentName.textContent =
            state.players?.find((p) => p.symbol !== ownSymbol)?.username ||
            (mode === "computer" ? "COMPUTER" : "SEARCHING...");

        command.textContent = state.status === "active"
            ? (computerThinking
                ? "Computer is thinking..."
                : state.currentTurn === ownSymbol
                    ? (activeVariant === "infinite" && xQueue.length >= 3
                        ? "Your turn! Your oldest marker is blinking and will vanish next."
                        : "Your move. Read the next line.")
                    : "Opponent is calculating the next move.")
            : "Match complete.";

        if (state.status !== "active") showResult(state);
    };

    // Clean reset & variant switch
    const switchVariant = (newVariant) => {
        activeVariant = newVariant;
        try { sessionStorage.setItem("tictactoe_variant", activeVariant); } catch (_) {}
        updateVariantButtons();

        // 1. Reset board and state cleanly
        clearBoard();
        xQueue = [];
        oQueue = [];
        match = null;
        computerThinking = false;
        if (resultPanel) resultPanel.hidden = true;

        if (activeVariant === "infinite") {
            gameStatus.textContent = "Infinite Mode active: Max 3 markers per player. 4th replaces oldest.";
            command.textContent = "Each player keeps at most 3 markers. Oldest marker blinks when at limit.";
        } else {
            gameStatus.textContent = "Standard Mode active: Classic 3x3 Tic Tac Toe.";
            command.textContent = "Choose a mode to initialize a match.";
        }

        // 2. Start a fresh match in the selected mode if authenticated
        if (currentUser) {
            startComputer();
        }
    };

    const startComputer = async () => {
        await authReady;
        if (!currentUser) {
            openAuth("login");
            return;
        }

        showStartToast();
        mode = "computer";
        if (resultPanel) resultPanel.hidden = true;
        clearBoard();
        xQueue = [];
        oQueue = [];
        ownSymbol = "X";
        gameStatus.textContent = activeVariant === "infinite"
            ? "Infinite match online (3 markers max)."
            : "Computer match online.";
        opponentName.textContent = "COMPUTER";

        try {
            const data = await api("/games/tic-tac-toe/computer/matches", {
                method: "POST",
                body: JSON.stringify({ variant: activeVariant })
            });
            renderMatch(data.match);
        } catch (error) {
            gameStatus.textContent = error.message;
        }
    };

    const startPlayer = async () => {
        await authReady;
        try {
            await window.GamingSession.loadSocketClient();
        } catch (error) {
            gameStatus.textContent = error.message;
            return;
        }

        if (!currentUser) {
            openAuth("login");
            return;
        }

        showStartToast();
        mode = "player";
        if (resultPanel) resultPanel.hidden = true;
        clearBoard();
        xQueue = [];
        oQueue = [];
        gameStatus.textContent = "Searching for a live player...";
        command.textContent = "Scanning the live queue.";

        if (!socket) {
            socket = window.io(API_ORIGIN, {
                transports: ["polling", "websocket"],
                upgrade: true,
                withCredentials: true,
                autoConnect: false,
                auth: window.GamingSession.socketAuth
            });
        }

        if (!socketHandlersReady) {
            socket.on("session:expired", () => window.location.reload());
            socket.on("tic-tac-toe:matched", (data) => {
                ownSymbol = data.ownSymbol;
                gameStatus.textContent = `Live match · ${data.opponentUsername}`;
                renderMatch(data.match);
            });
            socket.on("tic-tac-toe:queue-status", () => {
                gameStatus.textContent = "Searching for a live player...";
            });
            socket.on("tic-tac-toe:state", (data) => renderMatch(data.match));
            socket.on("tic-tac-toe:xp-awarded", (data) => {
                if (currentUser) {
                    currentUser.xp = data.totalXp;
                    updateIdentity(currentUser);
                }
                showResult(match, data.xpEarned);
            });
            socket.on("tic-tac-toe:matchmaking-timeout", () => {
                gameStatus.textContent = "No player is live right now. Starting a match against the computer...";
                setTimeout(startComputer, 1200);
            });
            socket.on("tic-tac-toe:opponent-left", (data) => {
                gameStatus.textContent = data.message;
            });
            socket.on("tic-tac-toe:error", (data) => {
                gameStatus.textContent = data.message;
            });
            socketHandlersReady = true;
        }

        if (!socket.connected) socket.connect();
        socket.emit("tic-tac-toe:queue");
    };

    // Board move click handler with infinite queue management
    board?.addEventListener("click", async (event) => {
        const cell = event.target.closest(".board-cell");
        if (!cell || !match || match.status !== "active" || computerThinking) return;
        const index = Number(cell.dataset.cell);
        if (match.board?.[index]) return;

        try {
            if (mode === "computer") {
                computerThinking = true;
                const previousMatch = match;
                const optimisticBoard = match.board.slice();

                // Optimistically update board and queue for infinite mode
                if (activeVariant === "infinite" && xQueue.length >= 3) {
                    const oldest = xQueue[0];
                    optimisticBoard[oldest] = null;
                }
                optimisticBoard[index] = "X";

                const optimisticXQueue = activeVariant === "infinite"
                    ? (xQueue.length >= 3 ? xQueue.slice(1).concat(index) : xQueue.concat(index))
                    : [];

                renderMatch({
                    ...match,
                    board: optimisticBoard,
                    currentTurn: "O",
                    status: "active",
                    moveOrder: {
                        X: optimisticXQueue,
                        O: oQueue.slice()
                    }
                });

                gameStatus.textContent = "Computer is thinking...";
                await new Promise((resolve) => setTimeout(resolve, 600));

                const data = await api(`/games/tic-tac-toe/computer/matches/${previousMatch.matchId}/moves`, {
                    method: "POST",
                    body: JSON.stringify({ cell: index })
                });

                const completedMatch = data.match;
                computerThinking = false;
                renderMatch(completedMatch);

                if (completedMatch.xpEarned) {
                    currentUser.xp = completedMatch.totalXp;
                    updateIdentity(currentUser);
                    showResult(completedMatch, completedMatch.xpEarned);
                }
            } else {
                socket.emit("tic-tac-toe:move", { matchId: match.matchId, cell: index });
            }
        } catch (error) {
            computerThinking = false;
            gameStatus.textContent = error.message;
        }
    });

    // Variant selector buttons ("Standard Mode" and "Infinite Mode")
    document.querySelectorAll("[data-game-variant]").forEach((button) => {
        button.addEventListener("click", () => switchVariant(button.dataset.gameVariant));
    });

    // Mode buttons ("PLAY VS COMPUTER" and "PLAY VS PLAYER")
    document.querySelectorAll("[data-game-mode]").forEach((button) => {
        button.addEventListener("click", () => {
            button.dataset.gameMode === "computer" ? startComputer() : startPlayer();
        });
    });

    primary?.addEventListener("click", () => mode === "player" ? startPlayer() : startComputer());
    document.querySelector("#game-replay-button")?.addEventListener("click", () => mode === "player" ? startPlayer() : startComputer());
    document.querySelector("#game-new-player-button")?.addEventListener("click", () => { window.location.href = "./index.html"; });
    document.querySelector("#game-result-close")?.addEventListener("click", () => { if (resultPanel) resultPanel.hidden = true; });
    document.querySelector("#game-exit-button")?.addEventListener("click", () => {
        socket?.emit("tic-tac-toe:cancel");
        match = null;
        xQueue = [];
        oQueue = [];
        if (resultPanel) resultPanel.hidden = true;
        clearBoard();
        gameStatus.textContent = "Arena reset.";
    });

    document.querySelector("#auth-close-button")?.addEventListener("click", closeAuth);
    overlay?.addEventListener("click", (event) => { if (event.target === overlay) closeAuth(); });
    authView?.addEventListener("submit", (event) => {
        event.preventDefault();
        handleAuthSubmit(event.target);
    });


    playerButton?.addEventListener("click", () => currentUser ? openAuth("account") : openAuth("login"));
    playerButton?.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") playerButton.click();
    });

    navigation?.addEventListener("mousemove", (event) => {
        const rect = navigation.getBoundingClientRect();
        if (rect.width && rect.height) {
            navigation.style.setProperty("--mouse-x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
            navigation.style.setProperty("--mouse-y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
        }
    });
    navigation?.addEventListener("mouseleave", () => {
        navigation.style.setProperty("--mouse-x", "50%");
        navigation.style.setProperty("--mouse-y", "50%");
    });

    if (!isGamePage) renderLibrary();
    setupGameSearch();
    updateVariantButtons();
    clearBoard();
    authReady = refreshUser();
});
