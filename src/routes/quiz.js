const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const quizController = require('../controllers/quizController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

// Validation rules
const submitQuizValidation = [
  body('answers').isArray().withMessage('Answers must be an array'),
  body('answers.*.questionId').notEmpty().withMessage('Question ID is required'),
  body('answers.*.selectedOptionId').notEmpty().withMessage('Selected option ID is required'),
  body('timeSpent').isInt({ min: 0 }).withMessage('Time spent must be a positive number'),
];

// Routes
router.get('/', quizController.getAllQuizzes);
router.get('/:id', quizController.getQuizById);
router.post('/:id/submit', [auth, submitQuizValidation, validate], quizController.submitQuiz);
router.get('/:id/results', auth, quizController.getQuizResults);
router.post('/:id/export', auth, quizController.exportResults);
router.get('/:id/cooldown', auth, quizController.getCooldownStatus);

module.exports = router; 