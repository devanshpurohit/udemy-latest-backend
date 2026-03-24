const express = require('express');
const router = express.Router();
const { 
  submitFeedback, 
  getApprovedFeedbacks, 
  getAllFeedbacks, 
  updateFeedbackStatus, 
  deleteFeedback,
  adminCreateFeedback
} = require('../controllers/feedbackController');
const { protect, admin } = require('../middleware/auth');

// Public route to get approved feedbacks for homepage
router.get('/approved', getApprovedFeedbacks);

// User/Public route to submit feedback
// We use a conditional check for req.user in the controller, 
// but we can allow it even if not strictly protected to allow guest feedback if desired.
// Here we protect it to ensure we get user data if logged in.
router.post('/', protect, submitFeedback);

// Admin routes
router.get('/', protect, admin, getAllFeedbacks);
router.post('/admin', protect, admin, adminCreateFeedback);
router.put('/:id', protect, admin, updateFeedbackStatus);
router.delete('/:id', protect, admin, deleteFeedback);

module.exports = router;
