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
const crypto = require("crypto");
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
const socketOrigins = [
    process.env.FRONTEND_ORIGIN || "http://localhost:3000",
    ...(process.env.NODE_ENV === "production"
        ? []
        : ["http://localhost:3000", "http://127.0.0.1:3000", "http://[::]:3000"])
];

const startServer = async () => {
    try {
        await connectDatabase();

        const { app, sessionMiddleware } = require("./app");
        const httpServer = http.createServer(app);

        const io = new Server(httpServer, {
            cors: {
                origin: socketOrigins,
                credentials: true
            }
        });

        io.engine.use(sessionMiddleware);

        io.use(async (socket, next) => {
            try {
                const session = socket.request.session;

                if (!session || !session.userId) {
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

                next();
            } catch (_error) {
                next(new Error("Socket authentication failed."));
            }
        });

        attachTicTacToe(io);
        attachWordBomb(io);

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
} catch (error) {
    console.error("API startup failed:", error);
    process.exitCode = 1;
}
};

if (require.main === module) {
    startServer();
}

module.exports = startServer;
