const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  selectedOptionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  isCorrect: {
    type: Boolean,
    required: true,
  },
});

const resultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
  },
  answers: [answerSchema],
  score: {
    type: Number,
    required: true,
  },
  timeSpent: {
    type: Number,
    required: true,
  },
  completedAt: {
    type: Date,
    default: Date.now,
  },
  nextAttemptAllowed: {
    type: Date,
    required: true,
    default: function() {
      return new Date(Date.now() + (24 * 60 * 60 * 1000)); // 24 hours from now
    }
  }
});

// Virtual fields
resultSchema.virtual('totalQuestions').get(function() {
  return this.answers.length;
});

resultSchema.virtual('correctAnswers').get(function() {
  return this.answers.filter(answer => answer.isCorrect).length;
});

// Include virtuals when converting to JSON
resultSchema.set('toJSON', { virtuals: true });
resultSchema.set('toObject', { virtuals: true });

// Add method to check if attempt is allowed
resultSchema.statics.isAttemptAllowed = async function(userId, quizId) {
  const latestAttempt = await this.findOne({
    userId,
    quizId
  }).sort({ completedAt: -1 });

  if (!latestAttempt) return true;
  
  return Date.now() >= latestAttempt.nextAttemptAllowed.getTime();
};

module.exports = mongoose.model('Result', resultSchema); 