const express = require('express');
const { body } = require('express-validator');
const certificateController = require('../controllers/certificateController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const generateCertificateValidation = [
  body('courseId')
    .isMongoId()
    .withMessage('Course ID must be a valid MongoDB ID'),
  body('studentId')
    .isMongoId()
    .withMessage('Student ID must be a valid MongoDB ID')
];

const updateCertificateValidation = [
  body('studentName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Student name must be between 1 and 100 characters'),
  body('courseTitle')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Course title must be between 1 and 200 characters'),
  body('instructorName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Instructor name must be between 1 and 100 characters'),
  body('duration')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Duration must be between 1 and 50 characters'),
  body('grade')
    .optional()
    .isIn(['A+', 'A', 'B+', 'B', 'C+', 'C', 'Pass'])
    .withMessage('Invalid grade'),
  body('score')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Score must be between 0 and 100'),
  body('template')
    .optional()
    .isIn(['modern', 'classic', 'minimal', 'professional'])
    .withMessage('Invalid template')
];

const revokeCertificateValidation = [
  body('reason')
    .notEmpty()
    .withMessage('Revocation reason is required')
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters')
];

// Public route (no authentication required)
router.get('/verify/:certificateId', certificateController.verifyCertificate);

// All other routes are protected
router.use(protect);

// Generate certificate (accessible by admin and the student themselves)
router.post('/generate', generateCertificateValidation, certificateController.generateCertificate);

// Create manual certificate (admin only)
router.post('/create-manual', authorize('admin'), certificateController.createManualCertificate);

// Admin only routes
router.get('/', authorize('admin'), certificateController.getCertificates);
router.get('/:id', certificateController.getCertificate);
router.put('/:id', authorize('admin'), updateCertificateValidation, certificateController.updateCertificate);
router.put('/:id/revoke', authorize('admin'), revokeCertificateValidation, certificateController.revokeCertificate);

// Download certificate (accessible by admin and the certificate owner)
router.get('/:id/download', certificateController.downloadCertificate);

module.exports = router;
