const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const dashboardController = require('../controllers/dashboardController');
const authController = require('../controllers/authController');
const studentController = require('../controllers/studentController');
const { protect } = require('../middleware/auth');

// Protected routes
router.use(protect);

// Get user profile
router.get('/profile', userController.getProfile);

// Update user profile
router.put('/profile', userController.updateProfile);

// Get dashboard data
router.get('/dashboard', dashboardController.getUserDashboard);

// Check course access
router.get('/course-access/:id', userController.checkCourseAccess);

// Quiz routes
router.post('/quiz-score', studentController.submitQuizScore);

// Wishlist routes
router.post('/wishlist/:courseId', authController.addToWishlist);
router.get('/wishlist', authController.getWishlist);
router.delete('/wishlist/:courseId', authController.removeFromWishlist);

module.exports = router;
