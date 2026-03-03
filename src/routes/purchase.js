const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const purchaseController = require('../controllers/purchaseController');

// POST /api/purchase/:courseId
router.post('/purchase/:courseId', protect, purchaseController.purchaseCourse);

// GET /api/my-courses
router.get('/my-courses', protect, purchaseController.getMyCourses);

module.exports = router;

