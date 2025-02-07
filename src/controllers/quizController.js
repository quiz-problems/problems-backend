const Quiz = require('../models/Quiz');
const Result = require('../models/Result');
const PDFDocument = require('pdfkit');
const Topic = require('../models/Topic');
const achievementService = require('../services/achievementService');

// Get all quizzes with filters
exports.getAllQuizzes = async (req, res) => {
  try {
    const { topic, difficulty, search, page = 1, limit = 10 } = req.query;
    const query = {};

    // Apply filters
    if (topic) {
      const topicDoc = await Topic.findOne({ 
        name: { $regex: new RegExp(topic, 'i') }
      });
      if (topicDoc) {
        query.topicId = topicDoc._id;
      }
    }
    
    if (difficulty) {
      query.difficulty = difficulty.toUpperCase();
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Count total documents
    const total = await Quiz.countDocuments(query);

    // Get paginated results
    const quizzes = await Quiz.find(query)
      .populate('topicId', 'name')
      .select('-questions.options.isCorrect -questions.explanation')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Add attempt status for logged-in users
    const enhancedQuizzes = await Promise.all(quizzes.map(async (quiz) => {
      const quizObj = quiz.toObject();
      
      if (req.user) {
        const latestAttempt = await Result.findOne({
          userId: req.user._id,
          quizId: quiz._id
        }).sort({ completedAt: -1 });

        quizObj.userStatus = {
          hasAttempted: !!latestAttempt,
          lastScore: latestAttempt?.score,
          canAttempt: !latestAttempt || Date.now() >= latestAttempt.nextAttemptAllowed
        };
      }

      return quizObj;
    }));

    res.json({
      quizzes: enhancedQuizzes,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get quizzes error:', error);
    res.status(500).json({ error: 'Failed to get quizzes' });
  }
};

// Get quiz by ID
exports.getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('topicId', 'name');

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const quizData = quiz.toObject();

    // If user is logged in, check attempt status
    if (req.user) {
      const latestAttempt = await Result.findOne({
        userId: req.user._id,
        quizId: quiz._id
      }).sort({ completedAt: -1 });

      quizData.userStatus = {
        hasAttempted: !!latestAttempt,
        lastScore: latestAttempt?.score,
        canAttempt: !latestAttempt || Date.now() >= latestAttempt.nextAttemptAllowed,
        nextAttemptAt: latestAttempt?.nextAttemptAllowed
      };

      // Only remove correct answers if user can attempt
      if (quizData.userStatus.canAttempt) {
        quizData.questions = quizData.questions.map(q => ({
          ...q,
          options: q.options.map(o => ({
            ...o,
            isCorrect: undefined
          })),
          explanation: undefined
        }));
      }
    }

    res.json(quizData);
  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({ error: 'Failed to get quiz' });
  }
};

// Submit quiz
exports.submitQuiz = async (req, res) => {
  try {
    const { answers, timeSpent } = req.body;
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Validate answers
    if (!answers || answers.length !== quiz.questions.length) {
      return res.status(400).json({ error: 'All questions must be answered' });
    }

    // Check if user can attempt
    const canAttempt = await Result.isAttemptAllowed(req.user._id, quiz._id);
    if (!canAttempt) {
      const lastAttempt = await Result.findOne({
        userId: req.user._id,
        quizId: quiz._id
      }).sort({ completedAt: -1 });
      
      return res.status(403).json({
        error: 'Quiz is in cooldown period',
        nextAttemptAt: lastAttempt.nextAttemptAllowed
      });
    }

    // Calculate score
    let correctCount = 0;
    const detailedResults = answers.map(answer => {
      const question = quiz.questions.find(q => q._id.toString() === answer.questionId);
      const selectedOption = question.options.find(o => o._id.toString() === answer.selectedOptionId);
      
      if (selectedOption.isCorrect) {
        correctCount++;
      }

      return {
        questionId: question._id,
        selectedOptionId: selectedOption._id,
        isCorrect: selectedOption.isCorrect,
        explanation: question.explanation
      };
    });

    const score = Math.round((correctCount / quiz.questions.length) * 100);

    // Save result
    const result = new Result({
      userId: req.user._id,
      quizId: quiz._id,
      score,
      timeSpent,
      answers: detailedResults,
      nextAttemptAllowed: new Date(Date.now() + (quiz.cooldownHours * 60 * 60 * 1000))
    });

    await result.save();

    res.json({
      score,
      correctAnswers: correctCount,
      totalQuestions: quiz.questions.length,
      timeSpent,
      detailedResults
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    res.status(500).json({ error: 'Failed to submit quiz' });
  }
};

// Get quiz results
exports.getQuizResults = async (req, res) => {
  try {
    const results = await Result.find({
      userId: req.user._id,
      quizId: req.params.id
    })
    .sort({ completedAt: -1 })
    .limit(1);

    if (results.length === 0) {
      return res.status(404).json({ error: 'No results found' });
    }

    const result = results[0];
    const quiz = await Quiz.findById(req.params.id);

    res.json({
      score: result.score,
      correctAnswers: result.answers.filter(a => a.correct).length,
      totalQuestions: quiz.questions.length,
      timeSpent: result.timeSpent,
      completedAt: result.completedAt,
      detailedResults: result.answers
    });
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ error: 'Failed to get results' });
  }
};

// Export quiz results as PDF
exports.exportResults = async (req, res) => {
  try {
    const result = await Result.findOne({
      userId: req.user._id,
      quizId: req.params.id,
    })
      .populate('quizId')
      .sort({ completedAt: -1 });

    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }

    // Create PDF
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=quiz-result-${result.quizId._id}.pdf`
    );

    doc.pipe(res);

    // Add content to PDF
    doc.fontSize(20).text('Quiz Results', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Quiz: ${result.quizId.title}`);
    doc.fontSize(12).text(`Score: ${result.score}%`);
    doc.text(`Correct Answers: ${result.correctAnswers}/${result.totalQuestions}`);
    doc.text(`Time Spent: ${Math.floor(result.timeSpent / 60)}m ${result.timeSpent % 60}s`);
    doc.text(`Completed: ${result.completedAt.toLocaleString()}`);

    doc.end();
  } catch (error) {
    console.error('Export results error:', error);
    res.status(500).json({ error: 'Failed to export results' });
  }
};

// Add this new controller function
exports.getCooldownStatus = async (req, res) => {
  try {
    const latestAttempt = await Result.findOne({
      userId: req.user._id,
      quizId: req.params.id
    }).sort({ completedAt: -1 });

    if (!latestAttempt) {
      return res.json({
        canAttempt: true
      });
    }

    const now = new Date();
    const nextAttemptAt = new Date(latestAttempt.nextAttemptAllowed);
    
    res.json({
      canAttempt: now >= nextAttemptAt,
      nextAttemptAt: nextAttemptAt
    });
  } catch (error) {
    console.error('Get cooldown status error:', error);
    res.status(500).json({ error: 'Failed to get cooldown status' });
  }
}; 