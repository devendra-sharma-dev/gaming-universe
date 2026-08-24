const express = require("express");
const argon2 = require("argon2");
const rateLimit = require("express-rate-limit");

const User = require("../models/User");
const createHttpError = require("../utils/httpError");
const {
    issueOtp,
    verifyOtp,
    normalizeMobile,
    validateMobile
} = require("../services/otp");

const router = express.Router();

const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
        success: false,
        error: { message: "Too many OTP requests. Try again later." }
    }
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
        success: false,
        error: { message: "Too many login attempts. Try again later." }
    }
});

const asyncRoute = (handler) => (request, response, next) =>
    Promise.resolve(handler(request, response, next)).catch(next);

const normalizeUsername = (username) => String(username || "").trim();

const validateUsername = (username) => {
    if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
        throw createHttpError(
            400,
            "Username must be 3-20 characters using letters, numbers, or underscores."
        );
    }
};

const normalizePurpose = (purpose) => {
    if (!["signup", "password_reset"].includes(purpose)) {
        throw createHttpError(400, "Unsupported OTP purpose.");
    }

    return purpose;
};

const requireOtpFlow = (request, purpose, mobile) => {
    const verification = request.session && request.session.otpVerification;

    if (
        !verification ||
        verification.purpose !== purpose ||
        verification.mobile !== mobile ||
        Date.now() - verification.verifiedAt > 15 * 60 * 1000
    ) {
        throw createHttpError(400, "Verify the OTP before continuing.");
    }
};

const establishSession = (request, userId) =>
    new Promise((resolve, reject) => {
        request.session.regenerate((error) => {
            if (error) {
                reject(error);
                return;
            }

            request.session.userId = userId.toString();
            request.session.save((saveError) => {
                if (saveError) {
                    reject(saveError);
                    return;
                }

                resolve();
            });
        });
    });

router.post(
    "/otp/send",
    otpLimiter,
    asyncRoute(async (request, response) => {
        const mobile = normalizeMobile(request.body.mobile);
        const purpose = normalizePurpose(request.body.purpose);

        await issueOtp({ mobile, purpose });

        response.json({
            success: true,
            data: {
                sent: true,
                purpose
            }
        });
    })
);

router.post(
    "/otp/verify",
    otpLimiter,
    asyncRoute(async (request, response) => {
        const mobile = normalizeMobile(request.body.mobile);
        const purpose = normalizePurpose(request.body.purpose);

        await verifyOtp({
            mobile,
            purpose,
            otp: request.body.otp
        });

        request.session.otpVerification = {
            mobile,
            purpose,
            verifiedAt: Date.now()
        };

        response.json({
            success: true,
            data: {
                verified: true,
                purpose
            }
        });
    })
);

router.get(
    "/username/check",
    asyncRoute(async (request, response) => {
        const username = normalizeUsername(request.query.username);
        validateUsername(username);

        const exists = await User.exists({
            usernameNormalized: username.toLowerCase()
        });

        response.json({
            success: true,
            data: {
                username,
                available: !exists
            }
        });
    })
);

router.post(
    "/register",
    asyncRoute(async (request, response) => {
        const mobile = normalizeMobile(request.body.mobile);
        const username = normalizeUsername(request.body.username);
        const password = String(request.body.password || "");

        validateMobile(mobile);
        validateUsername(username);

        if (password.length < 8) {
            throw createHttpError(400, "Password must be at least 8 characters.");
        }

        requireOtpFlow(request, "signup", mobile);

        const usernameNormalized = username.toLowerCase();
        const [existingUsername, existingMobile] = await Promise.all([
            User.exists({ usernameNormalized }),
            User.exists({ mobile })
        ]);

        if (existingUsername) {
            throw createHttpError(409, "Username is already taken.");
        }

        if (existingMobile) {
            throw createHttpError(409, "Mobile number is already registered.");
        }

        const passwordHash = await argon2.hash(password, {
            type: argon2.argon2id
        });

        const user = await User.create({
            username,
            usernameNormalized,
            mobile,
            mobileVerified: true,
            passwordHash
        });

        await establishSession(request, user._id);

        response.status(201).json({
            success: true,
            data: {
                user
            }
        });
    })
);

router.post(
    "/login",
    loginLimiter,
    asyncRoute(async (request, response) => {
        const mobile = normalizeMobile(request.body.mobile);
        const password = String(request.body.password || "");

        validateMobile(mobile);

        const user = await User.findOne({ mobile }).select("+passwordHash");
        const validPassword =
            user && (await argon2.verify(user.passwordHash, password));

        if (!user || !validPassword) {
            throw createHttpError(401, "Mobile number or password is incorrect.");
        }

        await establishSession(request, user._id);

        response.json({
            success: true,
            data: {
                user
            }
        });
    })
);

router.post(
    "/logout",
    asyncRoute(async (request, response) => {
        if (request.session) {
            await new Promise((resolve) => request.session.destroy(resolve));
        }

        response.clearCookie("gaming_universe.sid");
        response.json({
            success: true,
            data: { loggedOut: true }
        });
    })
);

router.post(
    "/password/reset",
    asyncRoute(async (request, response) => {
        const mobile = normalizeMobile(request.body.mobile);
        const password = String(request.body.password || "");

        validateMobile(mobile);

        if (password.length < 8) {
            throw createHttpError(400, "Password must be at least 8 characters.");
        }

        requireOtpFlow(request, "password_reset", mobile);

        const passwordHash = await argon2.hash(password, {
            type: argon2.argon2id
        });

        const user = await User.findOneAndUpdate(
            { mobile },
            { $set: { passwordHash } },
            { new: true }
        );

        if (!user) {
            throw createHttpError(404, "No account exists for this mobile number.");
        }

        await new Promise((resolve) => request.session.destroy(resolve));
        response.clearCookie("gaming_universe.sid");

        response.json({
            success: true,
            data: {
                reset: true
            }
        });
    })
);

module.exports = router;
