const express = require('express');
const router = express.Router();
const { getLegalContent, updateLegalContent } = require('../controllers/legalContentController');
const { protect, admin } = require('../middleware/auth');

// Public route to get legal content
router.get('/', getLegalContent);

// Private admin route to update legal content
router.put('/', protect, admin, updateLegalContent);

module.exports = router;
