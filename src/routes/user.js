const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

router.get('/profile', auth, userController.getProfile);
router.get('/profile/stats', auth, userController.getStats);
router.get('/profile/activity', auth, userController.getActivity);
router.put('/profile', auth, userController.updateProfile);

module.exports = router; 