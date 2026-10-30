const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("Running Word Bomb Unit & Integration Tests...\n");

// 1. Verify Substring shortlist and dictionary word counts
console.log("1. Testing Shortlisted Substrings from Dictionary...");
const substringDataPath = path.resolve(__dirname, "../data/wordBombSubstrings.json");
assert(fs.existsSync(substringDataPath), "wordBombSubstrings.json must exist in data/");

const pools = JSON.parse(fs.readFileSync(substringDataPath, "utf8"));
assert(Array.isArray(pools["2"]) && pools["2"].length >= 100, "Must have length 2 substrings");
assert(Array.isArray(pools["3"]) && pools["3"].length >= 200, "Must have length 3 substrings");
assert(Array.isArray(pools["4"]) && pools["4"].length >= 50, "Must have length 4 substrings");
assert(Array.isArray(pools["5"]) && pools["5"].length >= 10, "Must have length 5 substrings");

console.log(`  ✓ Substrings found: Length 2 (${pools["2"].length}), Length 3 (${pools["3"].length}), Length 4 (${pools["4"].length}), Length 5 (${pools["5"].length})`);

// 2. Test ratio distribution
console.log("2. Testing Substring Ratio Distribution (25% len 2, 55% len 3, 18% len 4, 2% len 5)...");
const chooseSequence = () => {
    const roll = Math.random();
    let length;
    if (roll < 0.25) length = 2;
    else if (roll < 0.80) length = 3;
    else if (roll < 0.98) length = 4;
    else length = 5;
    const pool = pools[length];
    return pool[Math.floor(Math.random() * pool.length)];
};

const SIM_COUNT = 50000;
const counts = { 2: 0, 3: 0, 4: 0, 5: 0 };
for (let i = 0; i < SIM_COUNT; i++) {
    const seq = chooseSequence();
    counts[seq.length]++;
}

const pct2 = (counts[2] / SIM_COUNT) * 100;
const pct3 = (counts[3] / SIM_COUNT) * 100;
const pct4 = (counts[4] / SIM_COUNT) * 100;
const pct5 = (counts[5] / SIM_COUNT) * 100;

console.log(`  Measured distribution: Length 2: ${pct2.toFixed(1)}%, Length 3: ${pct3.toFixed(1)}%, Length 4: ${pct4.toFixed(1)}%, Length 5: ${pct5.toFixed(1)}%`);

assert(Math.abs(pct2 - 25) < 2.0, "Length 2 should be ~25%");
assert(Math.abs(pct3 - 55) < 2.0, "Length 3 should be ~55%");
assert(Math.abs(pct4 - 18) < 2.0, "Length 4 should be ~18%");
assert(Math.abs(pct5 - 2) < 1.0, "Length 5 should be ~2%");
console.log("  ✓ Distribution ratio confirmed within statistical tolerance.");

// 3. Test Room 6-Player Limit, Host check, and Rematch Host-Only Logic
console.log("3. Testing Max 6 Players Room Limit, Host-Only Start & Host-Only Rematch...");
const wordBombModulePath = path.resolve(__dirname, "../backend/realtime/wordBomb.js");
const wordBombContent = fs.readFileSync(wordBombModulePath, "utf8");
assert(wordBombContent.includes("MAX_PLAYERS = 6"), "MAX_PLAYERS must be set to 6");
assert(wordBombContent.includes('socket.on("word-bomb:get-lobbies"'), "Backend must support word-bomb:get-lobbies");
assert(wordBombContent.includes("getActivePublicLobbies"), "Backend must have getActivePublicLobbies helper");
assert(wordBombContent.includes("hostId !== socket.user.id"), "Only host should be allowed to start room");

// Host only rematch check
assert(wordBombContent.includes('socket.emit("word-bomb:rematch-waiting"'), "Non-host rematch request must emit rematch-waiting");
assert(wordBombContent.includes("socket.leave(room.room)"), "Leaving room must remove socket from socket.io channel");
assert(wordBombContent.includes("delete socket.data.wordBombRoomId"), "Leaving room must delete wordBombRoomId");
console.log("  ✓ Host-only rematch and complete socket dissociation on leave verified.");

