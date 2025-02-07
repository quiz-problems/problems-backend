const Result = require('../models/Result');
const User = require('../models/User');
const Quiz = require('../models/Quiz');
const mongoose = require('mongoose');

// Get global leaderboard
exports.getGlobalLeaderboard = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const [leaderboard, total] = await Promise.all([
      Result.aggregate([
        {
          $group: {
            _id: '$userId',
            totalScore: { $avg: '$score' },
            quizzesTaken: { $sum: 1 },
            totalTime: { $sum: '$timeSpent' }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            _id: 0,
            userId: '$_id',
            name: '$user.name',
            averageScore: { $round: ['$totalScore', 1] },
            quizzesTaken: 1,
            averageTime: { 
              $round: [{ $divide: ['$totalTime', '$quizzesTaken'] }, 0] 
            }
          }
        },
        { $sort: { averageScore: -1, quizzesTaken: -1 } },
        { $skip: skip },
        { $limit: parseInt(limit) }
      ]),
      Result.aggregate([
        {
          $group: {
            _id: '$userId'
          }
        },
        { $count: 'total' }
      ])
    ]);

    // Add rank to each entry
    const rankedLeaderboard = leaderboard.map((entry, index) => ({
      ...entry,
      rank: skip + index + 1
    }));

    res.json({
      leaderboard: rankedLeaderboard,
      total: total[0]?.total || 0,
      page: parseInt(page),
      totalPages: Math.ceil((total[0]?.total || 0) / limit)
    });
  } catch (error) {
    console.error('Get global leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
};

// Get topic leaderboard
exports.getTopicLeaderboard = async (req, res) => {
  try {
    const { topicId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Get all quizzes for this topic
    const quizIds = await Quiz.find({ topicId })
      .distinct('_id')
      .exec();

    if (quizIds.length === 0) {
      return res.json({
        leaderboard: [],
        total: 0,
        page: 1,
        totalPages: 0
      });
    }

    const [leaderboard, total] = await Promise.all([
      Result.aggregate([
        {
          $match: {
            quizId: { $in: quizIds }
          }
        },
        {
          $group: {
            _id: '$userId',
            averageScore: { $avg: '$score' },
            quizzesTaken: { $sum: 1 },
            totalTime: { $sum: '$timeSpent' }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            _id: 0,
            userId: '$_id',
            name: '$user.name',
            averageScore: { $round: ['$averageScore', 1] },
            quizzesTaken: 1,
            averageTime: {
              $round: [{ $divide: ['$totalTime', '$quizzesTaken'] }, 0]
            }
          }
        },
        { $sort: { averageScore: -1, quizzesTaken: -1 } },
        { $skip: skip },
        { $limit: parseInt(limit) }
      ]),
      Result.aggregate([
        {
          $match: {
            quizId: { $in: quizIds }
          }
        },
        {
          $group: {
            _id: '$userId'
          }
        },
        { $count: 'total' }
      ])
    ]);

    // Add rank to each entry
    const rankedLeaderboard = leaderboard.map((entry, index) => ({
      ...entry,
      rank: skip + index + 1
    }));

    res.json({
      leaderboard: rankedLeaderboard,
      total: total[0]?.total || 0,
      page: parseInt(page),
      totalPages: Math.ceil((total[0]?.total || 0) / limit)
    });
  } catch (error) {
    console.error('Get topic leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get topic leaderboard' });
  }
};

// Get quiz leaderboard
exports.getQuizLeaderboard = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const [leaderboard, total] = await Promise.all([
      Result.aggregate([
        {
          $match: {
            quizId: mongoose.Types.ObjectId(quizId)
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            _id: 0,
            userId: '$userId',
            name: '$user.name',
            score: 1,
            timeSpent: 1,
            completedAt: 1
          }
        },
        { $sort: { score: -1, timeSpent: 1 } },
        { $skip: skip },
        { $limit: parseInt(limit) }
      ]),
      Result.countDocuments({ quizId: mongoose.Types.ObjectId(quizId) })
    ]);

    // Add rank to each entry
    const rankedLeaderboard = leaderboard.map((entry, index) => ({
      ...entry,
      rank: skip + index + 1
    }));

    res.json({
      leaderboard: rankedLeaderboard,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get quiz leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get quiz leaderboard' });
  }
};

// Get weekly leaderboard
exports.getWeeklyLeaderboard = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Get date for start of current week (Sunday)
    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const [leaderboard, total] = await Promise.all([
      Result.aggregate([
        {
          $match: {
            completedAt: { $gte: startOfWeek }
          }
        },
        {
          $group: {
            _id: '$userId',
            totalScore: { $sum: '$score' },
            quizzesTaken: { $sum: 1 },
            averageTime: { $avg: '$timeSpent' }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            _id: 0,
            userId: '$_id',
            name: '$user.name',
            totalScore: 1,
            quizzesTaken: 1,
            averageTime: { $round: ['$averageTime', 0] }
          }
        },
        { $sort: { totalScore: -1, quizzesTaken: -1 } },
        { $skip: skip },
        { $limit: parseInt(limit) }
      ]),
      Result.aggregate([
        {
          $match: {
            completedAt: { $gte: startOfWeek }
          }
        },
        {
          $group: {
            _id: '$userId'
          }
        },
        { $count: 'total' }
      ])
    ]);

    // Add rank to each entry
    const rankedLeaderboard = leaderboard.map((entry, index) => ({
      ...entry,
      rank: skip + index + 1
    }));

    res.json({
      leaderboard: rankedLeaderboard,
      total: total[0]?.total || 0,
      page: parseInt(page),
      totalPages: Math.ceil((total[0]?.total || 0) / limit)
    });
  } catch (error) {
    console.error('Get weekly leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get weekly leaderboard' });
  }
}; 