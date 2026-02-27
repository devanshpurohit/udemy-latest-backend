const express = require('express');
const adminController = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes are protected and admin only
router.use(protect);
router.use(authorize('admin'));

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Private (Admin)
router.get('/users', adminController.getAllUsers);

// @route   GET /api/admin/users/:id
// @desc    Get user by ID
// @access  Private (Admin)
router.get('/users/:id', adminController.getUserById);

// @route   PUT /api/admin/users/:id/status
// @desc    Update user status
// @access  Private (Admin)
router.put('/users/:id/status', adminController.updateUserStatus);

// @route   PUT /api/admin/users/:id/profile
// @desc    Update user profile
// @access  Private (Admin)
router.put('/users/:id/profile', adminController.updateUserProfile);

// @route   GET /api/admin/stats
// @desc    Get system statistics
// @access  Private (Admin)
router.get('/stats', adminController.getSystemStats);

module.exports = router;
