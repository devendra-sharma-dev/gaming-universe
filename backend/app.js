const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoose = require("mongoose");

const createSessionMiddleware = require("./config/session");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const gameRoutes = require("./routes/games");
const timelineRoutes = require("./routes/timeline");
const mysteryCountryRoutes = require("./routes/mysteryCountry");

const configuredFrontendOrigin = process.env.FRONTEND_ORIGIN;
const developmentOrigins = new Set([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://[::]:3000"
]);

const isAllowedOrigin = (origin) => {
    if (!origin) return true;
    if (configuredFrontendOrigin === origin) return true;
    return process.env.NODE_ENV !== "production" && developmentOrigins.has(origin);
};

const app = express();
const sessionMiddleware = createSessionMiddleware();

if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
}

app.disable("x-powered-by");

app.use(helmet());

app.use(
    cors({
        origin: (origin, callback) => {
            if (isAllowedOrigin(origin)) {
                callback(null, true);
                return;
            }

            callback(new Error("Origin is not allowed by CORS."));
        },
        credentials: true
    })
);

app.use(
    express.json({
        limit: "100kb"
    })
);

app.use(sessionMiddleware);

app.get("/api/v1/health", (_request, response) => {
    const isDatabaseConnected = mongoose.connection.readyState === 1;

    response
        .status(isDatabaseConnected ? 200 : 503)
        .json({
            success: isDatabaseConnected,
            data: {
                service: "gaming-universe-api",
                status: isDatabaseConnected ? "ok" : "degraded",
                database: isDatabaseConnected ? "connected" : "disconnected"
            }
        });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/games", gameRoutes);
app.use("/api/v1/timeline", timelineRoutes);
app.use("/api/v1/mystery-country", mysteryCountryRoutes);

app.use((_request, response) => {
    response.status(404).json({
        success: false,
        error: {
            message: "Route not found."
        }
    });
});

app.use((error, _request, response, _next) => {
    if (error && error.code === 11000) {
        response.status(409).json({
            success: false,
            error: {
                message: "A unique account value is already in use."
            }
        });
        return;
    }

    const status = error && Number.isInteger(error.status)
        ? error.status
        : 500;

    if (status >= 500) {
        console.error("Unhandled server error.");
    }

    response.status(status).json({
        success: false,
        error: {
            message:
                status >= 500
                    ? "Internal server error."
                    : error.message
        }
    });
});

module.exports = {
    app,
    sessionMiddleware
};
