const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const validate = require('../middleware/validate');

// Validation rules
const quizValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('topicId').notEmpty().withMessage('Topic is required'),
  body('difficulty')
    .isIn(['EASY', 'MEDIUM', 'HARD'])
    .withMessage('Invalid difficulty level'),
  body('timeLimit')
    .isInt({ min: 1 })
    .withMessage('Time limit must be a positive number'),
  body('questions').isArray().withMessage('Questions must be an array'),
  body('questions.*.text').trim().notEmpty().withMessage('Question text is required'),
  body('questions.*.options').isArray({ min: 2 }).withMessage('At least 2 options are required'),
  body('questions.*.options.*.text')
    .trim()
    .notEmpty()
    .withMessage('Option text is required'),
  body('questions.*.options.*.isCorrect')
    .isBoolean()
    .withMessage('Option correctness must be boolean'),
  body('questions.*.explanation')
    .trim()
    .notEmpty()
    .withMessage('Explanation is required'),
];

// Routes
router.get('/dashboard', [auth, admin], adminController.getDashboardStats);
router.post('/quizzes', [auth, admin, ...quizValidation, validate], adminController.createQuiz);
router.put('/quizzes/:id', [auth, admin, ...quizValidation, validate], adminController.updateQuiz);
router.delete('/quizzes/:id', [auth, admin], adminController.deleteQuiz);
router.get('/quizzes/:id/analytics', [auth, admin], adminController.getQuizAnalytics);

module.exports = router; 