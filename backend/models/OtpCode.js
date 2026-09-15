const mongoose = require("mongoose");

const otpCodeSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            unique: true,
            sparse: true,
            index: true
        },
        challengeId: String,
        browserTokenHash: String,
        lastSentAt: Date,

        purpose: {
            type: String,
            enum: ["email_signin"],
            required: true,
            index: true
        },

        otpHash: {
            type: String,
            required: true,
            select: false
        },

        attempts: {
            type: Number,
            default: 0,
            min: 0
        },

        expiresAt: {
            type: Date,
            required: true
        },

        consumedAt: {
            type: Date,
            default: null,
            index: true
        }
    },
    {
        timestamps: true
    }
);

otpCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.models.OtpCode || mongoose.model("OtpCode", otpCodeSchema);
