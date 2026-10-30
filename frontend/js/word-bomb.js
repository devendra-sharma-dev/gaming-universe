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
    const socket = window.io(apiOrigin, {
        transports: ["polling", "websocket"],
        upgrade: true,
        withCredentials: true,
        auth: window.GamingSession.socketAuth
    });

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
    let localSoloActive = false;
    let localSoloRecentSequences = [];
    const localSubstrings = {
        2: ["AT", "AN", "IN", "ER", "RE", "ST", "ON", "OU", "EA", "AR", "CO", "DE", "EN", "ES", "LA", "MA", "NE", "OR", "RA", "RO", "TE", "TI", "AL", "LE", "ME", "SE", "CH", "SH", "TH"],
        3: ["ING", "ESS", "ATI", "ION", "TER", "NES", "TIO", "ATE", "ENT", "OUS", "CON", "FOR", "PRO", "STA", "TRA", "RES", "VER", "ALL", "INT", "AND", "PER", "COM", "EST", "EAR", "STR"],
        4: ["TION", "NESS", "ATIO", "ICAL", "ABLE", "OVER", "TING", "ALLY", "MENT", "ENCE", "ANCE", "PORT", "FORM", "LINE", "RING", "STAR", "HAND", "LAND", "WALL", "BACK"],
        5: ["ATION", "ENESS", "CALLY", "ICALL", "INTER", "TICAL", "GRAPH", "STAND", "LIGHT", "WATER", "ROUND", "PLACE", "HEART", "POINT", "POWER", "WORLD"]
    };

    const chooseLocalSequence = () => {
        const roll = Math.random();
        let length = 3;
        if (roll < 0.25) length = 2;
        else if (roll < 0.80) length = 3;
        else if (roll < 0.98) length = 4;
        else length = 5;

        const pool = localSubstrings[length] || localSubstrings[3];
        const candidates = pool.filter(s => !localSoloRecentSequences.includes(s));
        const finalPool = candidates.length > 0 ? candidates : pool;
        const chosen = finalPool[Math.floor(Math.random() * finalPool.length)];
        localSoloRecentSequences.push(chosen);
        if (localSoloRecentSequences.length > 25) localSoloRecentSequences.shift();
        return chosen;
    };

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
        if (identity && !identity.isGuest) {
            return `gaming_universe_wb_solo_high_${identity.id || identity.username}`;
        }
        return "gaming_universe_wb_solo_high_guest";
    };

    const getStorageObj = () => {
        if (identity && !identity.isGuest) {
            return window.localStorage;
        }
        return window.sessionStorage;
    };

    const getSoloHighScore = () => {
        try {
            const storage = window.localStorage;
            let maxScore = 0;

            // 1. If logged-in identity is known
            if (identity && !identity.isGuest) {
                const candidates = [
                    identity.id ? storage.getItem(`gaming_universe_wb_solo_high_${identity.id}`) : null,
                    identity.username ? storage.getItem(`gaming_universe_wb_solo_high_${identity.username}`) : null,
                    identity.username ? storage.getItem(`gaming_universe_wb_solo_high_${identity.username.toLowerCase()}`) : null,
                    storage.getItem("gaming_universe_wb_solo_high")
                ];
                for (const c of candidates) {
                    if (c) {
                        const parsed = parseInt(c, 10);
                        if (!isNaN(parsed) && parsed > maxScore) maxScore = parsed;
                    }
                }
            }

            // 2. Legacy key in localStorage
            const legacyVal = storage.getItem("gaming_universe_wb_solo_high");
            if (legacyVal) {
                const parsed = parseInt(legacyVal, 10);
                if (!isNaN(parsed) && parsed > maxScore) maxScore = parsed;
            }

            // 3. Scan all keys in localStorage starting with gaming_universe_wb_solo_high
            try {
                for (let i = 0; i < storage.length; i++) {
                    const k = storage.key(i);
                    if (k && k.startsWith("gaming_universe_wb_solo_high") && !k.endsWith("_guest")) {
                        const val = parseInt(storage.getItem(k), 10);
                        if (!isNaN(val) && val > maxScore) maxScore = val;
                    }
                }
            } catch {}

            if (maxScore > 0) return maxScore;

            // 4. Guest fallback in sessionStorage
            const guestVal = window.sessionStorage.getItem("gaming_universe_wb_solo_high_guest");
            return guestVal ? parseInt(guestVal, 10) || 0 : 0;
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
                const storage = window.localStorage;
                if (identity && !identity.isGuest) {
                    if (identity.id) storage.setItem(`gaming_universe_wb_solo_high_${identity.id}`, String(count));
                    if (identity.username) storage.setItem(`gaming_universe_wb_solo_high_${identity.username}`, String(count));
                    storage.setItem("gaming_universe_wb_solo_high", String(count));
                } else {
                    window.sessionStorage.setItem("gaming_universe_wb_solo_high_guest", String(count));
                    storage.setItem("gaming_universe_wb_solo_high", String(count));
                }
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
            fetchPublicLobbies();
            if (socket.connected) socket.emit("word-bomb:get-lobbies");
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
                    joinMultiplayerRoom(code);
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

                if (remain <= 0) {
                    clearInterval(timerId);
                    if (localSoloActive && room && room.status === "active") {
                        const me = room.players[0];
                        me.lives -= 1;
                        arena?.classList.remove("arena-blast", "arena-shake");
                        void arena?.offsetWidth;
                        arena?.classList.add("arena-blast", "arena-shake");
                        setTimeout(() => arena?.classList.remove("arena-blast", "arena-shake"), 900);

                        if (me.lives <= 0) {
                            me.eliminated = true;
                            finishLocalSolo("no-lives");
                        } else {
                            room.round += 1;
                            room.sequence = chooseLocalSequence();
                            room.deadline = Date.now() + 20000;
                            render(room);
                        }
                    }
                }
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
        const usedLetters = me?.alphabetProgress || me?.alphabetUsed || [];
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

    
    let roomPollTimer = null;

    const stopRoomPolling = () => {
        if (roomPollTimer) {
            clearInterval(roomPollTimer);
            roomPollTimer = null;
        }
    };

    const startRoomPolling = (code) => {
        stopRoomPolling();
        roomPollTimer = setInterval(async () => {
            if (!room || room.code !== code || room.mode === "solo") {
                stopRoomPolling();
                return;
            }
            try {
                const res = await window.GamingSession.fetch(`${apiOrigin}/api/v1/games/word-bomb/room/${code}`);
                if (res.ok) {
                    const body = await res.json();
                    const nextRoom = body.data?.room;
                    if (nextRoom) {
                        if (nextRoom.status === "finished" && room.status !== "finished") {
                            stopRoomPolling();
                            render(nextRoom);
                            const winner = nextRoom.players.find(p => p.id === nextRoom.winnerId);
                            showFinishModal({
                                matchId: nextRoom.matchId,
                                mode: "multiplayer",
                                reason: nextRoom.finishReason || "last-player",
                                winner,
                                wordsCount: nextRoom.usedWords?.length || 0,
                                players: nextRoom.players
                            });
                            return;
                        }
                        render(nextRoom);
                    }
                }
            } catch (_e) {}
        }, 1000);
    };

    const fetchPublicLobbies = async () => {
        try {
            const res = await window.GamingSession.fetch(`${apiOrigin}/api/v1/games/word-bomb/lobbies`);
            if (res.ok) {
                const body = await res.json();
                renderLobbiesList(body.data?.lobbies || []);
            }
        } catch (_e) {}
    };

    const createMultiplayerRoom = async (isPublic) => {
        localSoloActive = false;
        showLobbyNotice("Creating arena room...");
        try {
            const res = await window.GamingSession.fetch(`${apiOrigin}/api/v1/games/word-bomb/room/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isPublic, username: identity?.username })
            });
            const body = await res.json();
            if (res.ok && body.data?.room) {
                if (lobbiesNotice) {
                    lobbiesNotice.hidden = true;
                    lobbiesNotice.style.display = "none";
                }
                render(body.data.room);
                startRoomPolling(body.data.room.code);
                if (socket.connected) {
                    socket.emit("word-bomb:create-room", { isPublic });
                }
                return;
            }
            throw new Error(body.error?.message || "Failed to create room.");
        } catch (err) {
            showLobbyNotice(err.message || "Failed to create arena room.");
        }
    };

    const joinMultiplayerRoom = async (code) => {
        localSoloActive = false;
        showJoinCodeNotice("Joining arena room...");
        try {
            const res = await window.GamingSession.fetch(`${apiOrigin}/api/v1/games/word-bomb/room/join`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code, username: identity?.username })
            });
            const body = await res.json();
            if (res.ok && body.data?.room) {
                if (joinCodeNotice) {
                    joinCodeNotice.hidden = true;
                    joinCodeNotice.style.display = "none";
                }
                render(body.data.room);
                startRoomPolling(body.data.room.code);
                if (socket.connected) {
                    socket.emit("word-bomb:join-room", { code });
                }
                return;
            }
            if (body.error?.isFull) {
                showJoinCodeNotice("⚠️ This room is currently full (maximum 6 players reached).");
            } else {
                showJoinCodeNotice(`✕ ${body.error?.message || "Could not join room."}`);
            }
        } catch (err) {
            showJoinCodeNotice(err.message || "Could not join room.");
        }
    };

    // Button Actions
    const startLocalSoloStreak = () => {
        localSoloActive = true;
        localSoloRecentSequences = [];
        const initialSeq = chooseLocalSequence();

        const localPlayer = {
            id: identity?.id || "local-player",
            username: identity?.username || (identity?.isGuest ? "GUEST" : "YOU"),
            lives: 3,
            eliminated: false,
            streak: 0,
            alphabetProgress: [],
            isGuest: identity?.isGuest ?? true
        };

        const localRoom = {
            mode: "solo",
            status: "active",
            round: 1,
            sequence: initialSeq,
            deadline: Date.now() + 20000,
            turnPlayerId: localPlayer.id,
            players: [localPlayer],
            usedWords: []
        };

        if (feed) feed.textContent = "";
        if (message) message.textContent = "";
        render(localRoom);
        input?.focus();
    };

    const finishLocalSolo = async (reason) => {
        clearInterval(timerId);
        localSoloActive = false;
        const soloCount = room?.usedWords?.length || 0;
        recordSoloScore(soloCount);

        const myXpEarned = Math.floor(soloCount / 5) * 10;
        let totalXp = null;

        if (identity && !identity.isGuest && myXpEarned > 0) {
            try {
                const res = await window.GamingSession.fetch(`${apiOrigin}/api/v1/games/word-bomb/award-xp`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ xpEarned: myXpEarned })
                });
                if (res.ok) {
                    const data = await res.json();
                    totalXp = data?.data?.totalXp;
                }
            } catch {}
        } else if (identity?.isGuest && myXpEarned > 0) {
            guestXp += myXpEarned;
            $("word-bomb-identity").textContent = `${identity?.username || "GUEST"} • ${guestXp} XP (UNSAVED)`;
        }

        showFinishModal({
            matchId: "local-" + Date.now(),
            mode: "solo",
            reason,
            winner: null,
            wordsCount: soloCount,
            players: [{
                id: identity?.id || "local-player",
                username: identity?.username || (identity?.isGuest ? "GUEST" : "YOU"),
                streak: soloCount,
                lives: 0,
                eliminated: true,
                xpEarned: myXpEarned,
                totalXp
            }]
        });
    };

    // Button Actions
    $("word-bomb-quick").onclick = () => {
        if (feed) feed.textContent = "";
        startLocalSoloStreak();
    };

    $("word-bomb-create").onclick = () => {
        if (feed) feed.textContent = "";
        createMultiplayerRoom(isPublicCreation);
    };

    $("word-bomb-join").onclick = () => {
        const code = (codeInput?.value || "").trim().toUpperCase();
        if (!code) {
            showJoinCodeNotice("Please enter a 6-character room code.");
            return;
        }
        if (feed) feed.textContent = "";
        joinMultiplayerRoom(code);
    };

    lobbiesRefreshBtn?.addEventListener("click", () => {
        fetchPublicLobbies();
        if (socket.connected) socket.emit("word-bomb:get-lobbies");
    });

    hostStartBtn?.addEventListener("click", async () => {
        if (feed) feed.textContent = "";
        if (room?.code) {
            try {
                const res = await window.GamingSession.fetch(`${apiOrigin}/api/v1/games/word-bomb/room/start`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ code: room.code })
                });
                const body = await res.json();
                if (res.ok && body.data?.room) {
                    render(body.data.room);
                } else if (body.error?.message) {
                    if (feed) feed.textContent = `✕ ${body.error.message}`;
                }
            } catch (_e) {}
        }
        if (socket.connected) socket.emit("word-bomb:start-room");
    });

    // Leave button: Immediately leaves room cleanly with NO browser confirm/toast dialog!
    exitBtn?.addEventListener("click", () => {
        stopRoomPolling();
        if (localSoloActive) {
            clearInterval(timerId);
            localSoloActive = false;
        }
        if (room?.code) {
            window.GamingSession.fetch(`${apiOrigin}/api/v1/games/word-bomb/room/leave`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: room.code })
            }).catch(() => {});
        }
        if (socket.connected) socket.emit("word-bomb:leave");
        room = null;
        if (feed) feed.textContent = "";
        setScreen("landing");
        if (modal) {
            modal.hidden = true;
            modal.style.display = "none";
        }
        fetchPublicLobbies();
    });

    // Clear error message when user starts typing a new word
    input?.addEventListener("input", () => {
        if (feed) feed.textContent = "";
    });

    // Submission
    form.onsubmit = async (event) => {
        event.preventDefault();
        if (!room || room.status !== "active") return;
        const word = (input.value || "").trim().toLowerCase();
        if (!word) return;

        if (localSoloActive) {
            if (!/^[a-z]{3,64}$/.test(word) || !word.includes(room.sequence.toLowerCase())) {
                if (feed) feed.textContent = "✕ That word is not accepted for this sequence.";
                arena?.classList.remove("arena-shake");
                void arena?.offsetWidth;
                arena?.classList.add("arena-shake");
                setTimeout(() => arena?.classList.remove("arena-shake"), 600);
                return;
            }

            if (room.usedWords && room.usedWords.includes(word)) {
                if (feed) feed.textContent = "✕ Word already used this run.";
                arena?.classList.remove("arena-shake");
                void arena?.offsetWidth;
                arena?.classList.add("arena-shake");
                setTimeout(() => arena?.classList.remove("arena-shake"), 600);
                return;
            }

            // Quick dictionary validation check
            let isValid = false;
            try {
                const resp = await window.GamingSession.fetch(`${apiOrigin}/api/v1/games/word-bomb/validate?word=${encodeURIComponent(word)}`);
                if (resp.ok) {
                    const data = await resp.json();
                    isValid = Boolean(data?.valid);
                } else {
                    isValid = true;
                }
            } catch {
                isValid = true;
            }

            if (!isValid) {
                if (feed) feed.textContent = "✕ That word is not accepted for this sequence.";
                arena?.classList.remove("arena-shake");
                void arena?.offsetWidth;
                arena?.classList.add("arena-shake");
                setTimeout(() => arena?.classList.remove("arena-shake"), 600);
                return;
            }

            // Word accepted!
            if (feed) feed.textContent = "";
            room.usedWords.push(word);
            const me = room.players[0];
            me.streak = room.usedWords.length;

            // A-Z tracking
            if (!me.alphabetProgress) me.alphabetProgress = [];
            for (const char of word) {
                if (char >= "a" && char <= "z" && !me.alphabetProgress.includes(char)) {
                    me.alphabetProgress.push(char);
                }
            }
            if (me.alphabetProgress.length >= 26) {
                me.lives += 1;
                me.alphabetProgress = [];
                if (alphabetStatus) {
                    alphabetStatus.textContent = "⭐ +1 EXTRA LIFE! A–Z COMPLETED!";
                    alphabetStatus.classList.add("is-bonus");
                    setTimeout(() => {
                        alphabetStatus?.classList.remove("is-bonus");
                        if (alphabetStatus) alphabetStatus.textContent = "26 LETTERS REMAINING FOR +1 LIFE";
                    }, 3500);
                }
            }

            // Next sequence
            room.round += 1;
            room.sequence = chooseLocalSequence();
            room.deadline = Date.now() + 20000;
            input.value = "";
            render(room);
            return;
        }

        if (feed) feed.textContent = "";
        if (room?.code) {
            try {
                const res = await window.GamingSession.fetch(`${apiOrigin}/api/v1/games/word-bomb/room/submit`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ code: room.code, word })
                });
                const body = await res.json();
                if (res.ok && body.data?.valid) {
                    if (feed) feed.textContent = "";
                    render(body.data.room);
                    input.value = "";
                } else {
                    if (feed) feed.textContent = `✕ ${body.data?.message || body.error?.message || "That word is not accepted."}`;
                    arena?.classList.remove("arena-shake");
                    void arena?.offsetWidth;
                    arena?.classList.add("arena-shake");
                    setTimeout(() => arena?.classList.remove("arena-shake"), 600);
                }
            } catch (_e) {}
        }
        if (socket.connected) socket.emit("word-bomb:submit", { word });
        input.select();
    };

    // User session identity
    window.GamingSession.fetch(`${apiOrigin}/api/v1/users/me`, { credentials: "include" })
        .then((response) => response.ok ? response.json() : null)
        .then((body) => {
            const user = body?.data?.user || body?.data;
            if (user?.username) {
                currentUser = user;
                $("word-bomb-identity").textContent = `@${user.username}`;
                playerStatusDot?.classList.add("is-active");
                identity = {
                    id: String(user.id || user._id || ""),
                    username: user.username,
                    isGuest: false
                };
                updateSoloHighScoreDisplay();
            } else {
                currentUser = null;
                playerStatusDot?.classList.remove("is-active");
            }
        })
        .catch(() => {});

    // ─────────────────────────────────────────────────────────────
    // AUTH MODAL & PROFILE CONTROLLER
    // ─────────────────────────────────────────────────────────────
    let currentUser = null;
    const authOverlay = $("auth-overlay");
    const authView = $("auth-view");
    const authMessage = $("auth-message");
    const authTitle = $("auth-title");
    const authNavEl = $("auth-navigation");
    const playerMenuBtn = $("player-menu-button");
    const authCloseBtn = $("auth-close-button");
    const playerStatusDot = document.querySelector(".player-status");

    let authStep = "login";
    let authContext = {};
    let authResendTimer = null;
    let authUsernameTimer = null;

    const setAuthMessage = (msg, isError = false) => {
        if (authMessage) {
            authMessage.textContent = msg || "";
            authMessage.className = `auth-message ${isError ? "is-error" : ""}`;
        }
    };

    const openAuth = (step = "login", ctx = {}) => {
        authStep = step;
        authContext = ctx;
        if (authOverlay) {
            authOverlay.hidden = false;
            authOverlay.setAttribute("aria-hidden", "false");
        }
        renderAuth();
    };

    const closeAuth = () => {
        if (!authOverlay) return;
        authOverlay.hidden = true;
        authOverlay.setAttribute("aria-hidden", "true");
    };

    const renderAuth = () => {
        if (!authView) return;
        clearInterval(authResendTimer);
        clearTimeout(authUsernameTimer);
        setAuthMessage("");

        if (authStep === "account") {
            authTitle.innerHTML = "PLAYER <span>PROFILE</span>";
            setAuthMessage("Manage your player profile and security credentials.");
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
            if (authNavEl) authNavEl.hidden = true;
            return;
        }

        if (authStep === "update-password") {
            authTitle.innerHTML = "SECURITY <span>SETTINGS</span>";
            setAuthMessage("We sent a 6-digit verification code to " + (currentUser?.email || "your email") + ". Enter code and new password.");
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
            if (authNavEl) authNavEl.hidden = true;
            authView.querySelector("input")?.focus();
            return;
        }

        if (authStep === "otp") {
            authTitle.innerHTML = "EMAIL <span>VERIFICATION</span>";
            setAuthMessage("We sent a 6-digit code to " + authContext.email + ". Enter it below to continue creating your account.");
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
            if (authNavEl) {
                authNavEl.hidden = false;
                authNavEl.innerHTML = `
                    <div class="auth-nav-row">
                        <button type="button" class="auth-nav-link" data-auth-switch="signup">USE ANOTHER EMAIL</button>
                        <button type="button" class="auth-nav-link secondary" data-auth-switch="login">BACK TO SIGN IN</button>
                    </div>
                `;
            }
            authView.querySelector("input")?.focus();
            return;
        }

        if (authStep === "username") {
            authTitle.innerHTML = "SETUP <span>IDENTITY</span>";
            setAuthMessage("Choose your unique gaming handle and password.");
            authView.innerHTML = `
                <form class="auth-form" data-auth-action="register">
                    <h3>CREATE PROFILE & PASSWORD</h3>
                    <div class="auth-field">
                        <label class="auth-field-label" for="auth-reg-user">CHOOSE USERNAME</label>
                        <input id="auth-reg-user" name="username" type="text" minlength="3" maxlength="20" pattern="[A-Za-z0-9_]{3,20}" autocomplete="username" placeholder="Unique handle" required>
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
            if (authNavEl) authNavEl.hidden = true;
            authView.querySelector("input")?.focus();
            return;
        }

        if (authStep === "signup") {
            authTitle.innerHTML = "JOIN THE <span>UNIVERSE</span>";
            setAuthMessage("Enter your email address to receive a 6-digit verification code to create your account.");
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
            if (authNavEl) {
                authNavEl.hidden = false;
                authNavEl.innerHTML = `
                    <div class="auth-nav-row">
                        <button type="button" class="auth-nav-link" data-auth-switch="login">ALREADY REGISTERED? SIGN IN</button>
                    </div>
                `;
            }
            authView.querySelector("input")?.focus();
            return;
        }

        // Default: 'login' (Password sign in)
        authTitle.innerHTML = "ENTER THE <span>UNIVERSE</span>";
        setAuthMessage("Sign in with your username/email and password.");
        authView.innerHTML = `
            <div class="auth-mode-switch">
                <button type="button" class="auth-tab active" data-auth-switch="login">PASSWORD SIGN IN</button>
                <button type="button" class="auth-tab" data-auth-switch="signup">EMAIL CODE / SIGN UP</button>
            </div>
            <form class="auth-form" data-auth-action="login">
                <div class="auth-field">
                    <label class="auth-field-label" for="auth-login-identifier">USERNAME OR EMAIL</label>
                    <input id="auth-login-identifier" name="identifier" type="text" autocomplete="username" placeholder="Enter username or email" required>
                </div>
                <div class="auth-field">
                    <label class="auth-field-label" for="auth-login-password">PASSWORD</label>
                    <input id="auth-login-password" name="password" type="password" autocomplete="current-password" placeholder="Enter your password" required>
                </div>
                <button class="game-action-button" type="submit">SIGN IN</button>
            </form>
        `;
        if (authNavEl) {
            authNavEl.hidden = false;
            authNavEl.innerHTML = `
                <div class="auth-nav-row">
                    <button type="button" class="auth-nav-link" data-auth-switch="signup">NEW HERE? CREATE ACCOUNT</button>
                </div>
            `;
        }
        authView.querySelector("input")?.focus();
    };

    const handleAuthSubmit = async (form) => {
        const action = form.dataset.authAction;
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        try {
            if (action === "login") {
                const identifier = form.identifier.value.trim();
                const password = form.password.value;
                const res = await window.GamingSession.fetch(`${apiOrigin}/api/v1/auth/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ identifier, password })
                });
                const body = await res.json();
                if (!res.ok) throw new Error(body.error?.message || "Login failed.");
                const user = body.data?.user || body.data;
                currentUser = user;
                if (user?.username) {
                    $("word-bomb-identity").textContent = `@${user.username}`;
                    playerStatusDot?.classList.add("is-active");
                    identity = {
                        id: String(user.id || user._id || ""),
                        username: user.username,
                        isGuest: false
                    };
                    updateSoloHighScoreDisplay();
                }
                closeAuth();
                window.GamingSession?.identityChanged();
            } else if (action === "send-otp") {
                const email = form.email.value.trim().toLowerCase();
                const res = await window.GamingSession.fetch(`${apiOrigin}/api/v1/auth/otp/send`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email })
                });
                const body = await res.json();
                if (!res.ok) throw new Error(body.error?.message || "Could not send verification code.");
                openAuth("otp", { email });
            } else if (action === "verify-otp") {
                const otp = form.otp.value.trim();
                const res = await window.GamingSession.fetch(`${apiOrigin}/api/v1/auth/otp/verify`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: authContext.email, otp })
                });
                const body = await res.json();
                if (!res.ok) throw new Error(body.error?.message || "Invalid verification code.");
                openAuth("username", { email: authContext.email, otp });
            } else if (action === "register") {
                const username = form.username.value.trim();
                const password = form.password.value;
                const confirmPassword = form.confirmPassword.value;
                if (password !== confirmPassword) throw new Error("Passwords do not match.");
                const res = await window.GamingSession.fetch(`${apiOrigin}/api/v1/auth/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: authContext.email, otp: authContext.otp, username, password })
                });
                const body = await res.json();
                if (!res.ok) throw new Error(body.error?.message || "Registration failed.");
                const user = body.data?.user || body.data;
                currentUser = user;
                if (user?.username) {
                    $("word-bomb-identity").textContent = `@${user.username}`;
                    playerStatusDot?.classList.add("is-active");
                    identity = {
                        id: String(user.id || user._id || ""),
                        username: user.username,
                        isGuest: false
                    };
                    updateSoloHighScoreDisplay();
                }
                closeAuth();
                window.GamingSession?.identityChanged();
            } else if (action === "update-password") {
                const otp = form.otp.value.trim();
                const newPassword = form.newPassword.value;
                const confirmNewPassword = form.confirmNewPassword.value;
                if (newPassword !== confirmNewPassword) throw new Error("Passwords do not match.");
                const res = await window.GamingSession.fetch(`${apiOrigin}/api/v1/auth/password/update`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ otp, newPassword })
                });
                const body = await res.json();
                if (!res.ok) throw new Error(body.error?.message || "Password update failed.");
                setAuthMessage("Password updated successfully!");
                setTimeout(() => openAuth("account"), 1200);
            }
        } catch (err) {
            setAuthMessage(err.message || "An error occurred.", true);
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    };

    authView?.addEventListener("submit", (e) => {
        e.preventDefault();
        handleAuthSubmit(e.target);
    });

    document.addEventListener("click", async (e) => {
        const switchBtn = e.target.closest("[data-auth-switch]");
        if (switchBtn) {
            openAuth(switchBtn.dataset.authSwitch);
            return;
        }

        if (e.target.closest("[data-auth-start-update-pw]")) {
            try {
                const res = await window.GamingSession.fetch(`${apiOrigin}/api/v1/auth/password/otp/send`, { method: "POST" });
                const body = await res.json();
                if (!res.ok) throw new Error(body.error?.message || "Could not send verification code.");
                openAuth("update-password");
            } catch (err) {
                setAuthMessage(err.message || "Could not send update code.", true);
            }
            return;
        }

        if (e.target.closest("[data-auth-logout]")) {
            try {
                await window.GamingSession.fetch(`${apiOrigin}/api/v1/auth/logout`, { method: "POST" });
            } catch (_err) {}
            window.GamingSession?.clearSession();
            currentUser = null;
            identity = { id: "", username: "GUEST", isGuest: true };
            $("word-bomb-identity").textContent = "GUEST";
            playerStatusDot?.classList.remove("is-active");
            updateSoloHighScoreDisplay();
            closeAuth();
            window.GamingSession?.identityChanged();
            window.location.reload();
            return;
        }
    });

    authView?.addEventListener("input", async (e) => {
        if (e.target.id === "auth-reg-user") {
            const val = e.target.value.trim();
            const statusEl = document.getElementById("username-status");
            const submitBtn = authView.querySelector('button[type="submit"]');
            if (val.length < 3) {
                if (statusEl) { statusEl.textContent = "Minimum 3 characters."; statusEl.className = "username-status is-error"; }
                if (submitBtn) submitBtn.disabled = true;
                return;
            }
            clearTimeout(authUsernameTimer);
            authUsernameTimer = setTimeout(async () => {
                try {
                    const res = await window.GamingSession.fetch(`${apiOrigin}/api/v1/auth/username/check?username=${encodeURIComponent(val)}`);
                    const data = await res.json();
                    if (data.data?.available) {
                        if (statusEl) { statusEl.textContent = `@${val} is available!`; statusEl.className = "username-status is-available"; }
                        if (submitBtn) submitBtn.disabled = false;
                    } else {
                        if (statusEl) { statusEl.textContent = `@${val} is taken. Try another.`; statusEl.className = "username-status is-error"; }
                        if (submitBtn) submitBtn.disabled = true;
                    }
                } catch (_e) {}
            }, 300);
        }
    });

    playerMenuBtn?.addEventListener("click", () => {
        if (currentUser) openAuth("account");
        else openAuth("login");
    });
    playerMenuBtn?.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (currentUser) openAuth("account");
            else openAuth("login");
        }
    });
    authCloseBtn?.addEventListener("click", closeAuth);
    authOverlay?.addEventListener("click", (e) => {
        if (e.target === authOverlay) closeAuth();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && authOverlay && !authOverlay.hidden) closeAuth();
    });

    // Liquid Glass Navigation Mouse Glow
    (() => {
        const nav = document.querySelector(".main-navigation");
        if (!nav) return;
        nav.addEventListener("mousemove", (e) => {
            const r = nav.getBoundingClientRect();
            if (r.width && r.height) {
                nav.style.setProperty("--mouse-x", `${((e.clientX - r.left) / r.width) * 100}%`);
                nav.style.setProperty("--mouse-y", `${((e.clientY - r.top) / r.height) * 100}%`);
            }
        });
        nav.addEventListener("mouseleave", () => {
            nav.style.setProperty("--mouse-x", "50%");
            nav.style.setProperty("--mouse-y", "50%");
        });
    })();

    // Global Game Search in Header
    (() => {
        const searchInput = $("game-search");
        const searchResults = $("game-search-results");
        if (!searchInput || !searchResults) return;

        const catalog = [
            { id: "001", title: "Tic Tac Toe", type: "STRATEGY / 2 PLAYERS", url: "index.html" },
            { id: "002", title: "Word Bomb", type: "WORD / REALTIME ARENA", url: "word-bomb.html" },
            { id: "003", title: "Timeline", type: "KNOWLEDGE / DAILY CHALLENGE", url: "timeline.html" },
            { id: "004", title: "Mystery Country", type: "GEOGRAPHY / DAILY CHALLENGE", url: "mystery-country.html" },
            { id: "005", title: "Estimate It", type: "ESTIMATION / DAILY CHALLENGE", url: "estimate-it.html" },
            { id: "006", title: "Mini Olympics", type: "SPORTS / 5-EVENT CHAMPIONSHIP", url: "mini-olympics.html" },
            { id: "007", title: "Clever Chaos", type: "PUZZLE / 50-STAGE SAGA", url: "puzzle-quest.html" },
            { id: "008", title: "Cricket Arcade", type: "SPORTS / RUN CHASE", url: "cricket.html" }
        ];

        searchInput.addEventListener("input", () => {
            const query = searchInput.value.trim().toLowerCase();
            if (!query) {
                searchResults.hidden = true;
                searchResults.innerHTML = "";
                return;
            }
            const matches = catalog.filter((g) => g.title.toLowerCase().includes(query) || g.type.toLowerCase().includes(query));
            if (matches.length === 0) {
                searchResults.innerHTML = '<p class="search-empty">NO MATCHING GAMES</p>';
            } else {
                searchResults.innerHTML = matches.map((g) => `
                    <a href="./${g.url}">
                        <span>${g.id}</span>
                        <strong>${g.title}</strong>
                        <small>${g.type}</small>
                    </a>
                `).join("");
            }
            searchResults.hidden = false;
        });

        document.addEventListener("click", (e) => {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.hidden = true;
            }
        });
    })();



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
        identity = {
            id: String(value?.id || identity?.id || ""),
            username: value?.username || identity?.username || "GUEST",
            isGuest: Boolean(value?.isGuest)
        };
        if (identity.username) {
            $("word-bomb-identity").textContent = identity.isGuest ? identity.username : `@${identity.username}`;
        }
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
    const showFinishModal = ({ matchId, mode, reason, winner, wordsCount, players: finalPlayers }) => {
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
    };

    socket.on("word-bomb:finished", showFinishModal);

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
    fetchPublicLobbies();
});
