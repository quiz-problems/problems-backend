const Achievement = require('../models/Achievement');
const UserAchievement = require('../models/UserAchievement');
const Result = require('../models/Result');

const checkAchievements = async (userId) => {
  const achievements = await Achievement.find();
  const newAchievements = [];

  for (const achievement of achievements) {
    const existingAchievement = await UserAchievement.findOne({
      userId,
      achievementId: achievement._id
    });

    if (existingAchievement) continue;

    let achieved = false;
    let progress = 0;

    switch (achievement.type) {
      case 'QUIZ_SCORE':
        const highScore = await Result.findOne({ userId })
          .sort({ score: -1 })
          .limit(1);
        if (highScore) {
          progress = highScore.score;
          achieved = highScore.score >= achievement.threshold;
        }
        break;

      case 'QUIZ_COUNT':
        const quizCount = await Result.countDocuments({ userId });
        progress = quizCount;
        achieved = quizCount >= achievement.threshold;
        break;

      case 'STREAK':
        const results = await Result.find({ userId })
          .sort({ completedAt: -1 });
        let streak = 0;
        let lastDate = null;

        for (const result of results) {
          const currentDate = new Date(result.completedAt).toDateString();
          if (!lastDate || lastDate === currentDate) {
            streak++;
            lastDate = currentDate;
          } else {
            break;
          }
        }
        progress = streak;
        achieved = streak >= achievement.threshold;
        break;

      case 'TOPIC_MASTERY':
        const topicResults = await Result.aggregate([
          { $match: { userId: require('mongoose').Types.ObjectId(userId) } },
          {
            $group: {
              _id: '$quizId',
              avgScore: { $avg: '$score' }
            }
          },
          {
            $match: { avgScore: { $gte: 90 } }
          }
        ]);
        progress = topicResults.length;
        achieved = topicResults.length >= achievement.threshold;
        break;
    }

    if (achieved) {
      const userAchievement = new UserAchievement({
        userId,
        achievementId: achievement._id,
        progress: progress
      });
      await userAchievement.save();
      newAchievements.push(achievement);
    }
  }

  return newAchievements;
};

module.exports = {
  checkAchievements
}; 