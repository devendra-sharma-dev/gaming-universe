const TimelineEvent = require("../models/TimelineEvent");
const TimelineDailyGame = require("../models/TimelineDailyGame");

const ROUNDS_PER_DAY = 5;
const EVENTS_PER_ROUND = 4;
const EVENTS_PER_DAY = ROUNDS_PER_ROUND * EVENTS_PER_ROUND;
const dailyHydratedCache = new Map();

const getGameDate = (now = new Date()) => now.toISOString().slice(0, 10);

const cacheDailyGame = (gameDate, hydrated) => {
    dailyHydratedCache.set(gameDate, hydrated);
    if (dailyHydratedCache.size > 7) {
        const oldestKey = dailyHydratedCache.keys().next().value;
        dailyHydratedCache.delete(oldestKey);
    }
    return hydrated;
};

const hydrateGameRounds = async (game) => {
    const rawIds = game.rounds.flat(Infinity).map((item) => String(item?._id || item));
    const events = await TimelineEvent.find({ _id: { $in: rawIds } })
        .select("_id title description category date")
        .lean();
    const byId = new Map(events.map((event) => [String(event._id), event]));
    const rounds = game.rounds.map((round) =>
        round.flat(Infinity).map((item) => byId.get(String(item?._id || item))).filter(Boolean)
    );
    return { gameDate: game.gameDate, rounds };
};

const createDailyGame = async (gameDate) => {
    const alreadyCreated = await TimelineDailyGame.findOne({ gameDate }).lean();
    if (alreadyCreated) return alreadyCreated;

    // Events are scheduled by the imported dataset, not selected at play time.
    // This makes a date's challenge identical for every player.
    const scheduledEvents = await TimelineEvent.find({ usedInGameDate: gameDate })
        .sort({ date: 1, _id: 1 })
        .select("_id")
        .lean();

    if (scheduledEvents.length !== EVENTS_PER_DAY) {
        throw new Error(
            `Timeline schedule for ${gameDate} must contain exactly ${EVENTS_PER_DAY} events; found ${scheduledEvents.length}.`
        );
    }

    const rounds = Array.from(
        { length: ROUNDS_PER_DAY },
        (_, index) => scheduledEvents
            .slice(index * EVENTS_PER_ROUND, (index + 1) * EVENTS_PER_ROUND)
            .map((event) => event._id)
    );

    return TimelineDailyGame.create({ gameDate, rounds });
};

const getOrCreateDailyGame = async (gameDate = getGameDate()) => {
    const cached = dailyHydratedCache.get(gameDate);
    if (cached) return cached;

    const existing = await TimelineDailyGame.findOne({ gameDate }).lean();
    if (existing) {
        return cacheDailyGame(gameDate, await hydrateGameRounds(existing));
    }

    try {
        const created = await createDailyGame(gameDate);
        return cacheDailyGame(gameDate, await hydrateGameRounds(created));
    } catch (error) {
        if (error && error.code === 11000) {
            const concurrent = await TimelineDailyGame.findOne({ gameDate }).lean();
            if (concurrent) return cacheDailyGame(gameDate, await hydrateGameRounds(concurrent));
        }
        throw error;
    }
};

module.exports = { EVENTS_PER_ROUND, ROUNDS_PER_DAY, getGameDate, getOrCreateDailyGame };
