"use strict";

(() => {
    const storageKey = "gaming-universe.open-tabs";
    // randomUUID requires a secure context; getRandomValues also works on local HTTP hosts.
    const randomToken = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, "0")).join("");
    const tabId = randomToken();
    const connectionToken = randomToken();
    let channel = null;
    try {
        if (typeof BroadcastChannel === "function") channel = new BroadcastChannel(storageKey);
    } catch (_error) { /* Some browser privacy settings disable cross-tab messaging. */ }
    let token = null;
    let acceptPeer = null;
    if (channel) channel.onmessage = ({ data }) => {
        if (data?.type === "session-request" && token) channel.postMessage({ type: "session-response", to: data.from, token });
        if (data?.type === "session-response" && data.to === tabId && /^[a-f0-9]{64}$/.test(data.token)) acceptPeer?.(data.token);
        if (data?.type === "identity-changed") window.location.reload();
    };
    const initialize = async () => {
        // Only live tabs share this token. It is never kept in localStorage/cookies.
        const peer = channel ? await new Promise(resolve => {
            const timer = setTimeout(() => { acceptPeer = null; resolve(null); }, 250);
            acceptPeer = value => { clearTimeout(timer); acceptPeer = null; resolve(value); };
            channel.postMessage({ type: "session-request", from: tabId });
        }) : null;
        let stored;
        try { stored = sessionStorage.getItem(storageKey); } catch (_error) { /* Storage may be disabled. */ }
        token = peer || (/^[a-f0-9]{64}$/.test(stored) ? stored : randomToken());
        try { sessionStorage.setItem(storageKey, token); } catch (_error) { /* In-memory session still works. */ }
    };
    // Serialize simultaneous new tabs so they discover the first tab's token.
    let ready;
    try {
        ready = navigator.locks ? navigator.locks.request(storageKey, initialize).catch(initialize) : initialize();
    } catch (_error) { ready = initialize(); }
    const apiHost = window.location.hostname || "localhost";
    const apiOrigin = window.GAMING_UNIVERSE_API_ORIGIN || `${window.location.protocol === "https:" ? "https:" : "http:"}//${apiHost}:5051`;
    let socketClient;
    window.GamingSession = {
        ready,
        apiOrigin,
        loadSocketClient: () => {
            if (window.io) return Promise.resolve();
            if (!socketClient) socketClient = new Promise((resolve, reject) => {
                const script = document.createElement("script");
                script.src = `${apiOrigin}/socket.io/socket.io.js`;
                script.onload = resolve;
                script.onerror = () => { socketClient = null; script.remove(); reject(new Error("Cannot connect to the game server. Check that the backend is running.")); };
                document.head.append(script);
            });
            return socketClient;
        },
        fetch: async (url, options = {}) => {
            await ready;
            const headers = new Headers(options.headers);
            headers.set("X-Browser-Session", token);
            return fetch(url, { ...options, headers, credentials: "include" });
        },
        socketAuth: callback => { ready.then(() => callback({ browserToken: token, connectionToken })); },
        identityChanged: () => channel?.postMessage({ type: "identity-changed" })
    };
})();
