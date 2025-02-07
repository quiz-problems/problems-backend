const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['QUIZ_SCORE', 'QUIZ_COUNT', 'STREAK', 'TOPIC_MASTERY'],
    required: true
  },
  threshold: {
    type: Number,
    required: true
  },
  points: {
    type: Number,
    required: true
  }
});

module.exports = mongoose.model('Achievement', achievementSchema); 