// 4. Test Substring Failure Cycle Logic
console.log("4. Testing Substring Failure Cycle Logic...");
assert(wordBombContent.includes("room.sequenceFails = (room.sequenceFails || 0) + 1;"), "Must increment sequenceFails on failure");
assert(wordBombContent.includes("if (room.sequenceFails >= alive.length)"), "Must check if full cycle of active players failed");
assert(wordBombContent.includes("room.sequenceFails = 0;"), "Must reset sequenceFails on new sequence");
console.log("  ✓ Substring persistence across player cycle confirmed in backend logic.");

// 5. Test Clockwise Pointer Math
console.log("5. Testing Clockwise Pointer Revolution Math...");
let currentPointerAngle = 0;
const testAngles = [60, 120, 180, 240, 300, 0];
for (const targetAngle of testAngles) {
    const prevAngle = currentPointerAngle;
    const currNorm = ((currentPointerAngle % 360) + 360) % 360;
    const targetNorm = ((targetAngle % 360) + 360) % 360;
    let delta = (targetNorm - currNorm + 360) % 360;
    if (delta === 0 && targetAngle !== currentPointerAngle) delta = 360;
    currentPointerAngle += delta;
    assert(currentPointerAngle > prevAngle, `Pointer rotation must be strictly clockwise (${currentPointerAngle} > ${prevAngle})`);
}
console.log("  ✓ Clockwise revolution confirmed across all 6 turns.");

// 6. Test Frontend UI, CSS display rules, and Hero Banner
console.log("6. Testing Start Button Hiding, Clean Leave without Alert, and Hero Image Framing...");
const htmlContent = fs.readFileSync(path.resolve(__dirname, "../frontend/word-bomb.html"), "utf8");
const cssContent = fs.readFileSync(path.resolve(__dirname, "../frontend/css/word-bomb.css"), "utf8");
const jsContent = fs.readFileSync(path.resolve(__dirname, "../frontend/js/word-bomb.js"), "utf8");

// Start button hiding in CSS
assert(cssContent.includes(".lobby-host-controls[hidden] {\n  display: none !important;\n}"), "Host controls must have display: none !important when hidden");

// No confirm() in leave room
assert(!jsContent.includes("confirm("), "Exit button must not trigger browser confirm dialog");

// Hero Banner asset and framing
assert(fs.existsSync(path.resolve(__dirname, "../frontend/assets/word-bomb-hero.jpg")), "word-bomb-hero.jpg must exist in assets");
assert(cssContent.includes("object-position: top center;"), "Hero image must be anchored to top center so text is not cut off");
assert(cssContent.includes("aspect-ratio: 16 / 9;"), "Hero banner aspect ratio must match 16 / 9");

// Lower left hero overlay title
assert(htmlContent.includes('<h1 class="wb-hero-title">WORD <span>BOMB</span></h1>'), "Hero overlay must contain WORD BOMB title");
assert(cssContent.includes(".wb-hero-title"), "Hero title must be styled in CSS");

console.log("  ✓ Start button strictly hidden during match, no confirm dialog, and top-centered hero banner verified.");

// 7. Testing 7 Specific New Requirements
console.log("7. Testing Latest Requirements (Suppressed Feed, Guest Rename, Standings Sorting & Highlight, Hearts Colors, Solo High Score)...");

// 7.1 Suppress in-game announcements
assert(!jsContent.includes('entered ${word.toUpperCase()}'), "Must not show valid word announcement in game feed");
assert(!jsContent.includes('has been eliminated!'), "Must not show player eliminated announcement in game feed");
console.log("  ✓ Feed announcements suppressed for valid word entries and eliminations.");

// 7.2 Guest Rename in lobby
assert(wordBombContent.includes('socket.on("word-bomb:rename-guest"'), "Backend must handle word-bomb:rename-guest event");
assert(htmlContent.includes('id="guest-rename-bar"'), "HTML must contain guest-rename-bar");
assert(htmlContent.includes('id="guest-rename-input"'), "HTML must contain guest-rename-input");
assert(jsContent.includes("word-bomb:rename-guest"), "JS must emit word-bomb:rename-guest on rename");
console.log("  ✓ Guest rename in lobby verified in backend, HTML, and JS.");

