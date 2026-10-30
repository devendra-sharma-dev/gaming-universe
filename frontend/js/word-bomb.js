"use strict";
document.addEventListener("DOMContentLoaded", async () => {
    try { await window.GamingSession.loadSocketClient(); }
    catch (error) {
        const msg = document.getElementById("word-bomb-message");
        if (msg) msg.textContent = error.message;
        return;
    }

    const host = window.location.hostname === "[::]" ? "[::]" : window.location.hostname || "localhost";
    const apiOrigin = window.GamingSession.apiOrigin;
    const socket = window.io(apiOrigin, { transports: ["websocket"], withCredentials: true, auth: window.GamingSession.socketAuth });

    const $ = (id) => document.getElementById(id);

    // Screens
    const screenLanding = $("screen-landing");
    const screenGame = $("screen-game");

    // Landing elements
    const message = $("word-bomb-message");
    const codeInput = $("word-bomb-code");
    const togglePublicBtn = $("toggle-public-btn");
    const togglePrivateBtn = $("toggle-private-btn");
    const lobbiesContainer = $("active-lobbies-container");
    const lobbiesRefreshBtn = $("lobbies-refresh-btn");
    const lobbiesNotice = $("lobbies-notice");
    const joinCodeNotice = $("join-code-notice");
    const soloHighScoreDisplay = $("solo-high-score-display");

    // Game screen elements
    const arena = $("word-bomb-arena");
    const orbit = $("word-bomb-orbit");
    const pointerOrbit = $("word-bomb-pointer-orbit");
    const sequence = $("word-bomb-sequence");
    const timerWrap = $("word-bomb-timer-wrap");
    const timer = $("word-bomb-timer");
    const turn = $("word-bomb-turn");
    const form = $("word-bomb-form");
    const input = $("word-bomb-input");
    const feed = $("word-bomb-feed");
    const exitBtn = $("word-bomb-exit-btn");
    const gameVisibilityBadge = $("game-visibility-badge");
    const gameCodeBadge = $("game-code-badge");
    const gameRoomCode = $("game-room-code");
    const gamePlayersBadge = $("game-players-badge");
    const lobbyHostControls = $("lobby-host-controls");
    const hostStartBtn = $("word-bomb-host-start");
    const hostHint = $("lobby-host-hint");
    const guestRenameBar = $("guest-rename-bar");
    const guestRenameInput = $("guest-rename-input");
    const guestRenameBtn = $("guest-rename-btn");
    const alphabetBadge = $("alphabet-progress-badge");
    const alphabetGrid = $("word-bomb-alphabet-grid");
    const alphabetStatus = $("alphabet-tracker-status");

    // Modal elements
    const modal = $("word-bomb-modal");
    const modalEmoji = $("modal-emoji");
    const modalTitle = $("modal-title");
    const modalSubtitle = $("modal-subtitle");
    const modalSoloScore = $("modal-solo-score");
    const modalXpVal = $("modal-xp-val");
    const modalRewardStatus = $("modal-reward-status");
    const modalTotalXp = $("modal-total-xp");
    const modalStandingsBox = $("modal-standings-box");
    const modalStandingsList = $("modal-standings-list");
    const modalPlayAgain = $("modal-play-again");
    const modalClose = $("modal-close");

    let room = null;
    let timerId = null;
    let identity = null;
    let guestXp = 0;
    let currentPointerAngle = 0;
    let isPublicCreation = true; // Default to public room
    let lastTurnPlayerId = null;
    let lastRound = null;
    let lobbyNoticeTimer = null;
    let joinCodeNoticeTimer = null;
    const rewardedMatches = new Set();

    const showLobbyNotice = (msg) => {
        if (!lobbiesNotice) return;
        lobbiesNotice.textContent = msg;
        lobbiesNotice.hidden = false;
        lobbiesNotice.style.display = "block";
        clearTimeout(lobbyNoticeTimer);
        lobbyNoticeTimer = setTimeout(() => {
            lobbiesNotice.hidden = true;
            lobbiesNotice.style.display = "none";
        }, 5000);
    };

    const showJoinCodeNotice = (msg) => {
        if (!joinCodeNotice) return;
        joinCodeNotice.textContent = msg;
        joinCodeNotice.hidden = false;
        joinCodeNotice.style.display = "block";
        clearTimeout(joinCodeNoticeTimer);
        joinCodeNoticeTimer = setTimeout(() => {
            joinCodeNotice.hidden = true;
            joinCodeNotice.style.display = "none";
        }, 5000);
    };

    // Solo High Score tracking (localStorage for logged in, sessionStorage for guests)
    const getStorageKey = () => {
        if (identity && !identity.isGuest && identity.id) {
            return `gaming_universe_wb_solo_high_${identity.id}`;
        }
        return "gaming_universe_wb_solo_high_guest";
    };

    const getStorageObj = () => {
        if (identity && !identity.isGuest && identity.id) {
            return window.localStorage;
        }
        return window.sessionStorage;
    };

    const getSoloHighScore = () => {
        try {
            const key = getStorageKey();
            const val = getStorageObj().getItem(key);
            return val ? parseInt(val, 10) || 0 : 0;
        } catch {
            return 0;
        }
    };

    const updateSoloHighScoreDisplay = () => {
        if (!soloHighScoreDisplay) return;
        const score = getSoloHighScore();
        soloHighScoreDisplay.textContent = `${score} ${score === 1 ? "WORD" : "WORDS"}`;
    };

    const recordSoloScore = (count) => {
        try {
            const current = getSoloHighScore();
            if (count > current) {
                getStorageObj().setItem(getStorageKey(), String(count));
                updateSoloHighScoreDisplay();
            }
        } catch {}
    };

    // Render lives: Active Remaining = Red ♥, Lost = White Broken Heart 💔 (supports A-Z extra lives)
    const renderLifeHearts = (lives) => {
        const currentLives = Math.max(0, Number(lives) || 0);
        const totalSlots = Math.max(3, currentLives);
        const alive = `<span class="heart-alive">♥</span>`.repeat(currentLives);
        const lost = `<span class="heart-lost">💔</span>`.repeat(totalSlots - currentLives);
        return `<span class="life-hearts" aria-label="${currentLives} lives">${alive}${lost}</span>`;
    };

    // Toggle Public vs Private
    togglePublicBtn?.addEventListener("click", () => {
        isPublicCreation = true;
        togglePublicBtn.classList.add("active");
        togglePrivateBtn.classList.remove("active");
    });
    togglePrivateBtn?.addEventListener("click", () => {
        isPublicCreation = false;
        togglePrivateBtn.classList.add("active");
        togglePublicBtn.classList.remove("active");
    });

    // Copy room code on click
    gameCodeBadge?.addEventListener("click", () => {
        if (!room?.code) return;
        navigator.clipboard.writeText(room.code).then(() => {
            const original = gameRoomCode.textContent;
            gameRoomCode.textContent = "COPIED!";
            setTimeout(() => { gameRoomCode.textContent = original; }, 1500);
        }).catch(() => {});
    });

    // Guest rename in lobby before match starts
    const handleGuestRename = () => {
        const newName = (guestRenameInput?.value || "").trim();
        if (!newName || newName.length < 2 || newName.length > 15) {
            if (message) message.textContent = "Guest name must be 2-15 characters.";
            return;
        }
        socket.emit("word-bomb:rename-guest", { username: newName });
    };

    guestRenameBtn?.addEventListener("click", handleGuestRename);
    guestRenameInput?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleGuestRename();
        }
    });

    const setScreen = (name) => {
        if (name === "game") {
            screenLanding.classList.remove("active");
            screenLanding.hidden = true;
            screenGame.classList.add("active");
            screenGame.hidden = false;
        } else {
            screenGame.classList.remove("active");
            screenGame.hidden = true;
            screenLanding.classList.add("active");
            screenLanding.hidden = false;
            updateSoloHighScoreDisplay();
            if (message) message.textContent = "";
            if (feed) feed.textContent = "";
            if (lobbiesNotice) {
                lobbiesNotice.hidden = true;
                lobbiesNotice.style.display = "none";
            }
            if (joinCodeNotice) {
                joinCodeNotice.hidden = true;
                joinCodeNotice.style.display = "none";
            }
            socket.emit("word-bomb:get-lobbies");
        }
    };

    const renderLobbiesList = (lobbies = []) => {
        if (!lobbiesContainer) return;
        if (!lobbies || lobbies.length === 0) {
            lobbiesContainer.innerHTML = `
                <div class="lobbies-empty">
                    <span class="empty-icon">🌐</span>
                    <strong>NO ACTIVE PUBLIC LOBBIES</strong>
                    <p>Be the first to create an open room for others to join!</p>
                </div>`;
            return;
        }

        lobbiesContainer.innerHTML = lobbies.map((lobby) => {
            const isFull = lobby.playerCount >= lobby.maxPlayers || lobby.isFull;
            return `
            <div class="lobby-item-card ${isFull ? "is-full" : ""}">
                <div class="lobby-item-info">
                    <strong>👑 @${lobby.hostUsername}</strong>
                    <div class="lobby-item-meta">
                        <span class="lobby-code-tag">CODE: ${lobby.code}</span>
                        <span class="lobby-count-tag ${isFull ? "tag-full" : ""}">${lobby.playerCount}/${lobby.maxPlayers} PLAYERS${isFull ? " (FULL)" : ""}</span>
                    </div>
                </div>
                <button class="game-action-button lobby-join-btn ${isFull ? "btn-full" : ""}" type="button" data-code="${lobby.code}">
                    ${isFull ? "FULL (6/6)" : "JOIN ▶"}
                </button>
            </div>
            `;
        }).join("");

        // Attach join handlers
        lobbiesContainer.querySelectorAll(".lobby-join-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                const code = btn.getAttribute("data-code");
                if (code) {
                    const lobby = lobbies.find((l) => l.code === code);
                    if (lobby && (lobby.playerCount >= lobby.maxPlayers || lobby.isFull)) {
                        showLobbyNotice(`⚠️ Lobby ${code} is currently full (6/6 players). Please join another room.`);
                        return;
                    }
                    socket.emit("word-bomb:join-room", { code });
                }
            });
        });
    };

    const render = (next) => {
        room = next;
        const roster = next.players || [];
        const isSolo = next.mode === "solo";
        const isActive = next.status === "active";
        const isLobby = next.status === "lobby";

        // Whenever inside a room (whether lobby or active), user is inside the Game UI!
        if (isSolo || next.code) {
            setScreen("game");
            if (isActive || isLobby) {
                modal.hidden = true;
                modal.style.display = "none";
            }
        } else {
            setScreen("landing");
        }

        // Top Status Bar Updates: In solo streak, hide 1/6 PLAYERS and ROOM: SOLO
        if (isSolo) {
            if (gameCodeBadge) {
                gameCodeBadge.hidden = true;
                gameCodeBadge.style.display = "none";
            }
            if (gamePlayersBadge) {
                gamePlayersBadge.hidden = true;
                gamePlayersBadge.style.display = "none";
            }
            if (gameVisibilityBadge) {
                gameVisibilityBadge.hidden = false;
                gameVisibilityBadge.style.display = "inline-flex";
                gameVisibilityBadge.textContent = "🔥 SOLO STREAK";
            }
        } else {
            if (gameCodeBadge) {
                gameCodeBadge.hidden = false;
                gameCodeBadge.style.display = "inline-flex";
            }
            if (gamePlayersBadge) {
                gamePlayersBadge.hidden = false;
                gamePlayersBadge.style.display = "inline-flex";
                gamePlayersBadge.textContent = `${roster.length}/6 PLAYERS`;
            }
            if (gameVisibilityBadge) {
                gameVisibilityBadge.hidden = false;
                gameVisibilityBadge.style.display = "inline-flex";
                gameVisibilityBadge.textContent = next.isPublic ? "🌐 PUBLIC" : "🔒 PRIVATE";
            }
            if (gameRoomCode) {
                gameRoomCode.textContent = next.code || "—";
            }
        }

        // Host determination
        const isHost = Boolean(identity && next.hostId === identity.id);

        // Guest rename bar: Only visible in lobby for guests
        if (guestRenameBar) {
            if (isLobby && identity?.isGuest) {
                guestRenameBar.hidden = false;
                guestRenameBar.style.display = "flex";
                if (guestRenameInput && !guestRenameInput.value) {
                    guestRenameInput.value = identity.username || "";
                }
            } else {
                guestRenameBar.hidden = true;
                guestRenameBar.style.display = "none";
            }
        }

        // Sequence / Center Bomb text
        if (sequence) {
            sequence.classList.remove("seq-len-4", "seq-len-5");
            if (isActive) {
                const seq = next.sequence || "—";
                sequence.textContent = seq;
                if (seq.length === 4) {
                    sequence.classList.add("seq-len-4");
                } else if (seq.length >= 5) {
                    sequence.classList.add("seq-len-5");
                }
            } else if (isLobby) {
                sequence.textContent = "READY?";
            } else {
                sequence.textContent = "—";
            }
        }

        // Solo timer vs Multiplayer pointer
        if (isSolo) {
            if (pointerOrbit) pointerOrbit.style.display = "none";
            if (timerWrap) timerWrap.style.display = isActive ? "flex" : "none";
            // Update solo streak high score during live run if active
            if (isActive && next.usedWords?.length) {
                recordSoloScore(next.usedWords.length);
            }
        } else {
            if (pointerOrbit) pointerOrbit.style.display = isActive ? "block" : "none";
            if (timerWrap) timerWrap.style.display = "none";
        }

        // Circular Uniform Placement for up to 6 players
        const n = roster.length;
        const step = n ? 360 / n : 360;
        const activeIndex = Math.max(0, roster.findIndex((p) => p.id === next.turnPlayerId));

        // Clockwise revolving pointer towards active turn player
        if (!isSolo && n > 0 && pointerOrbit && isActive) {
            const targetAngle = activeIndex * step;
            const currNorm = ((currentPointerAngle % 360) + 360) % 360;
            const targetNorm = ((targetAngle % 360) + 360) % 360;
            let delta = (targetNorm - currNorm + 360) % 360;
            if (delta === 0 && targetAngle !== currentPointerAngle && n > 1) {
                delta = 360;
            }
            currentPointerAngle += delta;
            pointerOrbit.style.transform = `translate(-50%, -50%) rotate(${currentPointerAngle}deg)`;
        }

        // Render player cards around the bomb with red remaining lives & white broken hearts
        const nodeMarkup = roster.map((p, index) => {
            const angle = index * step;
            const isTurn = p.id === next.turnPlayerId && isActive;
            const isEliminated = p.eliminated || p.lives <= 0;
            const isPlayerHost = p.id === next.hostId;
            const isMe = identity && p.id === identity.id;
            const classes = [
                "orbit-player",
                isTurn ? "is-active" : "",
                isEliminated ? "is-eliminated" : ""
            ].filter(Boolean).join(" ");
            return `<div class="${classes}" style="--player-angle:${angle}deg;">` +
                `<strong>${isPlayerHost ? "👑 " : ""}${p.username}${isMe ? " (YOU)" : ""}</strong>` +
                renderLifeHearts(p.lives) +
            `</div>`;
        }).join("");
        if (orbit) orbit.innerHTML = nodeMarkup;

        // Bottom Controls depending on Lobby vs Active Match
        if (isLobby) {
            if (form) {
                form.hidden = true;
                form.style.display = "none";
            }
            if (isHost) {
                if (lobbyHostControls) {
                    lobbyHostControls.hidden = false;
                    lobbyHostControls.style.display = "flex";
                }
                if (hostStartBtn) {
                    if (roster.length >= 2) {
                        hostStartBtn.disabled = false;
                        hostStartBtn.textContent = "START GAME ▶";
                        if (hostHint) hostHint.textContent = `Room ready (${roster.length}/6 players). Click to begin!`;
                    } else {
                        hostStartBtn.disabled = true;
                        hostStartBtn.textContent = "WAITING FOR PLAYERS (1/2 MIN)";
                        if (hostHint) hostHint.textContent = `Share code ${next.code} with friends or wait for public join.`;
                    }
                }
                if (turn) turn.textContent = `ROOM ${next.code} — YOU ARE THE HOST`;
            } else {
                if (lobbyHostControls) {
                    lobbyHostControls.hidden = true;
                    lobbyHostControls.style.display = "none";
                }
                // When in active lobby, strictly say: "WAITING FOR HOST TO START GAME..."
                if (turn) turn.textContent = "WAITING FOR HOST TO START GAME...";
            }
        } else if (isActive) {
            // MATCH ACTIVE: Strictly hide host controls and show form!
            if (lobbyHostControls) {
                lobbyHostControls.hidden = true;
                lobbyHostControls.style.display = "none";
            }
            if (form) {
                form.hidden = false;
                form.style.display = "flex";
            }
            const current = roster.find((p) => p.id === next.turnPlayerId);
            if (turn) {
                turn.textContent = isSolo ? "KEEP THE CORE ALIVE" : `${current?.username || "PLAYER"}'S TURN`;
            }
            input?.focus();
        } else {
            if (lobbyHostControls) {
                lobbyHostControls.hidden = true;
                lobbyHostControls.style.display = "none";
            }
            if (form) {
                form.hidden = true;
                form.style.display = "none";
            }
            if (turn) turn.textContent = "MATCH CONCLUDED";
        }

        // Helper to update bomb urgency styling across both Solo & Multiplayer
        const bombCenter = $("word-bomb-center");
        const bombVisual = $("word-bomb-visual");
        const updateBombUrgency = (remain) => {
            if (!bombCenter || !bombVisual) return;
            if (remain <= 4) {
                bombCenter.classList.add("is-critical");
                bombCenter.classList.remove("is-urgent");
                bombVisual.classList.add("is-critical");
                bombVisual.classList.remove("is-urgent");
            } else if (remain <= 8) {
                bombCenter.classList.add("is-urgent");
                bombCenter.classList.remove("is-critical");
                bombVisual.classList.add("is-urgent");
                bombVisual.classList.remove("is-critical");
            } else {
                bombCenter.classList.remove("is-urgent", "is-critical");
                bombVisual.classList.remove("is-urgent", "is-critical");
            }
        };

        // Timer countdown
        clearInterval(timerId);
        if (isActive) {
            const initialRemain = Math.max(0, (next.deadline - Date.now()) / 1000);
            if (timer) timer.textContent = initialRemain.toFixed(1);
            updateBombUrgency(initialRemain);

            timerId = setInterval(() => {
                const remain = Math.max(0, (next.deadline - Date.now()) / 1000);
                if (timer) timer.textContent = remain.toFixed(1);
                updateBombUrgency(remain);
            }, 100);
        } else {
            if (timer) timer.textContent = "20.0";
            if (bombCenter) bombCenter.classList.remove("is-urgent", "is-critical");
            if (bombVisual) bombVisual.classList.remove("is-urgent", "is-critical");
        }

        // Clear in-game feed when in lobby or whenever turn passes
        if (feed && (!isActive || isLobby)) {
            feed.textContent = "";
        } else if (feed && isActive) {
            if (lastTurnPlayerId !== null && (next.turnPlayerId !== lastTurnPlayerId || next.round !== lastRound)) {
                feed.textContent = "";
            }
        }
        lastTurnPlayerId = next.turnPlayerId;
        lastRound = next.round;

        // Update A-Z Alphabet Tracker for current viewing user
        const me = roster.find((p) => p.id === identity?.id) || roster[0];
        const usedLetters = me?.alphabetUsed || [];
        const usedSet = new Set(usedLetters.map((c) => String(c).toLowerCase()));
        if (alphabetGrid) {
            alphabetGrid.querySelectorAll(".alpha-chip").forEach((chip) => {
                const letter = chip.getAttribute("data-letter");
                if (letter && usedSet.has(letter.toLowerCase())) {
                    chip.classList.add("is-used");
                } else {
                    chip.classList.remove("is-used");
                }
            });
        }
    };

    // Button Actions
    $("word-bomb-quick").onclick = () => {
        if (feed) feed.textContent = "";
        socket.emit("word-bomb:solo-start");
    };

    $("word-bomb-create").onclick = () => {
        if (feed) feed.textContent = "";
        socket.emit("word-bomb:create-room", { isPublic: isPublicCreation });
    };

    $("word-bomb-join").onclick = () => {
        const code = (codeInput?.value || "").trim().toUpperCase();
        if (!code) {
            showJoinCodeNotice("Please enter a 6-character room code.");
            return;
        }
        if (feed) feed.textContent = "";
        socket.emit("word-bomb:join-room", { code });
    };

    lobbiesRefreshBtn?.addEventListener("click", () => {
        socket.emit("word-bomb:get-lobbies");
    });

    hostStartBtn?.addEventListener("click", () => {
        if (feed) feed.textContent = "";
        socket.emit("word-bomb:start-room");
    });

    // Leave button: Immediately leaves room cleanly with NO browser confirm/toast dialog!
    exitBtn?.addEventListener("click", () => {
        socket.emit("word-bomb:leave");
        room = null;
        if (feed) feed.textContent = "";
        setScreen("landing");
        if (modal) {
            modal.hidden = true;
            modal.style.display = "none";
        }
    });

    // Clear error message when user starts typing a new word
    input?.addEventListener("input", () => {
        if (feed) feed.textContent = "";
    });

    // Submission
    form.onsubmit = (event) => {
        event.preventDefault();
        if (!room || room.status !== "active") return;
        const word = input.value.trim();
        if (!word) return;
        if (feed) feed.textContent = "";
        socket.emit("word-bomb:submit", { word });
        input.select();
    };

    // User session identity
    window.GamingSession.fetch(`${apiOrigin}/api/v1/users/me`, { credentials: "include" })
        .then((response) => response.ok ? response.json() : null)
        .then((body) => {
            const user = body?.data?.user || body?.data;
            if (user?.username) {
                $("word-bomb-identity").textContent = `@${user.username}`;
            }
        })
        .catch(() => {});

    socket.on("session:expired", () => window.location.reload());
    socket.on("connect", () => {
        if ($("word-bomb-identity").textContent === "") $("word-bomb-identity").textContent = "GUEST";
        socket.emit("word-bomb:get-lobbies");
        updateSoloHighScoreDisplay();
    });

    socket.on("word-bomb:lobbies-list", ({ lobbies }) => {
        renderLobbiesList(lobbies);
    });

    socket.on("word-bomb:room-created", ({ room: created }) => {
        if (feed) feed.textContent = "";
        if (message) message.textContent = "";
        render(created);
    });

    socket.on("word-bomb:solo-started", ({ room: started }) => {
        if (feed) feed.textContent = "";
        if (message) message.textContent = "";
        render(started);
        input.focus();
    });

    socket.on("word-bomb:state", ({ room: next }) => {
        // If current user is not in the room roster, they have left and shouldn't be pulled in
        if (identity && next && !next.players.some((p) => p.id === identity.id)) {
            return;
        }
        render(next);
    });

    // Valid word entered: clear any previous error/invalid feedback
    socket.on("word-bomb:valid", () => {
        if (feed) feed.textContent = "";
    });

    socket.on("word-bomb:eliminated", () => {
        // Feed text intentionally suppressed to keep UI clean
    });

    socket.on("word-bomb:invalid", ({ message: text }) => {
        if (feed && room && room.status === "active") feed.textContent = `✕ ${text}`;
        arena?.classList.remove("arena-shake");
        void arena?.offsetWidth;
        arena?.classList.add("arena-shake");
        setTimeout(() => arena?.classList.remove("arena-shake"), 600);
    });

    socket.on("word-bomb:penalty", ({ username, reason }) => {
        if (feed) feed.textContent = "";
        arena?.classList.remove("arena-blast", "arena-shake");
        void arena?.offsetWidth;
        arena?.classList.add("arena-blast", "arena-shake");
        setTimeout(() => arena?.classList.remove("arena-blast", "arena-shake"), 900);
    });

    socket.on("word-bomb:alphabet-bonus", ({ username }) => {
        if (feed) feed.textContent = `⭐ ${username} completed A–Z and gained +1 LIFE!`;
        if (alphabetStatus) {
            alphabetStatus.textContent = "⭐ +1 EXTRA LIFE! A–Z COMPLETED!";
            alphabetStatus.classList.add("is-bonus");
            setTimeout(() => {
                alphabetStatus?.classList.remove("is-bonus");
                if (alphabetStatus) alphabetStatus.textContent = "26 LETTERS REMAINING FOR +1 LIFE";
            }, 3500);
        }
    });

    socket.on("word-bomb:identity", (value) => {
        identity = value;
        updateSoloHighScoreDisplay();
    });

    socket.on("word-bomb:name-updated", ({ username }) => {
        if (identity) identity.username = username;
        $("word-bomb-identity").textContent = username;
        if (guestRenameInput) guestRenameInput.value = username;
        if (message) message.textContent = `Name updated to ${username}!`;
    });

    // Rematch waiting notification for non-hosts
    socket.on("word-bomb:rematch-waiting", ({ message: msg }) => {
        if (modalSubtitle) modalSubtitle.textContent = msg;
        if (modalPlayAgain) {
            modalPlayAgain.textContent = "WAITING FOR HOST TO REPLAY...";
            modalPlayAgain.disabled = true;
        }
    });

    // Match Finished / Victory Modal
    socket.on("word-bomb:finished", ({ matchId, mode, reason, winner, wordsCount, players: finalPlayers }) => {
        clearInterval(timerId);
        const bombCenter = $("word-bomb-center");
        const bombVisual = $("word-bomb-visual");
        if (bombCenter) bombCenter.classList.remove("is-urgent", "is-critical");
        if (bombVisual) bombVisual.classList.remove("is-urgent", "is-critical");

        const isSolo = mode === "solo" || room?.mode === "solo" || !room?.code;
        const soloCount = wordsCount ?? room?.usedWords?.length ?? finalPlayers?.[0]?.streak ?? 0;
        const isMeWinner = Boolean(winner && identity && winner.id === identity.id);
        const myResult = finalPlayers?.find((p) => p.id === identity?.id) || finalPlayers?.[0];

        // Record solo streak high score if solo match completed
        if (isSolo) {
            recordSoloScore(soloCount);
        }

        if (modalEmoji) modalEmoji.textContent = isSolo ? (reason === "no-lives" ? "💥" : "🏆") : (winner ? "🏆" : "💥");
        if (modalTitle) {
            modalTitle.textContent = isSolo
                ? (reason === "no-lives" ? "STREAK ENDED" : "SOLO RUN COMPLETE")
                : (winner ? `${winner.username.toUpperCase()} WINS!` : "MATCH CONCLUDED");
        }

        // Match results section: Completely remove/hide in Solo Streak (solo player is always #1)
        if (modalStandingsBox) {
            if (isSolo) {
                modalStandingsBox.hidden = true;
                modalStandingsBox.style.display = "none";
            } else {
                modalStandingsBox.hidden = false;
                modalStandingsBox.style.display = "block";
            }
        }

        // Subtitle: For solo streak, completely remove "You reached Round X with Y words."
        if (modalSubtitle) {
            if (isSolo) {
                modalSubtitle.textContent = "";
                modalSubtitle.hidden = true;
                modalSubtitle.style.display = "none";
            } else {
                modalSubtitle.hidden = false;
                modalSubtitle.style.display = "block";
                modalSubtitle.textContent = winner
                    ? `${winner.username} survived the blast and claimed victory!`
                    : "All players were eliminated.";
            }
        }

        // Determine XP earned:
        // Solo streak: +10 XP every 5 words
        // Multiplayer: +10 XP for all participants, +30 XP for winner
        const myXpEarned = myResult?.xpEarned ?? (isSolo ? Math.floor(soloCount / 5) * 10 : (isMeWinner ? 30 : 10));

        if (isSolo) {
            if (modalSoloScore) {
                modalSoloScore.textContent = `Score: ${soloCount}`;
                modalSoloScore.hidden = false;
                modalSoloScore.style.display = "block";
            }
            if (modalXpVal) modalXpVal.textContent = `+${myXpEarned} XP`;
            if (modalRewardStatus) modalRewardStatus.textContent = "STREAK SUMMARY";
            if (modalTotalXp) {
                if (identity?.isGuest) {
                    if (myXpEarned > 0 && !rewardedMatches.has(matchId || room?.matchId)) {
                        rewardedMatches.add(matchId || room?.matchId);
                        guestXp += myXpEarned;
                        $("word-bomb-identity").textContent = `${identity?.username || "GUEST"} • ${guestXp} XP (UNSAVED)`;
                    }
                    modalTotalXp.textContent = `GUEST SESSION: ${guestXp} XP (SIGN IN TO SAVE)`;
                } else {
                    modalTotalXp.textContent = myResult?.totalXp !== null && myResult?.totalXp !== undefined
                        ? `TOTAL PLATFORM XP: ${myResult.totalXp}`
                        : "XP SAVED TO ACCOUNT";
                }
            }
        } else {
            if (modalSoloScore) {
                modalSoloScore.hidden = true;
                modalSoloScore.style.display = "none";
            }
            if (modalRewardStatus) {
                modalRewardStatus.textContent = isMeWinner ? "VICTORY REWARD" : "PARTICIPATION REWARD";
            }
            if (modalXpVal) modalXpVal.textContent = `+${myXpEarned} XP`;

            if (identity?.isGuest) {
                if (myXpEarned > 0 && !rewardedMatches.has(matchId || room?.matchId)) {
                    rewardedMatches.add(matchId || room?.matchId);
                    guestXp += myXpEarned;
                    $("word-bomb-identity").textContent = `${identity?.username || "GUEST"} • ${guestXp} XP (UNSAVED)`;
                }
                if (modalTotalXp) modalTotalXp.textContent = `GUEST SESSION: ${guestXp} XP (SIGN IN TO SAVE)`;
            } else {
                if (modalTotalXp) {
                    modalTotalXp.textContent = myResult?.totalXp !== null && myResult?.totalXp !== undefined
                        ? `TOTAL PLATFORM XP: ${myResult.totalXp}`
                        : "XP SAVED TO ACCOUNT";
                }
            }
        }

        // Standings list: Sorted by winner at top, runner-up 2nd (eliminated last), etc.
        // Current user highlighted with blue background & YOU pill
        const roster = (finalPlayers || room?.players || []).slice();
        roster.sort((a, b) => {
            if (winner && a.id === winner.id) return -1;
            if (winner && b.id === winner.id) return 1;

            if (a.eliminated !== b.eliminated) {
                return a.eliminated ? 1 : -1;
            }

            if (!a.eliminated && !b.eliminated) {
                if (b.lives !== a.lives) return b.lives - a.lives;
                return (b.streak || 0) - (a.streak || 0);
            }

            // Both eliminated: player eliminated LATER (higher eliminatedOrder) ranks HIGHER!
            if ((b.eliminatedOrder || 0) !== (a.eliminatedOrder || 0)) {
                return (b.eliminatedOrder || 0) - (a.eliminatedOrder || 0);
            }

            return (b.streak || 0) - (a.streak || 0);
        });

        if (modalStandingsList) {
            modalStandingsList.innerHTML = roster.map((p, idx) => {
                const isUser = Boolean(identity && p.id === identity.id);
                const isPWinner = Boolean(winner && p.id === winner.id);
                const rank = idx + 1;
                const rankLabel = rank === 1 ? "🥇 #1" : rank === 2 ? "🥈 #2" : rank === 3 ? "🥉 #3" : `#${rank}`;
                const liClass = isUser ? "is-current-user" : "";
                const youBadge = isUser ? `<span class="you-pill">YOU</span>` : "";
                const crown = isPWinner ? "👑 " : "";
                const statusHtml = p.eliminated
                    ? `<span style="color: rgba(255,255,255,0.45); font-size: 11px;">💀 ELIMINATED</span>`
                    : renderLifeHearts(p.lives);

                return `<li class="${liClass}">` +
                    `<div class="standings-player-info">` +
                        `<span class="standings-rank">${rankLabel}</span>` +
                        `<strong>${crown}${p.username}</strong>${youBadge}` +
                    `</div>` +
                    `<div>${statusHtml}</div>` +
                `</li>`;
            }).join("");
        }

        // Modal Play Again Button: Only host can trigger replay for the room
        if (modalPlayAgain) {
            modalPlayAgain.disabled = false;
            if (isSolo) {
                modalPlayAgain.textContent = "PLAY AGAIN 🔁";
                modalPlayAgain.onclick = () => {
                    modal.hidden = true;
                    modal.style.display = "none";
                    socket.emit("word-bomb:solo-start");
                };
            } else {
                const isHost = Boolean(identity && (room?.hostId === identity.id || room?.players[0]?.id === identity.id));
                if (isHost) {
                    modalPlayAgain.textContent = "REPLAY ROOM 🔁";
                    modalPlayAgain.onclick = () => {
                        modal.hidden = true;
                        modal.style.display = "none";
                        socket.emit("word-bomb:rematch");
                    };
                } else {
                    modalPlayAgain.textContent = "REQUEST REPLAY 🔁";
                    modalPlayAgain.onclick = () => {
                        socket.emit("word-bomb:rematch");
                        modalPlayAgain.disabled = true;
                        modalPlayAgain.textContent = "WAITING FOR HOST TO REPLAY...";
                        if (modalSubtitle) {
                            modalSubtitle.textContent = `You're ready! Waiting for the host (@${room?.hostUsername || "host"}) to restart the room...`;
                        }
                    };
                }
            }
        }

        if (modalClose) {
            modalClose.onclick = () => {
                modal.hidden = true;
                modal.style.display = "none";
                socket.emit("word-bomb:leave");
                room = null;
                setScreen("landing");
            };
        }

        modal.hidden = false;
        modal.style.display = "flex";
    });

    socket.on("word-bomb:error", ({ message: text, isFull, code }) => {
        const errorMsg = text || "An error occurred.";

        // If lobby is full, show subtle error message only in join room by code section (not in active lobby section)
        if (isFull || errorMsg.toLowerCase().includes("full")) {
            showJoinCodeNotice("⚠️ This room is currently full (maximum 6 players reached).");
            if (code && lobbiesContainer) {
                const btn = lobbiesContainer.querySelector(`.lobby-join-btn[data-code="${code}"]`);
                if (btn) {
                    btn.textContent = "FULL (6/6)";
                    btn.disabled = true;
                    btn.classList.add("btn-full");
                }
            }
            return;
        }

        // Room code not found
        if (errorMsg.toLowerCase().includes("code") || errorMsg.toLowerCase().includes("not found")) {
            showJoinCodeNotice(`✕ ${errorMsg}`);
            showLobbyNotice(`✕ ${errorMsg}`);
            return;
        }

        // Match in progress
        if (errorMsg.toLowerCase().includes("in progress")) {
            showLobbyNotice(`⚠️ Match already started. Mid-game join is not allowed.`);
            showJoinCodeNotice(`⚠️ Match in progress.`);
            return;
        }

        if (message) message.textContent = errorMsg;
        if (feed && room && room.status === "active") feed.textContent = `✕ ${errorMsg}`;
    });

    updateSoloHighScoreDisplay();
});
