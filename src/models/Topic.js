const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Virtual for quiz count
topicSchema.virtual('quizCount', {
  ref: 'Quiz',
  localField: '_id',
  foreignField: 'topicId',
  count: true,
});

// Include virtuals when converting to JSON
topicSchema.set('toJSON', { virtuals: true });
topicSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Topic', topicSchema); 