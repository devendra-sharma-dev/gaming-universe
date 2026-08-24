const mongoose = require("mongoose");

const connectDatabase = async () => {
    const connectionString = process.env.MONGODB_URI;

    if (!connectionString) {
        throw new Error("MONGODB_URI is not configured.");
    }

    try {
        await mongoose.connect(connectionString, {
            serverSelectionTimeoutMS: 10000
        });
    } catch (error) {
        if (error && error.name === "MongoParseError") {
            throw new Error(
                "MONGODB_URI is invalid. URL-encode special characters in credentials."
            );
        }

        throw error;
    }

    console.log("MongoDB connected.");
};

module.exports = connectDatabase;
