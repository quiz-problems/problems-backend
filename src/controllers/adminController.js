const Quiz = require('../models/Quiz');
const Result = require('../models/Result');
const User = require('../models/User');
const Topic = require('../models/Topic');
const mongoose = require('mongoose');

// Get admin dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const [
      userStats,
      quizStats,
      topicStats,
      recentActivity
    ] = await Promise.all([
      // User statistics
      User.aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            newUsersToday: {
              $sum: {
                $cond: [
                  { 
                    $gte: [
                      '$createdAt',
                      new Date(new Date().setHours(0, 0, 0, 0))
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]),

      // Quiz statistics
      Result.aggregate([
        {
          $group: {
            _id: null,
            totalAttempts: { $sum: 1 },
            averageScore: { $avg: '$score' },
            totalQuizTime: { $sum: '$timeSpent' }
          }
        }
      ]),

      // Topic statistics
      Topic.aggregate([
        {
          $lookup: {
            from: 'quizzes',
            localField: '_id',
            foreignField: 'topicId',
            as: 'quizzes'
          }
        },
        {
          $project: {
            name: 1,
            quizCount: { $size: '$quizzes' }
          }
        },
        {
          $sort: { quizCount: -1 }
        }
      ]),

      // Recent activity
      Result.find()
        .sort({ completedAt: -1 })
        .limit(10)
        .populate('userId', 'name')
        .populate({
          path: 'quizId',
          select: 'title difficulty topicId',
          populate: { path: 'topicId', select: 'name' }
        })
    ]);

    const userMetrics = userStats[0] || { totalUsers: 0, newUsersToday: 0 };
    const quizMetrics = quizStats[0] || { totalAttempts: 0, averageScore: 0, totalQuizTime: 0 };

    // Format recent activity
    const activity = recentActivity.map(result => ({
      id: result._id,
      type: 'QUIZ_COMPLETED',
      user: {
        id: result.userId._id,
        name: result.userId.name
      },
      quiz: {
        id: result.quizId._id,
        title: result.quizId.title,
        difficulty: result.quizId.difficulty,
        topic: {
          id: result.quizId.topicId._id,
          name: result.quizId.topicId.name
        }
      },
      score: result.score,
      timestamp: result.completedAt
    }));

    res.json({
      users: {
        total: userMetrics.totalUsers,
        newToday: userMetrics.newUsersToday
      },
      quizzes: {
        totalAttempts: quizMetrics.totalAttempts,
        averageScore: Math.round(quizMetrics.averageScore || 0),
        totalTimeSpent: quizMetrics.totalQuizTime
      },
      topics: topicStats,
      recentActivity: activity
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to get dashboard statistics' });
  }
};

// Create new quiz
exports.createQuiz = async (req, res) => {
  try {
    const quiz = new Quiz({
      ...req.body,
      createdBy: req.user._id
    });

    await quiz.save();

    // Populate topic info for response
    await quiz.populate('topicId', 'name');

    res.status(201).json({
      quiz: {
        ...quiz.toObject(),
        topic: quiz.topicId
      }
    });
  } catch (error) {
    console.error('Create quiz error:', error);
    res.status(500).json({ error: 'Failed to create quiz' });
  }
};

// Update quiz
exports.updateQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Update quiz fields
    Object.assign(quiz, req.body);
    await quiz.save();

    // Populate topic info for response
    await quiz.populate('topicId', 'name');

    res.json({
      quiz: {
        ...quiz.toObject(),
        topic: quiz.topicId
      }
    });
  } catch (error) {
    console.error('Update quiz error:', error);
    res.status(500).json({ error: 'Failed to update quiz' });
  }
};

// Delete quiz
exports.deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Delete associated results first
    await Result.deleteMany({ quizId: quiz._id });
    await quiz.deleteOne();

    res.status(204).send();
  } catch (error) {
    console.error('Delete quiz error:', error);
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
};

// Get quiz analytics
exports.getQuizAnalytics = async (req, res) => {
  try {
    const quizId = mongoose.Types.ObjectId(req.params.id);
    
    const [quiz, analytics] = await Promise.all([
      Quiz.findById(quizId).populate('topicId', 'name'),
      Result.aggregate([
        { $match: { quizId } },
        {
          $group: {
            _id: null,
            totalAttempts: { $sum: 1 },
            averageScore: { $avg: '$score' },
            averageTime: { $avg: '$timeSpent' },
            scoreDistribution: {
              $push: '$score'
            }
          }
        }
      ])
    ]);

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const stats = analytics[0] || {
      totalAttempts: 0,
      averageScore: 0,
      averageTime: 0,
      scoreDistribution: []
    };

    // Calculate score distribution
    const distribution = {
      '0-20': 0,
      '21-40': 0,
      '41-60': 0,
      '61-80': 0,
      '81-100': 0
    };

    stats.scoreDistribution.forEach(score => {
      if (score <= 20) distribution['0-20']++;
      else if (score <= 40) distribution['21-40']++;
      else if (score <= 60) distribution['41-60']++;
      else if (score <= 80) distribution['61-80']++;
      else distribution['81-100']++;
    });

    res.json({
      quiz: {
        id: quiz._id,
        title: quiz.title,
        topic: quiz.topicId,
        difficulty: quiz.difficulty,
        questionCount: quiz.questions.length
      },
      analytics: {
        totalAttempts: stats.totalAttempts,
        averageScore: Math.round(stats.averageScore || 0),
        averageTime: Math.round(stats.averageTime || 0),
        scoreDistribution: distribution
      }
    });
  } catch (error) {
    console.error('Get quiz analytics error:', error);
    res.status(500).json({ error: 'Failed to get quiz analytics' });
  }
}; 