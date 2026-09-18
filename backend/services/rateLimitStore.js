"use strict";
const crypto = require("node:crypto");
const mongoose = require("mongoose");

// Share OTP request limits between Vercel instances. Expired windows reset
// atomically, independently of MongoDB's asynchronous TTL cleanup.
class MongoRateLimitStore {
    constructor(prefix) { this.prefix = prefix; this.localKeys = false; }
    init(options) { this.windowMs = options.windowMs; }
    get collection() { return mongoose.connection.collection("authRateLimits"); }
    key(key) { return `${this.prefix}:${crypto.createHash("sha256").update(key).digest("hex")}`; }
    async increment(key) {
        const now = new Date();
        const expired = { $lte: [{ $ifNull: ["$resetTime", new Date(0)] }, now] };
        const document = await this.collection.findOneAndUpdate({ _id: this.key(key) }, [{ $set: {
            totalHits: { $cond: [expired, 1, { $add: ["$totalHits", 1] }] },
            resetTime: { $cond: [expired, new Date(now.getTime() + this.windowMs), "$resetTime"] }
        } }], { upsert: true, returnDocument: "after", includeResultMetadata: false });
        return { totalHits: document.totalHits, resetTime: document.resetTime };
    }
    async decrement(key) { await this.collection.updateOne({ _id: this.key(key), totalHits: { $gt: 0 } }, { $inc: { totalHits: -1 } }); }
    async resetKey(key) { await this.collection.deleteOne({ _id: this.key(key) }); }
}

module.exports = MongoRateLimitStore;
