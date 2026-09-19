require('dotenv').config();
const mongoose = require('mongoose');
const { getOrAssignDailyQuestions } = require('../backend/services/estimateItDaily');
const EstimateItAttempt = require('../backend/models/EstimateItAttempt');
const User = require('../backend/models/User');
const { awardEstimateItXp } = require('../backend/services/xp');
const { calculatePercentageError, getTier, calculateXp, validateBet } = require('../backend/games/estimateIt/logic');
const assert = require('assert');

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);

    const testUser = await User.create({
        username: 'test_est_' + Date.now(),
        usernameNormalized: 'test_est_' + Date.now(),
        email: 'test_est_' + Date.now() + '@example.com',
        xp: 100
    });
    console.log('Created test user:', testUser.username, 'Starting XP:', testUser.xp);

    const testDate = '2099-01-01';
    const questions = await getOrAssignDailyQuestions(testDate);
    assert.equal(questions.length, 5);

    let attempt = await EstimateItAttempt.create({
        userId: testUser._id,
        gameDate: testDate,
        totalChips: 1000,
        remainingChips: 1000
    });
    console.log('Created attempt with 1000 chips');

    const bets = [200, 200, 200, 200, 200];
    let totalXpEarned = 0;

    for (let r = 1; r <= 5; r++) {
        const q = questions[r - 1];
        const bet = bets[r - 1];

        assert.ok(validateBet(bet, attempt.remainingChips, r), 'Bet should be valid');

        const estimate = Math.round(q.answer * 1.03);
        const error = calculatePercentageError(estimate, q.answer);
        const tier = getTier(error);
        const xp = calculateXp(bet, tier.multiplier);
        totalXpEarned += xp;

        attempt.rounds.push({
            questionId: q._id,
            question: q.question,
            actualAnswer: q.answer,
            category: q.category,
            unit: q.unit,
            estimate,
            bet,
            percentageError: Math.round(error * 100) / 100,
            multiplier: tier.multiplier,
            xpEarned: xp,
            submittedAt: new Date()
        });

        attempt.remainingChips -= bet;
        attempt.totalXp += xp;

        if (r < 5) {
            attempt.currentRound += 1;
        } else {
            attempt.status = 'completed';
            attempt.completedAt = new Date();
        }

        await attempt.save();
        console.log('  Round', r, 'completed. Error:', error.toFixed(1) + '%, Tier:', tier.label, 'XP:', xp, 'Remaining chips:', attempt.remainingChips);
    }

    assert.equal(attempt.status, 'completed');
    assert.equal(attempt.remainingChips, 0);
    assert.equal(attempt.rounds.length, 5);
    console.log('Game completed! Total XP earned:', totalXpEarned);

    const newXp = await awardEstimateItXp({
        attemptId: attempt._id,
        userId: testUser._id,
        xpAmount: attempt.totalXp
    });
    console.log('XP awarded! User new XP:', newXp);
    assert.equal(newXp, 100 + totalXpEarned);

    // Verify duplicate award is blocked
    const duplicateAward = await awardEstimateItXp({
        attemptId: attempt._id,
        userId: testUser._id,
        xpAmount: attempt.totalXp
    });
    assert.equal(duplicateAward, null, 'Duplicate XP award must return null');
    console.log('Duplicate XP award blocked successfully.');

    // Cleanup
    await EstimateItAttempt.deleteOne({ _id: attempt._id });
    await User.deleteOne({ _id: testUser._id });
    const EstimateItQuestion = require('../backend/models/EstimateItQuestion');
    await EstimateItQuestion.updateMany({ usedInGameDate: testDate }, { $set: { usedInDailyGame: false, usedInGameDate: null } });
    console.log('Cleaned up test data.');

    await mongoose.disconnect();
    console.log('\nFull 5-round play-through test PASSED! ✓\n');
})().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});