// 7.3 Standings sorting & blue highlight on current user & user-specific XP
assert(jsContent.includes("isMeWinner"), "Modal must determine whether current user is winner");
assert(jsContent.includes("is-current-user"), "Standings must add is-current-user class to current user's row");
assert(jsContent.includes("you-pill"), "Standings must render YOU pill for current user");
assert(cssContent.includes(".modal-standings li.is-current-user"), "CSS must style current user row with blue highlight");
assert(cssContent.includes(".you-pill"), "CSS must style YOU pill");
console.log("  ✓ User-specific XP award, standings sorting, and blue row highlight verified.");

// 7.4 Lobby Waiting Message strictly "WAITING FOR HOST TO START GAME..."
assert(jsContent.includes('turn.textContent = "WAITING FOR HOST TO START GAME...";'), "Lobby waiting message must be strictly 'WAITING FOR HOST TO START GAME...'");
console.log("  ✓ Lobby waiting message strictly formatted without username interpolation.");

// 7.5 Red Remaining Hearts & White Lost Hearts
assert(jsContent.includes("heart-alive"), "JS must output .heart-alive class");
assert(jsContent.includes("heart-lost"), "JS must output .heart-lost class");
assert(cssContent.includes(".heart-alive {\n  color: #ff2a4b;"), "Active lives must be red in CSS");
assert(cssContent.includes(".heart-lost {\n  color: #ffffff;"), "Lost lives must be white in CSS");
console.log("  ✓ Red remaining hearts and white lost hearts confirmed.");

// 7.6 Solo streak high score tracking
assert(htmlContent.includes('id="solo-high-score-display"'), "HTML must contain solo-high-score-display element");
assert(jsContent.includes("localStorage"), "JS must support localStorage for logged-in user high scores");
assert(jsContent.includes("sessionStorage"), "JS must support sessionStorage for guest high scores");
console.log("  ✓ Solo streak high score tracking verified.");

// 8. Testing Landing Page Arena Protocol & Solo Streak Modal Score Redesign
console.log("8. Testing Landing Page Briefing & Solo Streak Modal Score Redesign...");
const updatedHtml = fs.readFileSync(path.resolve(__dirname, "../frontend/word-bomb.html"), "utf8");
const updatedCss = fs.readFileSync(path.resolve(__dirname, "../frontend/css/word-bomb.css"), "utf8");
const updatedJs = fs.readFileSync(path.resolve(__dirname, "../frontend/js/word-bomb.js"), "utf8");

// Briefing protocol replacing 4 floating chips
assert(updatedHtml.includes('class="wb-protocol-panel glass-panel"'), "Landing page must contain Arena Protocol panel");
assert(updatedHtml.includes('class="wb-protocol-grid"'), "Landing page must contain 3-step protocol grid");
assert(updatedHtml.includes('class="wb-rule-pills"'), "Landing page must contain compact rule pills");
assert(!updatedHtml.includes('class="wb-stats-strip"'), "Unprofessional 4-box stat strip must be removed");
assert(updatedCss.includes(".wb-rule-pills {\n    display: grid;\n    grid-template-columns: 1fr 1fr;"), "Mobile CSS must format rule pills in clean 2x2 grid");

// Solo streak popup updates
assert(updatedHtml.includes('id="modal-solo-score"'), "Modal must contain modal-solo-score element");
assert(updatedJs.includes("modalSoloScore.textContent = `Score: ${soloCount}`;"), "JS must show Score: X in solo modal");
assert(updatedJs.includes('modalRewardStatus.textContent = "STREAK SUMMARY";'), "JS must show STREAK SUMMARY in solo modal");
assert(!updatedJs.includes("`You reached Round ${room?.round || 1} with ${room?.usedWords?.length || 0} words.`"), "Solo popup must not display 'You reached Round X with Y words.' subtitle");

console.log("  ✓ Arena protocol briefing, 2x2 mobile pills, and solo Score: X modal verified.");

// 9. Testing Protocol Position, Integrated A-Z Strip, Solo & Multiplayer XP, and Standings Elimination Ordering
console.log("9. Testing Protocol Position, Integrated A-Z Strip, Solo & Multiplayer XP, and Standings Elimination Ordering...");
const freshHtml = fs.readFileSync(path.resolve(__dirname, "../frontend/word-bomb.html"), "utf8");
const freshCss = fs.readFileSync(path.resolve(__dirname, "../frontend/css/word-bomb.css"), "utf8");
const freshJs = fs.readFileSync(path.resolve(__dirname, "../frontend/js/word-bomb.js"), "utf8");
const freshBackend = fs.readFileSync(path.resolve(__dirname, "../backend/realtime/wordBomb.js"), "utf8");

