const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

// Validation rules
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Must be a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Must be a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Routes
router.post('/register', registerValidation, validate, (req, res, next) => {
  console.log('Register route hit:', req.body);
  authController.register(req, res, next);
});

router.post('/login', loginValidation, validate, (req, res, next) => {
  console.log('Login route hit:', req.body);
  authController.login(req, res, next);
});

router.get('/me', auth, authController.getMe);

module.exports = router; 