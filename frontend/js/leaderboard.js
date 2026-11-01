/**
 * GAMING UNIVERSE - LEADERBOARD COMPONENT
 * Shared across all pages. Fetches top 20 players and displays podium + rank table.
 */
(() => {
    'use strict';

    // Inject modal container if not present
    let modalEl = document.getElementById('leaderboard-modal');
    if (!modalEl) {
        modalEl = document.createElement('div');
        modalEl.id = 'leaderboard-modal';
        modalEl.className = 'lb-overlay';
        modalEl.setAttribute('aria-hidden', 'true');
        modalEl.hidden = true;
        modalEl.innerHTML = `
            <div class="lb-dialog" role="dialog" aria-modal="true" aria-labelledby="lb-heading">
                <button type="button" class="lb-close" id="lb-close-btn" aria-label="Close Leaderboard">×</button>
                <div class="lb-header">
                    <span class="lb-kicker">HALL OF FAME</span>
                    <h2 id="lb-heading">GLOBAL <span>LEADERBOARD</span></h2>
                    <p class="lb-subtitle">Top 20 players ranked across the Gaming Universe by total XP</p>
                </div>
                <div id="lb-body" class="lb-body">
                    <div class="lb-loading">
                        <div class="lb-spinner"></div>
                        <span>Calculating Universe Standings...</span>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modalEl);
    }

    const closeBtn = document.getElementById('lb-close-btn');
    const lbBody = document.getElementById('lb-body');

    const openLeaderboard = () => {
        modalEl.hidden = false;
        modalEl.setAttribute('aria-hidden', 'false');
        document.body.classList.add('lb-modal-open');
        fetchLeaderboard();
    };

    const closeLeaderboard = () => {
        modalEl.hidden = true;
        modalEl.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('lb-modal-open');
    };

    closeBtn?.addEventListener('click', closeLeaderboard);
    modalEl.addEventListener('click', (e) => {
        if (e.target === modalEl) closeLeaderboard();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modalEl.hidden) closeLeaderboard();
    });

    // Delegate click for any #nav-leaderboard-btn on the page
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('#nav-leaderboard-btn');
        if (btn) {
            e.preventDefault();
            openLeaderboard();
        }
    });

    // Fetch and render data
    async function fetchLeaderboard() {
        lbBody.innerHTML = `
            <div class="lb-loading">
                <div class="lb-spinner"></div>
                <span>Calculating Universe Standings...</span>
            </div>
        `;

        try {
            if (window.GamingSession?.ready) await window.GamingSession.ready;
            const origin = window.GamingSession?.apiOrigin || '';
            const fetchFn = window.GamingSession?.fetch || window.fetch;
            const res = await fetchFn(`${origin}/api/v1/users/leaderboard`, { credentials: 'include' });
            const json = await res.json();

            if (!res.ok || !json.success) {
                throw new Error(json.error?.message || 'Could not load leaderboard.');
            }

            renderLeaderboardView(json.data);
        } catch (err) {
            lbBody.innerHTML = `
                <div class="lb-error">
                    <span class="lb-error-icon">⚠️</span>
                    <p>${err.message || 'Unable to connect to leaderboard server.'}</p>
                    <button type="button" class="lb-retry-btn" id="lb-retry-btn">TRY AGAIN</button>
                </div>
            `;
            document.getElementById('lb-retry-btn')?.addEventListener('click', fetchLeaderboard);
        }
    }

    function renderLeaderboardView(data) {
        const top20 = data.leaderboard || [];
        const currentUser = data.currentUser;

        if (top20.length === 0) {
            lbBody.innerHTML = `
                <div class="lb-empty">
                    <span>🎮</span>
                    <h3>NO RANKED PLAYERS YET</h3>
                    <p>Play games and earn XP to be the first to claim the #1 spot!</p>
                </div>
            `;
            return;
        }

        // Podium top 3 (Gold = rank 1, Silver = rank 2, Bronze = rank 3)
        const rank1 = top20.find(u => u.rank === 1);
        const rank2 = top20.find(u => u.rank === 2);
        const rank3 = top20.find(u => u.rank === 3);

        const isUserOnPodium = Boolean(
            currentUser && currentUser.rank >= 1 && currentUser.rank <= 3
        );

        const renderPodiumStep = (user, rank, medal, heightClass) => {
            if (!user) return `<div class="lb-podium-step empty ${heightClass}"></div>`;
            const isMe = currentUser && (currentUser.id === user.id || currentUser.username.toLowerCase() === user.username.toLowerCase());
            return `
                <div class="lb-podium-step rank-${rank} ${heightClass} ${isMe ? 'is-me' : ''}">
                    <div class="lb-podium-medal">${medal}</div>
                    <div class="lb-podium-player">
                        <div class="lb-podium-name-row">
                            <strong class="lb-podium-name">${user.username}</strong>
                            ${isMe ? '<span class="lb-you-tag">YOU</span>' : ''}
                        </div>
                        <span class="lb-podium-xp">${user.xp.toLocaleString()} XP</span>
                    </div>
                    <div class="lb-podium-block">
                        <span class="lb-podium-rank-num">#${rank}</span>
                    </div>
                </div>
            `;
        };

        const podiumHtml = `
            <div class="lb-podium">
                ${renderPodiumStep(rank2, 2, '🥈', 'step-silver')}
                ${renderPodiumStep(rank1, 1, '🥇', 'step-gold')}
                ${renderPodiumStep(rank3, 3, '🥉', 'step-bronze')}
            </div>
        `;

        // Table for ranks 4 to 20 (up to 17 players)
        const tableUsers = top20.filter(u => u.rank > 3);
        let tableRowsHtml = '';

        tableUsers.forEach(u => {
            const isMe = currentUser && (currentUser.id === u.id || currentUser.username.toLowerCase() === u.username.toLowerCase());
            tableRowsHtml += `
                <tr class="${isMe ? 'is-current-user-row' : ''}">
                    <td class="lb-col-rank"><span class="lb-rank-badge">#${u.rank}</span></td>
                    <td class="lb-col-player">
                        <span class="lb-player-name">${u.username}</span>
                        ${isMe ? '<span class="lb-you-tag">YOU</span>' : ''}
                    </td>
                    <td class="lb-col-xp"><strong>${u.xp.toLocaleString()}</strong> <small>XP</small></td>
                </tr>
            `;
        });

        // If current user is logged in and NOT in top 20, append user row in the table
        // with their actual global database rank, username, and total XP
        const isUserOutsideTop20 = Boolean(
            currentUser && !currentUser.inTop20 && currentUser.rank > 20
        );

        if (isUserOutsideTop20) {
            tableRowsHtml += `
                <tr class="lb-row-separator">
                    <td colspan="3"><div class="lb-sep-line"><span>• • •</span></div></td>
                </tr>
                <tr class="is-current-user-row is-outside-top20-row">
                    <td class="lb-col-rank"><span class="lb-rank-badge rank-outside">#${currentUser.rank}</span></td>
                    <td class="lb-col-player">
                        <span class="lb-player-name">${currentUser.username}</span>
                        <span class="lb-you-tag">YOU</span>
                    </td>
                    <td class="lb-col-xp"><strong>${currentUser.xp.toLocaleString()}</strong> <small>XP</small></td>
                </tr>
            `;
        }

        const tableHtml = (tableUsers.length > 0 || isUserOutsideTop20) ? `
            <div class="lb-table-wrapper">
                <table class="lb-table">
                    <thead>
                        <tr>
                            <th class="lb-col-rank">RANK</th>
                            <th class="lb-col-player">PLAYER</th>
                            <th class="lb-col-xp">TOTAL XP</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRowsHtml}
                    </tbody>
                </table>
            </div>
        ` : '';

        // Persistent bottom card:
        // ONLY show if the user is NOT on the podium!
        // - If user is on podium (rank 1, 2, or 3): NO bottom card (it's already showcased clearly on the podium).
        // - If user is in table (rank 4 to 20): show quick rank summary bar.
        // - If user is outside top 20: show actual rank summary bar.
        // - If guest: show sign in tip.
        let userBannerHtml = '';
        if (currentUser) {
            if (!isUserOnPodium) {
                const isTop20 = currentUser.inTop20;
                userBannerHtml = `
                    <div class="lb-user-banner ${isTop20 ? 'in-top-20' : 'outside-top-20'}">
                        <div class="lb-user-banner-rank">
                            <span class="lb-ub-label">YOUR RANK</span>
                            <strong>#${currentUser.rank}</strong>
                        </div>
                        <div class="lb-user-banner-info">
                            <div class="lb-user-banner-name">
                                <span>@${currentUser.username}</span>
                                <span class="lb-you-pill">YOU</span>
                            </div>
                            <span class="lb-user-banner-sub">${isTop20 ? '🌟 Currently ranked in Universe Top 20!' : 'Climb higher by winning matches and earning XP!'}</span>
                        </div>
                        <div class="lb-user-banner-xp">
                            <strong>${currentUser.xp.toLocaleString()}</strong>
                            <small>XP</small>
                        </div>
                    </div>
                `;
            }
        } else {
            userBannerHtml = `
                <div class="lb-user-banner guest-banner">
                    <div class="lb-guest-msg">
                        <span>💡 Sign in to see your global database rank and save your XP!</span>
                    </div>
                </div>
            `;
        }

        lbBody.innerHTML = `
            ${podiumHtml}
            ${tableHtml}
            ${userBannerHtml}
        `;
    }

    window.openUniverseLeaderboard = openLeaderboard;
    window.closeUniverseLeaderboard = closeLeaderboard;
})();
