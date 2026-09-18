const http = require("http");
const path = require("path");


require("dotenv").config({
    path: path.resolve(__dirname, "../.env")
});

const connectDatabase = require("./config/database");
const User = require("./models/User");
const { Server } = require("socket.io");
const { attachTicTacToe } = require("./realtime/ticTacToe");
const { attachWordBomb } = require("./realtime/wordBomb");
const { attachHostedGames } = require("./realtime/hosted");
const { allowedOrigins, isAllowedOrigin } = require("./config/origins");
const crypto = require("crypto");
const OtpCode = require("./models/OtpCode");
const { matchesBrowserSession } = require("./services/browserSession");
const guestNames = new Set();

const createGuestName = () => {
    let name;
    do {
        name = `Guest${Math.floor(100000 + Math.random() * 900000)}`;
    } while (guestNames.has(name));
    guestNames.add(name);
    return name;
};

const port = Number.parseInt(process.env.PORT, 10) || 5051;
const createGameServer = ({ shared = Boolean(process.env.VERCEL) } = {}) => {
    let initialization;
    let initializeGames = async () => {};
    const ready = () => {
        if (!initialization) initialization = (async () => {
            await connectDatabase();
            await Promise.all([User.init(), OtpCode.init()]);
            if (process.env.VERCEL) await require("mongoose").connection.collection("authRateLimits")
                .createIndex({ resetTime: 1 }, { expireAfterSeconds: 0 });
            await initializeGames();
        })().catch(error => { initialization = null; throw error; });
        return initialization;
    };
    const { app, sessionMiddleware } = require("./app");
    const httpServer = http.createServer((request, response) => {
        ready().then(() => app(request, response)).catch(() => {
            response.writeHead(503, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ success: false, error: { message: "Service temporarily unavailable." } }));
        });
    });

    const io = new Server(httpServer, {
        cors: {
            origin: [...allowedOrigins],
            credentials: true
        },
        maxHttpBufferSize: 16384,
        allowRequest: (request, callback) => callback(null, isAllowedOrigin(request.headers.origin))
    });

    io.engine.use((request, response, next) => {
        ready().then(() => sessionMiddleware(request, response, next)).catch(() => next(new Error("Service temporarily unavailable.")));
    });

    io.use(async (socket, next) => {
        try {
            const session = socket.request.session;

            if (!session?.userId || !matchesBrowserSession(session, socket.handshake.auth.browserToken)) {
                socket.user = {
                    id: `guest:${crypto.randomUUID()}`,
                    username: createGuestName(),
                    xp: 0,
                    isGuest: true
                };
                next();
                return;
            }

            const user = await User.findById(session.userId).select(
                "username xp"
            );

            if (!user) {
                const error = new Error("Authentication required.");
                error.data = { code: "AUTH_REQUIRED" };
                next(error);
                return;
            }

            socket.user = {
                id: user._id.toString(),
                username: user.username,
                xp: user.xp,
                isGuest: false
            };

            // A socket must not keep account access after another tab logs out.
            socket.use((_packet, nextPacket) => {
                socket.request.session.reload((error) => {
                    const current = socket.request.session;
                    if (error || String(current?.userId) !== socket.user.id ||
                        !matchesBrowserSession(current, socket.handshake.auth.browserToken)) {
                        socket.emit("session:expired");
                        socket.disconnect(true);
                        return nextPacket(new Error("Authentication required."));
                    }
                    nextPacket();
                });
            });

            next();
        } catch (_error) {
            next(new Error("Socket authentication failed."));
        }
    });

    if (shared) initializeGames = attachHostedGames(io, ready);
    else {
        attachTicTacToe(io);
        attachWordBomb(io);
    }

    return { httpServer, io, ready };
};

const startServer = async (options) => {
    try {
        const { httpServer, io, ready } = createGameServer(options);
        await ready();

        httpServer.once("error", (error) => {
            if (error && error.code === "EADDRINUSE") {
                console.error(`Port ${port} is already in use. Stop the existing Gaming Universe server before starting another one.`);
                process.exitCode = 1;
                return;
            }

            console.error("API server could not start.");
            process.exitCode = 1;
        });

        httpServer.listen(port, () => {
            console.log("Gaming Universe API listening on port " + port + ".");
        });
        return { httpServer, io };
} catch (error) {
    console.error("API startup failed:", error);
    process.exitCode = 1;
}
};

if (require.main === module) {
    startServer();
}

module.exports = startServer;
module.exports.createGameServer = createGameServer;
