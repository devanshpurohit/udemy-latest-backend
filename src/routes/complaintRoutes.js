const express = require('express');
const router = express.Router();
const { createComplaint, getComplaints, deleteComplaint } = require('../controllers/complaintController');
const { protect, admin } = require('../middleware/auth');

// Public route to submit complaint
router.post('/', createComplaint);

// Private admin routes
router.get('/', protect, admin, getComplaints);
router.delete('/:id', protect, admin, deleteComplaint);

module.exports = router;
