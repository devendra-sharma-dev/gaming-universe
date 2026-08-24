const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            trim: true,
            unique: true,
            sparse: true,
            index: true
        },

        usernameNormalized: {
            type: String,
            lowercase: true,
            trim: true,
            unique: true,
            sparse: true,
            index: true
        },

        mobile: {
            type: String,
            trim: true,
            unique: true,
            sparse: true,
            index: true
        },

        mobileVerified: {
            type: Boolean,
            default: false
        },

        passwordHash: {
            type: String,
            select: false
        },

        xp: {
            type: Number,
            default: 0,
            min: 0
        },

        favorites: {
            type: [mongoose.Schema.Types.Mixed],
            default: []
        }
    },
    {
        timestamps: true,
        toJSON: {
            transform: (_document, returnedObject) => {
                delete returnedObject.passwordHash;
                return returnedObject;
            }
        },
        toObject: {
            transform: (_document, returnedObject) => {
                delete returnedObject.passwordHash;
                return returnedObject;
            }
        }
    }
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
