const express = require('express');
const { body } = require('express-validator');
const studentController = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');

const router = express.Router();

// All routes are protected
router.use(protect);

// Admin only routes
router.get('/', authorize('admin'), studentController.getStudents);
router.get('/:id', authorize('admin'), studentController.getStudent);
router.put('/:id/status', authorize('admin'), [
  body('isActive')
    .isBoolean()
    .withMessage('isActive must be a boolean')
], studentController.updateStudentStatus);
router.delete('/:id', authorize('admin'), studentController.deleteStudent);

// Profile image upload (admin and student themselves)
router.post('/:id/profile-image', uploadSingle('profileImage'), studentController.updateProfileImage);

// Student progress routes (accessible by admin and the student themselves)
router.get('/:studentId/courses/:courseId/progress', studentController.getStudentProgress);
router.put('/:studentId/courses/:courseId/progress', [
  body('progress')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Progress must be between 0 and 100'),
  body('lessonId')
    .optional()
    .isMongoId()
    .withMessage('Lesson ID must be a valid MongoDB ID')
], studentController.updateStudentProgress);

// Certificate routes
router.get('/:studentId/certificates', studentController.getStudentCertificates);

// Notes routes
router.post('/:studentId/notes', [
  body('courseId')
    .isMongoId()
    .withMessage('Course ID must be a valid MongoDB ID'),
  body('lessonId')
    .optional()
    .isMongoId()
    .withMessage('Lesson ID must be a valid MongoDB ID'),
  body('content')
    .notEmpty()
    .withMessage('Note content is required')
    .isLength({ max: 1000 })
    .withMessage('Note content cannot exceed 1000 characters'),
  body('timestamp')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Timestamp must be a non-negative integer')
], studentController.addStudentNote);

module.exports = router;
