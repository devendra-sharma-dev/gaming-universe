const session = require("express-session");
const connectMongo = require("connect-mongo");

const MongoStore = connectMongo.default || connectMongo;

const createSessionMiddleware = () => {
    const isProduction = process.env.NODE_ENV === "production";
    const configuredSecret = process.env.SESSION_SECRET;

    if (isProduction && !configuredSecret) {
        throw new Error("SESSION_SECRET is not configured.");
    }

    const sessionSecret = configuredSecret ||
        "gaming-universe-local-development-session-secret";

    return session({
        name: "gaming_universe.sid",
        secret: sessionSecret,
        resave: false,
        saveUninitialized: false,
        rolling: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGODB_URI,
            collectionName: "sessions",
            ttl: 365 * 24 * 60 * 60,
            touchAfter: 24 * 3600
        }),
        cookie: {
            httpOnly: true,
            path: "/",
            sameSite: isProduction && !process.env.VERCEL ? "none" : "lax",
            secure: isProduction,
            maxAge: 365 * 24 * 60 * 60 * 1000
        }
    });
};

module.exports = createSessionMiddleware;
