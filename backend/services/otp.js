const crypto = require("crypto");

const OtpCode = require("../models/OtpCode");
const createHttpError = require("../utils/httpError");

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const normalizeMobile = (mobile) => String(mobile || "").trim();

const validateMobile = (mobile) => {
    if (!/^\+?[1-9]\d{7,14}$/.test(mobile)) {
        throw createHttpError(400, "Enter a valid mobile number.");
    }
};

const hashOtp = (otp) =>
    crypto
        .createHash("sha256")
        .update(`${otp}:${process.env.SESSION_SECRET || "gaming-universe-dev-otp"}`)
        .digest("hex");

const maskMobile = (mobile) => {
    if (mobile.length < 4) {
        return "********";
    }

    return `${"*".repeat(Math.max(0, mobile.length - 4))}${mobile.slice(-4)}`;
};

const issueOtp = async ({ mobile, purpose }) => {
    const normalizedMobile = normalizeMobile(mobile);

    validateMobile(normalizedMobile);

    if (!["signup", "password_reset"].includes(purpose)) {
        throw createHttpError(400, "Unsupported OTP purpose.");
    }

    const cooldownSince = new Date(Date.now() - OTP_RESEND_COOLDOWN_MS);
    const recentCode = await OtpCode.findOne({
        mobile: normalizedMobile,
        purpose,
        consumedAt: null,
        createdAt: { $gte: cooldownSince }
    });

    if (recentCode) {
        throw createHttpError(429, "Please wait before requesting another OTP.");
    }

    await OtpCode.updateMany(
        {
            mobile: normalizedMobile,
            purpose,
            consumedAt: null
        },
        {
            $set: { consumedAt: new Date() }
        }
    );

    const otp = crypto.randomInt(100000, 1000000).toString();

    await OtpCode.create({
        mobile: normalizedMobile,
        purpose,
        otpHash: hashOtp(otp),
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MS)
    });

    if (process.env.NODE_ENV === "development") {
        console.log(`[DEV OTP] ${maskMobile(normalizedMobile)} -> ${otp}`);
    }
};

const verifyOtp = async ({ mobile, purpose, otp }) => {
    const normalizedMobile = normalizeMobile(mobile);

    validateMobile(normalizedMobile);

    if (!/^\d{6}$/.test(String(otp || ""))) {
        throw createHttpError(400, "Enter the six-digit OTP.");
    }

    const code = await OtpCode.findOne({
        mobile: normalizedMobile,
        purpose,
        consumedAt: null
    })
        .select("+otpHash")
        .sort({ createdAt: -1 });

    if (!code || code.expiresAt.getTime() <= Date.now()) {
        throw createHttpError(400, "OTP is expired or invalid.");
    }

    if (code.attempts >= OTP_MAX_ATTEMPTS) {
        throw createHttpError(429, "Too many OTP attempts. Request a new OTP.");
    }

    code.attempts += 1;

    const expectedHash = hashOtp(String(otp));
    const matches = crypto.timingSafeEqual(
        Buffer.from(code.otpHash, "hex"),
        Buffer.from(expectedHash, "hex")
    );

    if (!matches) {
        await code.save();
        throw createHttpError(400, "OTP is expired or invalid.");
    }

    code.consumedAt = new Date();
    await code.save();
};

module.exports = {
    issueOtp,
    verifyOtp,
    normalizeMobile,
    validateMobile
};
