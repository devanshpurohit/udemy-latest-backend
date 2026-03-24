const express = require('express');
const router = express.Router();
const { createOrGetConversation, getConversations, getMessages } = require('../controllers/conversationController');
const { protect } = require('../middleware/auth'); // Ensure this exist

router.post('/', protect, createOrGetConversation);
router.get('/', protect, getConversations);
router.get('/:conversationId/messages', protect, getMessages);

module.exports = router;
