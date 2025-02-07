const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');
const auth = require('../middleware/auth');

router.get('/global', leaderboardController.getGlobalLeaderboard);
router.get('/quiz/:quizId', leaderboardController.getQuizLeaderboard);
router.get('/topic/:topicId', leaderboardController.getTopicLeaderboard);
router.get('/weekly', leaderboardController.getWeeklyLeaderboard);

module.exports = router; 