const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const {
  sendMessage,
  getChatHistory,
  clearChatHistory,
  getAllUsers
} = require('../controllers/chatController');

// Validation middleware
const sendMessageValidation = [
  body('message')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message must be between 1 and 2000 characters'),
  body('sessionId')
    .optional()
    .isString()
    .withMessage('Session ID must be a string')
];

// @route   POST /api/chat/send
// @desc    Send message (no AI)
// @access  Private
router.post('/send', protect, sendMessageValidation, sendMessage);

// @route   GET /api/chat/history
// @desc    Get chat history
// @access  Private
router.get('/history', protect, getChatHistory);

// @route   DELETE /api/chat/clear
// @desc    Clear chat history
// @access  Private
router.delete('/clear', protect, clearChatHistory);

// @route   GET /api/chat/users
// @desc    Get all users for admin chat
// @access  Private
router.get('/users', protect, getAllUsers);

module.exports = router;
