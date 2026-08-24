const mongoose = require("mongoose");

const otpCodeSchema = new mongoose.Schema(
    {
        mobile: {
            type: String,
            required: true,
            index: true
        },

        purpose: {
            type: String,
            enum: ["signup", "password_reset"],
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
