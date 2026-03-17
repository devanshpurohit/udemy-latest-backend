const express = require('express');
const { subscribe, getSubscribers } = require('../controllers/newsletterController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/subscribe', subscribe);
router.get('/', protect, authorize('admin'), getSubscribers);

module.exports = router;
