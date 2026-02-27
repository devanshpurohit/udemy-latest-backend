const express = require('express');
const { body } = require('express-validator');
const courseController = require('../controllers/courseController');
const { protect, authorize } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');

const router = express.Router();

// All routes are protected
router.use(protect);

// Validation middleware
const createCourseValidation = [
  body('title')
    .notEmpty()
    .withMessage('Course title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('description')
    .notEmpty()
    .withMessage('Course description is required')
    .isLength({ max: 5000 })
    .withMessage('Description cannot exceed 5000 characters'),
  body('category')
    .isIn(['development', 'business', 'design', 'marketing', 'it-software', 'personal-development', 'health-fitness', 'music', 'academics'])
    .withMessage('Invalid category'),
  body('level')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Invalid level'),
  body('price')
    .isNumeric()
    .withMessage('Price must be a number')
    .isFloat({ min: 0 })
    .withMessage('Price cannot be negative'),
  body('discountedPrice')
    .optional()
    .isNumeric()
    .withMessage('Discounted price must be a number')
    .isFloat({ min: 0 })
    .withMessage('Discounted price cannot be negative'),
  body('duration')
    .isNumeric()
    .withMessage('Duration must be a number')
    .isFloat({ min: 1 })
    .withMessage('Duration must be at least 1 minute'),
  body('language')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Language is required'),
  body('requirements')
    .optional()
    .isArray()
    .withMessage('Requirements must be an array'),
  body('whatYouWillLearn')
    .optional()
    .isArray()
    .withMessage('What you will learn must be an array'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
];

const updateCourseValidation = [
  body('title')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .optional()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Description must be between 1 and 5000 characters'),
  body('category')
    .optional()
    .isIn(['development', 'business', 'design', 'marketing', 'it-software', 'personal-development', 'health-fitness', 'music', 'academics'])
    .withMessage('Invalid category'),
  body('level')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Invalid level'),
  body('price')
    .optional()
    .isNumeric()
    .withMessage('Price must be a number')
    .isFloat({ min: 0 })
    .withMessage('Price cannot be negative'),
  body('discountedPrice')
    .optional()
    .isNumeric()
    .withMessage('Discounted price must be a number')
    .isFloat({ min: 0 })
    .withMessage('Discounted price cannot be negative'),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Invalid status')
];

const addLessonValidation = [
  body('title')
    .notEmpty()
    .withMessage('Lesson title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('videoUrl')
    .optional()
    .isURL()
    .withMessage('Video URL must be a valid URL'),
  body('duration')
    .optional()
    .isNumeric()
    .withMessage('Duration must be a number')
    .isFloat({ min: 1 })
    .withMessage('Duration must be at least 1 minute'),
  body('order')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Order must be a positive integer'),
  body('isPreview')
    .optional()
    .isBoolean()
    .withMessage('isPreview must be a boolean')
];

const updateLessonValidation = [
  body('title')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('videoUrl')
    .optional()
    .isURL()
    .withMessage('Video URL must be a valid URL'),
  body('duration')
    .optional()
    .isNumeric()
    .withMessage('Duration must be a number')
    .isFloat({ min: 1 })
    .withMessage('Duration must be at least 1 minute'),
  body('order')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Order must be a positive integer'),
  body('isPreview')
    .optional()
    .isBoolean()
    .withMessage('isPreview must be a boolean')
];

// Routes
router.post('/', authorize('admin', 'instructor'), createCourseValidation, courseController.createCourse);
router.get('/', courseController.getCourses);
router.get('/:id', courseController.getCourse);
router.put('/:id', authorize('admin', 'instructor'), updateCourseValidation, courseController.updateCourse);
router.delete('/:id', authorize('admin', 'instructor'), courseController.deleteCourse);

// Lesson routes
router.post('/:id/lessons', authorize('admin', 'instructor'), addLessonValidation, courseController.addLesson);
router.put('/:id/lessons/:lessonId', authorize('admin', 'instructor'), updateLessonValidation, courseController.updateLesson);
router.delete('/:id/lessons/:lessonId', authorize('admin', 'instructor'), courseController.deleteLesson);

// Enrollment route
router.post('/:id/enroll', courseController.enrollCourse);

// Wizard routes
router.post('/wizard/draft', authorize('admin', 'instructor'), courseController.saveCourseDraft);
router.put('/wizard/draft/:id', authorize('admin', 'instructor'), courseController.updateCourseDraft);
router.get('/wizard/draft/:id', courseController.getCourseDraft);
router.put('/wizard/content/:id', authorize('admin', 'instructor'), courseController.saveCourseContent);
router.put('/wizard/pricing/:id', authorize('admin', 'instructor'), courseController.saveCoursePricing);
router.put('/wizard/media/:id', authorize('admin', 'instructor'), courseController.saveCourseMedia);
router.post('/wizard/publish/:id', authorize('admin', 'instructor'), courseController.publishCourse);
router.get('/wizard/validate/:id', courseController.validateCourse);

// Upload routes
router.post('/:id/upload-thumbnail', authorize('admin', 'instructor'), uploadSingle('thumbnail'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Delete old thumbnail if exists
    if (course.thumbnail) {
      const { deleteFile } = require('../middleware/upload');
      deleteFile(course.thumbnail);
    }

    // Update course thumbnail
    course.thumbnail = req.file.path;
    await course.save();

    res.status(200).json({
      success: true,
      message: 'Thumbnail uploaded successfully',
      data: {
        thumbnail: req.file.path
      }
    });
  } catch (error) {
    console.error('Upload thumbnail error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading thumbnail'
    });
  }
});

router.post('/:id/lessons/:lessonId/upload-video', authorize('admin', 'instructor'), uploadSingle('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const lesson = course.lessons.id(req.params.lessonId);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // Delete old video if exists
    if (lesson.videoUrl) {
      const { deleteFile } = require('../middleware/upload');
      deleteFile(lesson.videoUrl);
    }

    // Update lesson video
    lesson.videoUrl = req.file.path;
    await course.save();

    res.status(200).json({
      success: true,
      message: 'Video uploaded successfully',
      data: {
        videoUrl: req.file.path
      }
    });
  } catch (error) {
    console.error('Upload video error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading video'
    });
  }
});

module.exports = router;
