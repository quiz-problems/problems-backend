const Achievement = require('../models/Achievement');
const UserAchievement = require('../models/UserAchievement');
const Result = require('../models/Result');

exports.getUserAchievements = async (req, res) => {
  try {
    const userAchievements = await UserAchievement.find({ userId: req.user._id })
      .populate('achievementId')
      .sort({ unlockedAt: -1 });

    res.json(userAchievements);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get achievements' });
  }
};

exports.getAchievementProgress = async (req, res) => {
  try {
    const achievements = await Achievement.find();
    const userAchievements = await UserAchievement.find({ userId: req.user._id });

    const progress = await Promise.all(achievements.map(async (achievement) => {
      const userAchievement = userAchievements.find(
        ua => ua.achievementId.toString() === achievement._id.toString()
      );

      if (userAchievement) {
        return {
          ...achievement.toObject(),
          progress: userAchievement.progress,
          unlockedAt: userAchievement.unlockedAt
        };
      }

      // Calculate current progress
      let currentProgress = 0;
      switch (achievement.type) {
        case 'QUIZ_COUNT':
          currentProgress = await Result.countDocuments({ userId: req.user._id });
          break;
        // Add other progress calculations as needed
      }

      return {
        ...achievement.toObject(),
        progress: currentProgress
      };
    }));

    res.json(progress);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get achievement progress' });
  }
}; 