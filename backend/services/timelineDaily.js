const TimelineEvent = require("../models/TimelineEvent");
const TimelineDailyGame = require("../models/TimelineDailyGame");

const ROUNDS_PER_DAY = 5;
const EVENTS_PER_ROUND = 4;
const EVENTS_PER_DAY = ROUNDS_PER_DAY * EVENTS_PER_ROUND;

const getGameDate = (now = new Date()) => now.toISOString().slice(0, 10);

const createDailyGame = async (gameDate) => {
    const alreadyCreated = await TimelineDailyGame.findOne({ gameDate });
    if (alreadyCreated) return alreadyCreated;

    // Events are scheduled by the imported dataset, not selected at play time.
    // This makes a date's challenge identical for every player.
    const scheduledEvents = await TimelineEvent.find({ usedInGameDate: gameDate })
        .sort({ date: 1, _id: 1 });

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
    const existing = await TimelineDailyGame.findOne({ gameDate }).populate("rounds");
    if (existing) return existing;
    try {
        const created = await createDailyGame(gameDate);
        return created.populate("rounds");
    } catch (error) {
        if (error && error.code === 11000) return TimelineDailyGame.findOne({ gameDate }).populate("rounds");
        throw error;
    }
};

module.exports = { EVENTS_PER_ROUND, ROUNDS_PER_DAY, getGameDate, getOrCreateDailyGame };
