const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// @route   GET /api/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private
router.get('/stats', dashboardController.getDashboardStats);

// @route   GET /api/dashboard/revenue
// @desc    Get revenue data
// @access  Private (Admin only)
router.get('/revenue', authorize('admin'), dashboardController.getRevenueData);

// @route   GET /api/dashboard/course-performance
// @desc    Get course performance data
// @access  Private
router.get('/course-performance', dashboardController.getCoursePerformance);

// @route   GET /api/dashboard/enrollment-trends
// @desc    Get enrollment trends
// @access  Private (Admin only)
router.get('/enrollment-trends', authorize('admin'), dashboardController.getEnrollmentTrends);

module.exports = router;
