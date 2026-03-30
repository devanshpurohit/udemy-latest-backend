const express = require('express');
const { body } = require('express-validator');
const courseController = require('../controllers/courseController');
const Course = require('../models/Course');
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
    .isString()
    .withMessage('Video URL must be a valid URL or path'),
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
    .customSanitizer(value => {
      // Convert string boolean values to actual boolean
      if (value === 'true' || value === 'on' || value === '1') return true;
      if (value === 'false' || value === 'off' || value === '0') return false;
      return Boolean(value);
    })
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
    .isString()
    .withMessage('Video URL must be a valid URL or path'),
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
router.get('/list', courseController.getCourseList);
// Static GET routes must come before /:id
router.get('/cloudinary-signature', authorize('admin', 'instructor'), courseController.getCloudinarySignature);
router.get('/', courseController.getCourses);
router.get('/:id', courseController.getCourse);
router.put('/:id', authorize('admin', 'instructor'), updateCourseValidation, courseController.updateCourse);
router.delete('/:id', authorize('admin', 'instructor'), courseController.deleteCourse);

// Lesson routes
router.post('/:id/lessons', authorize('admin', 'instructor'), addLessonValidation, courseController.addLesson);
router.put('/:id/lessons/:lessonId', authorize('admin', 'instructor'), updateLessonValidation, courseController.updateLesson);
router.delete('/:id/lessons/:lessonId', authorize('admin', 'instructor'), courseController.deleteLesson);

// Section routes
router.post('/:id/sections', authorize('admin', 'instructor'), courseController.addSection);
router.put('/:id/sections/:sectionId', authorize('admin', 'instructor'), courseController.updateSection);
router.delete('/:id/sections/:sectionId', authorize('admin', 'instructor'), courseController.deleteSection);

// Section lesson routes
router.post('/:id/sections/:sectionId/lessons', authorize('admin', 'instructor'), addLessonValidation, courseController.addLessonToSection);
router.put('/:id/sections/:sectionId/lessons/:lessonId', authorize('admin', 'instructor'), addLessonValidation, courseController.updateLessonInSection);
router.delete('/:id/sections/:sectionId/lessons/:lessonId', authorize('admin', 'instructor'), courseController.deleteLessonFromSection);

// Quiz routes
router.post('/:id/sections/:sectionId/lessons/:lessonId/quiz', authorize('admin', 'instructor'), courseController.addQuizToLesson);
router.put('/:id/sections/:sectionId/lessons/:lessonId/quiz/:quizId', authorize('admin', 'instructor'), courseController.updateQuiz);
router.delete('/:id/sections/:sectionId/lessons/:lessonId/quiz/:quizId', authorize('admin', 'instructor'), courseController.deleteQuiz);

// Get lesson details
router.get('/:id/sections/:sectionId/lessons/:lessonId', courseController.getLesson);

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
router.post('/upload-video', authorize('admin', 'instructor'), uploadSingle('video'), courseController.uploadCourseVideo);

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
    course.thumbnail = `/uploads/thumbnails/${req.file.filename}`;
    await course.save();

    res.status(200).json({
      success: true,
      message: 'Thumbnail uploaded successfully',
      data: {
        thumbnail: `/uploads/thumbnails/${req.file.filename}`
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

    console.log(`🎬 Video Upload started for course: ${req.params.id}, lesson: ${req.params.lessonId}`);
    
    let lesson = null;
    let foundInSection = null;
    let sectionType = 'sections';

    // Search in English sections
    if (course.sections && course.sections.length > 0) {
      console.log(`🔍 Searching in ${course.sections.length} English sections...`);
      for (const section of course.sections) {
        // Use manual find as a robust fallback for .id()
        const found = section.lessons.find(l => l._id && l._id.toString() === req.params.lessonId);
        if (found) {
          console.log(`✅ Found lesson in section: ${section._id}`);
          lesson = found;
          foundInSection = section;
          sectionType = 'sections';
          break;
        }
      }
    }

    // Search in Kannada sections if not found
    if (!lesson && course.sections_kn && course.sections_kn.length > 0) {
      console.log(`🔍 Searching in ${course.sections_kn.length} Kannada sections...`);
      for (const section of course.sections_kn) {
        const found = section.lessons.find(l => l._id && l._id.toString() === req.params.lessonId);
        if (found) {
          console.log(`✅ Found lesson in Kannada section: ${section._id}`);
          lesson = found;
          foundInSection = section;
          sectionType = 'sections_kn';
          break;
        }
      }
    }

    if (!lesson) {
      console.error('❌ Lesson not found in any section');
      return res.status(404).json({
        success: false,
        message: 'Lesson not found in any section'
      });
    }

    // Get language from body or query (default to 'en')
    const lang = req.body.lang || req.query.lang || 'en';
    console.log(`🌐 Language: ${lang}`);
    
    // Initialize videoUrl object if it's a legacy string or doesn't exist
    if (!lesson.videoUrl || typeof lesson.videoUrl === 'string') {
      const oldUrl = typeof lesson.videoUrl === 'string' ? lesson.videoUrl : '';
      lesson.videoUrl = { en: oldUrl, kn: '' };
    }

    // Delete old video for this language if it exists
    if (lesson.videoUrl[lang]) {
      const { deleteFile } = require('../middleware/upload');
      try {
        console.log(`🗑️ Deleting old video: ${lesson.videoUrl[lang]}`);
        deleteFile(lesson.videoUrl[lang]);
      } catch (err) {
        console.warn('Could not delete old video file:', err.message);
      }
    }

    // Update lesson video for specific language
    // 🚀 Upload to Cloudinary
    console.log(`🚀 Uploading to Cloudinary for ${lang}...`);
    const cloudinary = require('../config/cloudinary');
    const fs = require('fs');
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "video",
      folder: "udemy/lessons"
    });

    // Cleanup: Delete from local disk after successful upload to Cloudinary
    if (req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting local video after Cloudinary upload:', err);
      });
    }

    const newPath = result.secure_url;
    console.log(`📤 New Cloudinary video path: ${newPath}`);
    lesson.videoUrl[lang] = newPath;
    
    // Mark as modified to ensure Mongoose saves the nested change
    course.markModified(sectionType);
    await course.save();
    console.log('🏁 Save successful');

    res.status(200).json({
      success: true,
      message: `Video uploaded successfully to Cloudinary for ${lang}`,
      data: {
        videoUrl: lesson.videoUrl
      }
    });
  } catch (error) {
    console.error('Upload video error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading video to Cloudinary',
      error: error.message
    });
  }
});

module.exports = router;
