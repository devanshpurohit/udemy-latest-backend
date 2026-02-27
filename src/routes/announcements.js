const express = require('express');
const { body } = require('express-validator');
const announcementController = require('../controllers/announcementController');
const { protect, authorize } = require('../middleware/auth');
const { uploadMultiple } = require('../middleware/upload');

const router = express.Router();

// All routes are protected
router.use(protect);

// Validation middleware
const createAnnouncementValidation = [
  body('title')
    .notEmpty()
    .withMessage('Announcement title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('content')
    .notEmpty()
    .withMessage('Announcement content is required')
    .isLength({ max: 5000 })
    .withMessage('Content cannot exceed 5000 characters'),
  body('type')
    .optional()
    .isIn(['general', 'course_update', 'system_maintenance', 'new_feature', 'urgent'])
    .withMessage('Invalid announcement type'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority level'),
  body('targetAudience')
    .optional()
    .isIn(['all', 'students', 'instructors', 'admins'])
    .withMessage('Invalid target audience'),
  body('course')
    .optional()
    .isMongoId()
    .withMessage('Course ID must be a valid MongoDB ID'),
  body('scheduledFor')
    .optional()
    .isISO8601()
    .withMessage('Scheduled date must be a valid date'),
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Expiry date must be a valid date'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
];

const updateAnnouncementValidation = [
  body('title')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('content')
    .optional()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Content must be between 1 and 5000 characters'),
  body('type')
    .optional()
    .isIn(['general', 'course_update', 'system_maintenance', 'new_feature', 'urgent'])
    .withMessage('Invalid announcement type'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority level'),
  body('targetAudience')
    .optional()
    .isIn(['all', 'students', 'instructors', 'admins'])
    .withMessage('Invalid target audience'),
  body('course')
    .optional()
    .isMongoId()
    .withMessage('Course ID must be a valid MongoDB ID'),
  body('scheduledFor')
    .optional()
    .isISO8601()
    .withMessage('Scheduled date must be a valid date'),
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Expiry date must be a valid date'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

// Public routes (accessible by all authenticated users)
router.get('/', announcementController.getAnnouncements);
router.get('/unread/count', announcementController.getUnreadAnnouncementsCount);
router.get('/:id', announcementController.getAnnouncement);

// Admin only routes
router.post('/', authorize('admin'), uploadMultiple('attachments', 5), createAnnouncementValidation, announcementController.createAnnouncement);
router.put('/:id', authorize('admin'), updateAnnouncementValidation, announcementController.updateAnnouncement);
router.delete('/:id', authorize('admin'), announcementController.deleteAnnouncement);
router.put('/:id/toggle-status', authorize('admin'), announcementController.toggleAnnouncementStatus);

module.exports = router;
