const User = require('../models/User');
const Result = require('../models/Result');
const Quiz = require('../models/Quiz');
const mongoose = require('mongoose');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    // Get user statistics
    const [quizStats, topicStats, recentActivity] = await Promise.all([
      // Quiz statistics
      Result.aggregate([
        { $match: { userId: user._id } },
        { 
          $group: {
            _id: null,
            totalAttempts: { $sum: 1 },
            averageScore: { $avg: '$score' },
            totalTimeTaken: { $sum: '$timeSpent' },
            highestScore: { $max: '$score' }
          }
        }
      ]),

      // Topic progress
      Quiz.aggregate([
        {
          $lookup: {
            from: 'results',
            localField: '_id',
            foreignField: 'quizId',
            pipeline: [{ $match: { userId: user._id } }],
            as: 'attempts'
          }
        },
        {
          $group: {
            _id: '$topicId',
            totalQuizzes: { $sum: 1 },
            attemptedQuizzes: {
              $sum: { $cond: [{ $gt: [{ $size: '$attempts' }, 0] }, 1, 0] }
            },
            averageScore: { $avg: { $arrayElemAt: ['$attempts.score', 0] } }
          }
        },
        {
          $lookup: {
            from: 'topics',
            localField: '_id',
            foreignField: '_id',
            as: 'topic'
          }
        },
        {
          $unwind: '$topic'
        }
      ]),

      // Recent activity
      Result.find({ userId: user._id })
        .sort({ completedAt: -1 })
        .limit(10)
        .populate('quizId', 'title difficulty')
    ]);

    const stats = quizStats[0] || {
      totalAttempts: 0,
      averageScore: 0,
      totalTimeTaken: 0,
      highestScore: 0
    };

    // Format topic progress
    const topicProgress = topicStats.map(topic => ({
      id: topic._id,
      name: topic.topic.name,
      progress: {
        completion: Math.round((topic.attemptedQuizzes / topic.totalQuizzes) * 100),
        averageScore: Math.round(topic.averageScore || 0),
        totalQuizzes: topic.totalQuizzes,
        attemptedQuizzes: topic.attemptedQuizzes
      }
    }));

    // Format recent activity
    const activity = recentActivity.map(result => ({
      id: result._id,
      quizTitle: result.quizId.title,
      quizDifficulty: result.quizId.difficulty,
      score: result.score,
      timeSpent: result.timeSpent,
      completedAt: result.completedAt
    }));

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      },
      stats: {
        totalAttempts: stats.totalAttempts,
        averageScore: Math.round(stats.averageScore || 0),
        totalTimeTaken: stats.totalTimeTaken,
        highestScore: stats.highestScore,
        topicProgress,
        recentActivity: activity
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const results = await Result.find({ userId: req.user._id });
    
    const stats = {
      totalQuizzesTaken: results.length,
      averageScore: results.reduce((acc, curr) => acc + curr.score, 0) / results.length || 0,
      totalTimeTaken: results.reduce((acc, curr) => acc + curr.timeSpent, 0),
      bestScore: Math.max(...results.map(r => r.score), 0),
      quizzesByDifficulty: {
        EASY: 0,
        MEDIUM: 0,
        HARD: 0
      }
    };

    // Get difficulty distribution
    const quizzes = await Quiz.find({
      _id: { $in: results.map(r => r.quizId) }
    });
    
    quizzes.forEach(quiz => {
      stats.quizzesByDifficulty[quiz.difficulty]++;
    });

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
};

exports.getActivity = async (req, res) => {
  try {
    const activity = await Result.find({ userId: req.user._id })
      .sort({ completedAt: -1 })
      .limit(10)
      .populate('quizId', 'title difficulty');

    const formattedActivity = activity.map(result => ({
      id: result._id,
      quizTitle: result.quizId.title,
      quizDifficulty: result.quizId.difficulty,
      score: result.score,
      timeSpent: result.timeSpent,
      completedAt: result.completedAt
    }));

    res.json(formattedActivity);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get activity' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    // Validate email uniqueness if changed
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ 
        _id: { $ne: user._id },
        email: email.toLowerCase()
      });
      
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    // Update basic info
    if (name) user.name = name;
    if (email) user.email = email.toLowerCase();

    // Update password if provided
    if (currentPassword && newPassword) {
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
      user.password = newPassword;
    }

    await user.save();

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

exports.getQuizHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const [results, total] = await Promise.all([
      Result.find({ userId: req.user._id })
        .sort({ completedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('quizId', 'title difficulty topicId')
        .populate('quizId.topicId', 'name'),
      Result.countDocuments({ userId: req.user._id })
    ]);

    const formattedResults = results.map(result => ({
      id: result._id,
      quiz: {
        id: result.quizId._id,
        title: result.quizId.title,
        difficulty: result.quizId.difficulty,
        topic: result.quizId.topicId
      },
      score: result.score,
      timeSpent: result.timeSpent,
      completedAt: result.completedAt
    }));

    res.json({
      results: formattedResults,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get quiz history error:', error);
    res.status(500).json({ error: 'Failed to get quiz history' });
  }
}; 