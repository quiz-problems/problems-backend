const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const topicController = require('../controllers/topicController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const validate = require('../middleware/validate');

// Validation rules
const topicValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name must be less than 100 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
];

// Routes
router.get('/', topicController.getAllTopics);
router.post('/', [auth, admin, topicValidation, validate], topicController.createTopic);
router.put('/:id', [auth, admin, topicValidation, validate], topicController.updateTopic);
router.delete('/:id', [auth, admin], topicController.deleteTopic);

module.exports = router; 