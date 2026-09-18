"use strict";

// Vercel owns the listener. Export the HTTP server so it can handle both
// ordinary Express requests and Socket.IO WebSocket upgrades.
const { createGameServer } = require("../backend/server");
module.exports = createGameServer({ shared: true }).httpServer;
