const Topic = require('../models/Topic');
const Quiz = require('../models/Quiz');

// Get all topics with stats
exports.getAllTopics = async (req, res) => {
  try {
    const topics = await Topic.find().sort({ name: 1 });
    
    // Get enhanced topic data with stats
    const enhancedTopics = await Promise.all(topics.map(async (topic) => {
      const topicObj = topic.toObject();
      
      // Get quiz counts by difficulty
      const [totalQuizzes, difficultyStats] = await Promise.all([
        Quiz.countDocuments({ topicId: topic._id }),
        Quiz.aggregate([
          { $match: { topicId: topic._id } },
          { 
            $group: {
              _id: '$difficulty',
              count: { $sum: 1 }
            }
          }
        ])
      ]);

      // Format difficulty stats
      const difficulties = {};
      difficultyStats.forEach(stat => {
        difficulties[stat._id.toLowerCase()] = stat.count;
      });

      return {
        ...topicObj,
        stats: {
          totalQuizzes,
          difficulties
        }
      };
    }));
    
    res.json({ 
      topics: enhancedTopics
    });
  } catch (error) {
    console.error('Get topics error:', error);
    res.status(500).json({ error: 'Failed to get topics' });
  }
};

// Get topic by ID with detailed stats
exports.getTopicById = async (req, res) => {
  try {
    const topic = await Topic.findById(req.params.id);
    
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    // Get detailed topic stats
    const [quizzes, userStats] = await Promise.all([
      Quiz.find({ topicId: topic._id })
        .select('title difficulty timeLimit')
        .sort({ createdAt: -1 }),
      Quiz.aggregate([
        { $match: { topicId: topic._id } },
        { $lookup: {
            from: 'results',
            localField: '_id',
            foreignField: 'quizId',
            as: 'attempts'
          }
        },
        { $unwind: '$attempts' },
        { 
          $group: {
            _id: null,
            totalAttempts: { $sum: 1 },
            averageScore: { $avg: '$attempts.score' },
            highestScore: { $max: '$attempts.score' }
          }
        }
      ])
    ]);

    const stats = userStats[0] || {
      totalAttempts: 0,
      averageScore: 0,
      highestScore: 0
    };

    // If user is logged in, get their progress in this topic
    let userProgress = null;
    if (req.user) {
      const userAttempts = await Quiz.aggregate([
        { $match: { topicId: topic._id } },
        { $lookup: {
            from: 'results',
            localField: '_id',
            foreignField: 'quizId',
            pipeline: [{ $match: { userId: req.user._id } }],
            as: 'attempts'
          }
        },
        {
          $group: {
            _id: null,
            totalQuizzes: { $sum: 1 },
            attemptedQuizzes: {
              $sum: { $cond: [{ $gt: [{ $size: '$attempts' }, 0] }, 1, 0] }
            },
            averageScore: { $avg: '$attempts.score' }
          }
        }
      ]);

      if (userAttempts.length > 0) {
        userProgress = {
          completion: Math.round((userAttempts[0].attemptedQuizzes / userAttempts[0].totalQuizzes) * 100),
          averageScore: Math.round(userAttempts[0].averageScore || 0),
          totalQuizzes: userAttempts[0].totalQuizzes,
          attemptedQuizzes: userAttempts[0].attemptedQuizzes
        };
      }
    }

    res.json({
      topic: {
        ...topic.toObject(),
        quizzes,
        stats,
        userProgress
      }
    });
  } catch (error) {
    console.error('Get topic error:', error);
    res.status(500).json({ error: 'Failed to get topic details' });
  }
};

// Create new topic (Admin only)
exports.createTopic = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Check if topic already exists
    const existingTopic = await Topic.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });
    
    if (existingTopic) {
      return res.status(400).json({
        error: 'Topic already exists'
      });
    }

    const topic = new Topic({
      name,
      description
    });

    await topic.save();

    res.status(201).json({
      topic: {
        ...topic.toObject(),
        stats: {
          totalQuizzes: 0,
          difficulties: {
            easy: 0,
            medium: 0,
            hard: 0
          }
        }
      }
    });
  } catch (error) {
    console.error('Create topic error:', error);
    res.status(500).json({ error: 'Failed to create topic' });
  }
};

// Update topic (Admin only)
exports.updateTopic = async (req, res) => {
  try {
    const { name, description } = req.body;
    const topic = await Topic.findById(req.params.id);

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    // Check if new name already exists (excluding current topic)
    if (name !== topic.name) {
      const existingTopic = await Topic.findOne({ 
        _id: { $ne: topic._id },
        name: { $regex: new RegExp(`^${name}$`, 'i') }
      });
      
      if (existingTopic) {
        return res.status(400).json({
          error: 'Topic name already exists'
        });
      }
    }

    topic.name = name;
    topic.description = description;

    await topic.save();

    // Get updated stats
    const [totalQuizzes, difficultyStats] = await Promise.all([
      Quiz.countDocuments({ topicId: topic._id }),
      Quiz.aggregate([
        { $match: { topicId: topic._id } },
        { 
          $group: {
            _id: '$difficulty',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const difficulties = {};
    difficultyStats.forEach(stat => {
      difficulties[stat._id.toLowerCase()] = stat.count;
    });
    
    res.json({
      topic: {
        ...topic.toObject(),
        stats: {
          totalQuizzes,
          difficulties
        }
      }
    });
  } catch (error) {
    console.error('Update topic error:', error);
    res.status(500).json({ error: 'Failed to update topic' });
  }
};

// Delete topic (Admin only)
exports.deleteTopic = async (req, res) => {
  try {
    const topic = await Topic.findById(req.params.id);

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    // Check if topic has any quizzes
    const quizCount = await Quiz.countDocuments({ topicId: topic._id });
    if (quizCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete topic with existing quizzes'
      });
    }

    await topic.deleteOne();
    res.status(204).send();
  } catch (error) {
    console.error('Delete topic error:', error);
    res.status(500).json({ error: 'Failed to delete topic' });
  }
}; 