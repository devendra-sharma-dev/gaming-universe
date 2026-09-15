const crypto = require("crypto");
const OtpCode = require("../models/OtpCode");
const { sendOtpEmail } = require("./email");
const createHttpError = require("../utils/httpError");

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const validateEmail = (email) => {
    if (email.length > 254 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(email)) {
        throw createHttpError(400, "Enter a valid email address.");
    }
};
const hashOtp = (otp, challengeId) => crypto.createHmac("sha256", process.env.SESSION_SECRET || "gaming-universe-development")
    .update(`${challengeId}:${otp}`).digest("hex");

const issueOtp = async ({ email, browserTokenHash }) => {
    email = normalizeEmail(email);
    validateEmail(email);
    const now = new Date();
    const otp = crypto.randomInt(100000, 1000000).toString();
    const challengeId = crypto.randomUUID();
    try {
        // A unique email index makes concurrent sends obey the same cooldown.
        await OtpCode.findOneAndUpdate({ email, lastSentAt: { $lte: new Date(now - OTP_RESEND_COOLDOWN_MS) } }, {
            $set: { email, challengeId, browserTokenHash, purpose: "email_signin", otpHash: hashOtp(otp, challengeId),
                expiresAt: new Date(now.getTime() + OTP_EXPIRY_MS), lastSentAt: now, attempts: 0, consumedAt: null }
        }, { upsert: true, new: true, runValidators: true });
    } catch (error) {
        if (error.code === 11000) throw createHttpError(429, "Please wait 60 seconds before requesting another code.");
        throw error;
    }
    try {
        await sendOtpEmail({ email, otp });
    } catch (error) {
        await OtpCode.deleteOne({ email, challengeId });
        throw error;
    }
};

const verifyOtp = async ({ email, otp, browserTokenHash }) => {
    email = normalizeEmail(email);
    validateEmail(email);
    if (!/^\d{6}$/.test(String(otp || ""))) throw createHttpError(400, "Enter the six-digit code.");
    // Claim an attempt atomically; parallel requests cannot bypass the limit.
    const code = await OtpCode.findOneAndUpdate({ email, browserTokenHash, consumedAt: null,
        expiresAt: { $gt: new Date() }, attempts: { $lt: OTP_MAX_ATTEMPTS } },
    { $inc: { attempts: 1 } }, { new: true }).select("+otpHash");
    const invalid = () => createHttpError(400, "Code expired, invalid, or too many attempts. Request a new code.");
    if (!code) throw invalid();
    if (!crypto.timingSafeEqual(Buffer.from(code.otpHash, "hex"), Buffer.from(hashOtp(String(otp), code.challengeId), "hex"))) throw invalid();
    const claimed = await OtpCode.findOneAndUpdate({ _id: code._id, challengeId: code.challengeId, consumedAt: null,
        expiresAt: { $gt: new Date() } }, { $set: { consumedAt: new Date() } });
    if (!claimed) throw invalid();
};

module.exports = { issueOtp, verifyOtp, normalizeEmail, validateEmail };
