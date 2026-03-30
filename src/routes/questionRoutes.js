const express = require('express');
const router = express.Router();
const { 
  createQuestion, 
  getMyQuestions, 
  getPublicQuestions, 
  answerQuestion, 
  getPendingQuestions,
  createFAQ,
  getCoursePublicFAQs,
  getQuestionsAdmin,
  deleteQuestion
} = require('../controllers/questionController');
const { protect, admin } = require('../middleware/auth');

// Public FAQ questions
router.get('/public', getPublicQuestions);
router.get('/course/:courseId', getCoursePublicFAQs);

// Student protected routes
router.post('/', protect, createQuestion);
router.get('/my', protect, getMyQuestions);

// Admin protected routes
router.get('/admin/all', protect, admin, getQuestionsAdmin);
router.get('/admin/pending', protect, admin, getPendingQuestions);
router.post('/admin/create', protect, admin, createFAQ);
router.put('/:id/answer', protect, admin, answerQuestion);
router.delete('/:id', protect, admin, deleteQuestion);

module.exports = router;
