const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
  },
  isCorrect: {
    type: Boolean,
    required: true,
    default: false,
  },
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const questionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
  },
  options: [optionSchema],
  explanation: {
    type: String,
    required: true,
    trim: true,
  },
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  topicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic',
    required: true,
  },
  difficulty: {
    type: String,
    enum: ['EASY', 'MEDIUM', 'HARD'],
    required: true,
  },
  timeLimit: {
    type: Number,
    required: true,
    min: 1,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  questions: [questionSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  cooldownHours: {
    type: Number,
    required: true,
    default: 24,
    min: 0 // 0 means no cooldown
  }
});

// Virtual for question count
quizSchema.virtual('questionCount').get(function() {
  return this.questions.length;
});

// Include virtuals when converting to JSON
quizSchema.set('toJSON', { virtuals: true });
quizSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Quiz', quizSchema); 