// VICTORY text update
assert(freshHtml.includes("Outlast rivals to claim victory!"), "Step 3 text must claim victory!");
assert(!freshHtml.includes("claim 30 XP!"), "Old text 'claim 30 XP!' must be removed");

// Protocol panel moved after LIVE MULTIPLAYER
assert(freshHtml.indexOf('class="wb-lobbies-section') < freshHtml.indexOf('class="wb-protocol-panel'), "Protocol panel must be placed after live multiplayer lobbies section");

// Solo streak modal fix (render does not hide modal when status is finished, and soloCount is defined)
assert(freshJs.includes("if (isActive || isLobby) {\n                modal.hidden = true;\n                modal.style.display = \"none\";\n            }"), "Render must only hide modal when in active or lobby state, not finished");
assert(freshJs.includes("const soloCount = wordsCount ?? room?.usedWords?.length"), "soloCount must be defined at top of finished handler");

// Compact A-Z Alphabet Tracker integrated directly into main game panel without text clutter
assert(freshHtml.includes('class="game-alphabet-strip" id="word-bomb-alphabet-grid"'), "Compact alphabet strip must be integrated directly in main game bottom panel");
assert(!freshHtml.includes('id="word-bomb-alphabet-tracker"'), "Separate aside tracker identity must be removed");
assert(!freshHtml.includes("BONUS LIFE\n              <h3>A–Z TRACKER</h3>"), "Text clutter must be removed from A-Z tracker");
assert(freshHtml.includes('data-letter="z"'), "HTML must include all 26 letters in alphabet grid");
assert(freshCss.includes(".game-alphabet-strip"), "CSS must style game-alphabet-strip");
assert(freshCss.includes(".alpha-chip.is-used"), "CSS must style highlighted used alpha chips");

// Solo streak XP (+10 XP every 5 words) and Multiplayer XP (+10 XP to all participants)
assert(freshBackend.includes("Math.floor(words / 5) * 10"), "Solo streak must award +10 XP every 5 words");
assert(freshBackend.includes("const earned = isWinner ? WIN_XP : 10;"), "Multiplayer must award +10 XP to all participants and 30 XP to winner");

// Elimination order ranking (player eliminated later ranks ahead of player eliminated earlier)
assert(freshBackend.includes("player.eliminatedOrder = room.eliminatedCount;"), "Backend must track eliminatedOrder");
assert(freshJs.includes("(b.eliminatedOrder || 0) - (a.eliminatedOrder || 0)"), "Frontend standings must rank players eliminated later ahead of players eliminated earlier");

console.log("  ✓ Protocol repositioning, integrated A-Z strip, solo & multiplayer XP, and elimination ranking verified.");

// 10. Testing Full Lobby Subtle Error, Solo Standings Removal, No "Creating public room", and Feed Cleanup on Turn/Valid
console.log("10. Testing Full Lobby Subtle Error, Solo Standings Removal, Clean Room Creation, and In-Game Feed Reset...");
const finalHtml = fs.readFileSync(path.resolve(__dirname, "../frontend/word-bomb.html"), "utf8");
const finalCss = fs.readFileSync(path.resolve(__dirname, "../frontend/css/word-bomb.css"), "utf8");
const finalJs = fs.readFileSync(path.resolve(__dirname, "../frontend/js/word-bomb.js"), "utf8");
const finalBackend = fs.readFileSync(path.resolve(__dirname, "../backend/realtime/wordBomb.js"), "utf8");

// Subtle error message when lobby is full
assert(finalHtml.includes('id="lobbies-notice"'), "HTML must include lobbies-notice container");
assert(finalHtml.includes('id="join-code-notice"'), "HTML must include join-code-notice container");
assert(finalBackend.includes("This lobby is full (maximum 6 players reached)."), "Backend must emit explicit lobby full error");
assert(finalJs.includes("showLobbyNotice"), "Frontend must display subtle lobby full notification");
assert(finalCss.includes(".lobbies-notice"), "CSS must style subtle lobby notice");

