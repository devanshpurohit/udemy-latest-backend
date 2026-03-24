const express = require('express');
const Course = require('../models/Course');
const User = require('../models/User');
const mongoose = require('mongoose');

const router = express.Router();

// @desc    Get all published courses for public view
// @route   GET /api/public/courses
// @access  Public
router.get('/courses', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      level,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    console.log('🔍 Public Courses API - Query params:', { page, limit, category, level, search, sortBy, sortOrder });

    // Build filter for published courses only
    const filter = { 
      status: 'published'
    };
    
    if (category) filter.category = category;
    if (level) filter.level = level;
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    console.log('🔍 Public Courses API - Filter:', filter);

    // Sort options
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const courses = await Course.find(filter)
      .populate('instructor', 'username profile.firstName profile.lastName')
      .select('-requirements -whatYouWillLearn -enrolledStudents -ratings')
      .sort(sort)
      .exec();

    console.log('🔍 Public Courses API - Found courses:', courses.length);

    // Check if user is authenticated and add purchase + progress status
    let userPurchasedCourses = [];
    let userProgress = [];
    let authenticatedUserId = null;
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        authenticatedUserId = decoded.id;
        
        const user = await User.findById(authenticatedUserId).select('enrolledCourses purchasedCourses progress');
        if (user) {
          const enrolled = (user.enrolledCourses || []).map(id => id.toString());
          const purchased = (user.purchasedCourses || []).map(id => id.toString());
          userPurchasedCourses = [...new Set([...enrolled, ...purchased])];
          
          userProgress = user.progress || [];
        }
      } catch (error) {
        console.log('🔍 Token verification failed, treating as unauthenticated user');
      }
    }
 
    // Fetch Student data for the user to sync old progress
    let studentData = null;
    if (authenticatedUserId) {
      try {
        const Student = require('../models/Student');
        studentData = await Student.findOne({ user: authenticatedUserId }).lean();
      } catch (err) {
        console.error('Error fetching student data for progress sync:', err);
      }
    }
    const studentEnrolled = studentData?.enrolledCourses || [];

    // Add isPurchased and progress fields to each course
    const coursesWithStatus = courses.map(course => {
      const courseObj = course.toObject();
      const isEnrolled = userPurchasedCourses.includes(course._id.toString());
      courseObj.isPurchased = isEnrolled;

      // Robustly calculate total lessons in the course (from sections or lessons array)
      let totalLessonsCount = course.totalLessons || 0;
      if (totalLessonsCount === 0) {
        if (course.sections && Array.isArray(course.sections) && course.sections.length > 0) {
          course.sections.forEach(section => {
            if (section.lessons && Array.isArray(section.lessons)) {
              totalLessonsCount += section.lessons.length;
            }
          });
        } else if (course.lessons && Array.isArray(course.lessons)) {
          totalLessonsCount = course.lessons.length;
        }
      }

      if (isEnrolled) {
        // Find progress from User model
        const userProgressEntry = userProgress.find(
          p => p.courseId.toString() === course._id.toString()
        );

        // Find progress from Student model (backup for old courses)
        const studentProgressEntry = studentEnrolled.find(
          e => (e.course || e.courseId)?.toString() === course._id.toString()
        );

        // Merge completed lessons from both models
        const userCompleted = (userProgressEntry?.completedLessons || []).map(l => 
          (l.lessonId || l._id || l.lesson)?.toString()
        );
        const studentCompleted = (studentProgressEntry?.completedLessons || []).map(l => 
          (l.lesson || l._id || l.lessonId)?.toString()
        );
        
        const uniqueCompleted = new Set([...userCompleted, ...studentCompleted]);
        const completedLessonsCount = uniqueCompleted.size;

        const progressPercentage = totalLessonsCount > 0 
          ? Math.round((completedLessonsCount / totalLessonsCount) * 100) 
          : 0;

        courseObj.progressPercentage = progressPercentage;
        courseObj.completedLessonsCount = completedLessonsCount;
      }

      courseObj.totalLessonsCount = totalLessonsCount;
      return courseObj;
    });

    res.status(200).json({
      success: true,
      data: coursesWithStatus
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// @desc    Get single published course
// @route   GET /api/public/courses/:id
// @access  Public
router.get('/courses/:id', async (req, res) => {
  try {
    console.log('🔍 Requested course ID:', req.params.id);
    console.log('🔍 ID type:', typeof req.params.id);
    console.log('🔍 ID valid ObjectId?', mongoose.Types.ObjectId.isValid(req.params.id));
    
    // Convert string ID to ObjectId for proper database query
    const courseId = mongoose.Types.ObjectId.isValid(req.params.id) 
      ? req.params.id 
      : new mongoose.Types.ObjectId(req.params.id);
      
    console.log('🔍 Final courseId:', courseId);
      
    const course = await Course.findOne({
      _id: courseId,
      status: 'published'
    })
    .populate('instructor', 'username profile.firstName profile.lastName profile.profileImage')
    .select('-enrolledStudents -ratings');
    
    console.log('🔍 Query result:', course);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const courseObj = course.toObject();
    let isPurchased = false;
    let progressEntry = null;
    let completedLessons = [];
    let completedLessonsCount = 0;
    let progressPercentage = 0;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Fetch User and Student data for progress merging
        const [user, StudentData] = await Promise.all([
          User.findById(decoded.id).select('enrolledCourses purchasedCourses progress').lean(),
          require('../models/Student').findOne({ user: decoded.id }).lean()
        ]);

        if (user) {
          const enrolled = (user.enrolledCourses || []).map(id => id.toString());
          const purchased = (user.purchasedCourses || []).map(id => id.toString());
          isPurchased = enrolled.includes(courseId.toString()) || purchased.includes(courseId.toString());
          
          if (isPurchased) {
            // Get User progress
            progressEntry = (user.progress || []).find(p => p.courseId.toString() === courseId.toString());
            const userCompleted = (progressEntry?.completedLessons || []).map(l => (l.lessonId || l._id || l.lesson)?.toString());

            // Get Student progress (fallback for old courses)
            const studentEnrolledEntry = (StudentData?.enrolledCourses || []).find(e => (e.course || e.courseId)?.toString() === courseId.toString());
            const studentCompleted = (studentEnrolledEntry?.completedLessons || []).map(l => (l.lesson || l._id || l.lessonId)?.toString());

            // Merge unique completed lessons
            const uniqueCompletedSet = new Set([...userCompleted.filter(Boolean), ...studentCompleted.filter(Boolean)]);
            completedLessons = Array.from(uniqueCompletedSet);
            completedLessonsCount = completedLessons.length;
          }
        }
      } catch (error) {
        console.log('🔍 Token verification failed or error syncing progress');
      }
    }

    // Robustly calculate total lessons
    let totalLessonsCount = course.totalLessons || 0;
    if (totalLessonsCount === 0) {
      if (course.sections && course.sections.length > 0) {
        totalLessonsCount = course.sections.reduce((total, section) => 
          total + (section.lessons ? section.lessons.length : 0), 0);
      } else if (course.lessons && course.lessons.length > 0) {
        totalLessonsCount = course.lessons.length;
      }
    }

    if (isPurchased && totalLessonsCount > 0) {
      progressPercentage = Math.round((completedLessonsCount / totalLessonsCount) * 100);
    }

    // Final course object preparation
    courseObj.isPurchased = isPurchased;
    courseObj.progressPercentage = progressPercentage;
    courseObj.completedLessonsCount = completedLessonsCount;
    courseObj.totalLessonsCount = totalLessonsCount;
    courseObj.completedLessons = completedLessons;

    console.log('🔍 Public course fetched:', course.title, { isPurchased, progressPercentage });
    
    res.json({
      success: true,
      data: courseObj
    });

  } catch (error) {
    console.error('🔍 Error fetching public course:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;
