const express = require('express');
const { getSettings, updateSettings } = require('../controllers/siteSettingsController');
const { protect, authorize } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');

const router = express.Router();

// GET settings (Public)
router.get('/', getSettings);

// UPDATE settings (Admin only)
router.put('/', protect, authorize('admin'), uploadSingle('logo'), updateSettings);

module.exports = router;