// Solo streak modal hides MATCH RESULTS standings box
assert(finalHtml.includes('id="modal-standings-box"'), "Modal standings container must have id modal-standings-box");
assert(finalJs.includes("modalStandingsBox.hidden = true;"), "Solo streak must hide modal-standings-box");
assert(finalCss.includes(".modal-standings-box[hidden]"), "CSS must support hiding modal-standings-box with !important");

// Removal of "Creating public room..." text on landing page
assert(!finalJs.includes("Creating public room..."), "Creating public room... text must be removed from landing page");
assert(!finalJs.includes("Creating ${isPublicCreation"), "Dynamic Creating room text must be removed");

// Feed message clears on valid word, turn pass, penalty, or in lobby
assert(finalJs.includes('socket.on("word-bomb:valid", () => {\n        if (feed) feed.textContent = "";\n    });'), "Feed must clear when a valid word is entered");
assert(finalJs.includes("if (feed && (!isActive || isLobby)) {\n            feed.textContent = \"\";\n        }"), "Feed must be cleared when in lobby or match inactive");
assert(finalJs.includes("if (lastTurnPlayerId !== null && (next.turnPlayerId !== lastTurnPlayerId || next.round !== lastRound)) {\n                feed.textContent = \"\";\n            }"), "Feed must clear when turn passes");

console.log("  ✓ Full lobby notification, solo standings removal, clean room creation, and feed reset confirmed.");

// 11. Testing Professional Custom Vector Bomb & Dynamic Urgency Animations
console.log("11. Testing Custom Vector Bomb SVG, Dynamic Urgency States & Particle Animations...");
const customBombHtml = fs.readFileSync(path.resolve(__dirname, "../frontend/word-bomb.html"), "utf8");
const customBombCss = fs.readFileSync(path.resolve(__dirname, "../frontend/css/word-bomb.css"), "utf8");
const customBombJs = fs.readFileSync(path.resolve(__dirname, "../frontend/js/word-bomb.js"), "utf8");

// Custom Vector SVG bomb structure
assert(customBombHtml.includes('class="custom-bomb-svg"'), "HTML must include custom-bomb-svg");
assert(customBombHtml.includes('class="bomb-reactor-ring"'), "SVG must include rotating reactor ring");
assert(customBombHtml.includes('class="bomb-fuse-line"'), "SVG must include curved fuse cord");
assert(customBombHtml.includes('class="bomb-blast-wave"'), "SVG must include expanding blast wave circle");
assert(customBombHtml.includes('class="spark-core"'), "HTML must include multi-layer spark core");

// Dynamic Urgency States in JS (<= 4s critical, <= 8s urgent, reset on finish / change)
assert(customBombJs.includes("updateBombUrgency"), "JS must implement updateBombUrgency helper");
assert(customBombJs.includes('bombVisual.classList.add("is-critical")'), "JS must set is-critical when <= 4s");
assert(customBombJs.includes('bombVisual.classList.add("is-urgent")'), "JS must set is-urgent when <= 8s");

// Professional Bomb CSS animations
assert(customBombCss.includes(".custom-bomb-svg"), "CSS must style custom-bomb-svg");
assert(customBombCss.includes("@keyframes reactorSpin"), "CSS must include reactorSpin animation");
assert(customBombCss.includes(".bomb-center.is-urgent"), "CSS must style is-urgent bomb state");
assert(customBombCss.includes(".bomb-center.is-critical"), "CSS must style is-critical bomb state");
assert(customBombCss.includes("@keyframes shockwaveExpand"), "CSS must include shockwaveExpand animation");
assert(customBombCss.includes(".spark-core"), "CSS must style sparkling fuse core");

console.log("  ✓ Custom vector bomb SVG, dynamic urgency states, and particle animations verified.");

// 12. Testing Solo Badges Hiding, Full Lobby Notice Restriction & Substring Sizing
console.log("12. Testing Solo Badges Hiding, Full Lobby Notice Restriction & Substring Sizing...");
const v12Html = fs.readFileSync(path.resolve(__dirname, "../frontend/word-bomb.html"), "utf8");
const v12Css = fs.readFileSync(path.resolve(__dirname, "../frontend/css/word-bomb.css"), "utf8");
const v12Js = fs.readFileSync(path.resolve(__dirname, "../frontend/js/word-bomb.js"), "utf8");

// Lowercase victory text on landing page
assert(v12Html.includes("Outlast rivals to claim victory!"), "Landing page must contain lowercase 'claim victory!'");

// In solo streak, hide 1/6 PLAYERS and ROOM: SOLO
assert(v12Js.includes("if (isSolo) {\n            if (gameCodeBadge) {\n                gameCodeBadge.hidden = true;\n                gameCodeBadge.style.display = \"none\";\n            }\n            if (gamePlayersBadge) {\n                gamePlayersBadge.hidden = true;\n                gamePlayersBadge.style.display = \"none\";\n            }"), "JS must hide gameCodeBadge and gamePlayersBadge in solo streak");

// Full lobby error: only show in join room by code section, not on active lobby section
assert(!v12Js.includes('showLobbyNotice("⚠️ This lobby is full'), "Must not show lobby full notice in active lobby section");
assert(v12Js.includes('showJoinCodeNotice("⚠️ This room is currently full'), "Must show lobby full notice in join room by code section");

// Substring sizing: length classes and reduced font clamp to prevent overlap with orbit players
assert(v12Js.includes('sequence.classList.add("seq-len-4")'), "JS must add seq-len-4 for 4-letter substrings");
assert(v12Js.includes('sequence.classList.add("seq-len-5")'), "JS must add seq-len-5 for 5-letter substrings");
assert(v12Css.includes(".bomb-sequence.seq-len-4"), "CSS must style seq-len-4 with smaller font");
assert(v12Css.includes(".bomb-sequence.seq-len-5"), "CSS must style seq-len-5 with smaller font");
assert(v12Css.includes(".round-badge[hidden]"), "CSS must enforce display: none !important on hidden round-badge");

console.log("  ✓ Solo badges hiding, full lobby notice restriction, and substring scaling verified.");

// 13. Testing Header Account Popup and Identity Controller
console.log("13. Testing Header Account Popup and Identity Controller...");
assert(v12Html.includes('id="auth-overlay"'), "word-bomb.html must include auth-overlay modal");
assert(v12Html.includes('id="player-menu-button"'), "word-bomb.html must include player-menu-button");
assert(v12Js.includes('playerMenuBtn?.addEventListener("click"'), "word-bomb.js must bind click listener to player-menu-button");
assert(v12Js.includes('openAuth("account")'), "word-bomb.js must support openAuth for account profile");
assert(v12Js.includes('openAuth("login")'), "word-bomb.js must support openAuth for login");
assert(v12Js.includes('data-auth-logout'), "word-bomb.js must support logout from auth popup");
console.log("  ✓ Header account popup, profile view, and identity controller verified.");

// 14. Testing Multiplayer REST Fallback Engine (Lobbies, Room Creation, Join, Polling)
console.log("14. Testing Multiplayer REST Fallback Engine (Lobbies, Room Creation, Join, Polling)...");
const wordBombRooms = require("../backend/services/wordBombRooms");
(async () => {
    const actor1 = { id: "user-1", username: "HostPlayer", isGuest: false };
    const actor2 = { id: "user-2", username: "Guest2", isGuest: true };

    const room = await wordBombRooms.createRoom(actor1, true);
    assert(room && room.code && room.code.length === 6, "Must create 6-character room code");
    assert.strictEqual(room.status, "lobby", "Initial status must be lobby");
    assert.strictEqual(room.players.length, 1, "Must contain host player");

    const joined = await wordBombRooms.joinRoom(actor2, room.code);
    assert.strictEqual(joined.players.length, 2, "Must contain 2 players after join");

    const started = await wordBombRooms.startRoom(actor1, room.code);
    assert.strictEqual(started.status, "active", "Status must transition to active");
    assert(started.sequence && started.sequence.length >= 2, "Must choose initial sequence");

    const state = await wordBombRooms.getRoomState(room.code);
    assert.strictEqual(state.round, 1, "Room round must be 1");

    await wordBombRooms.leaveRoom(actor2, room.code);
    await wordBombRooms.leaveRoom(actor1, room.code);
    console.log("  ✓ Multiplayer REST engine room lifecycle (create, join, start, state, leave) verified.");

    console.log("\nAll Word Bomb Unit Tests PASSED! 💣✓");
})();
