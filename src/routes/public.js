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
      .select('-sections -requirements -whatYouWillLearn -enrolledStudents -ratings')
      .sort(sort)
      .exec();

    console.log('🔍 Public Courses API - Found courses:', courses.length);
    console.log('🔍 Public Courses API - Course titles:', courses.map(c => c.title));

    // Check if user is authenticated and add purchase status
    let userPurchasedCourses = [];
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const user = await User.findById(decoded.id);
        if (user && user.enrolledCourses) {
          userPurchasedCourses = user.enrolledCourses.map(id => id.toString());
        }
      } catch (error) {
        console.log('🔍 Token verification failed, treating as unauthenticated user');
        // Continue without purchase status
      }
    }

    // Add isPurchased field to each course
    const coursesWithStatus = courses.map(course => {
      const courseObj = course.toObject();
      courseObj.isPurchased = userPurchasedCourses.includes(course._id.toString());
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
    console.log('🔍 Course found?', !!course);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is authenticated and has purchased this course
    let isPurchased = false;
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if user has purchased this course
        const user = await User.findById(decoded.id);
        if (user) {
          // Check if course is in user's enrolled courses
          isPurchased = user.enrolledCourses && user.enrolledCourses.some(
            enrolledCourse => enrolledCourse.toString() === courseId.toString()
          );
          
          // Alternative: Check orders if you have an Order model
          // const Order = require('../models/Order');
          // const purchase = await Order.findOne({
          //   user: decoded.id,
          //   course: courseId,
          //   paymentStatus: 'completed'
          // });
          // isPurchased = !!purchase;
        }
      } catch (error) {
        console.log('🔍 Token verification failed, treating as unauthenticated user');
        // Continue without purchase status
      }
    }

    // Convert course to plain object and add isPurchased field
    const courseObj = course.toObject();
    courseObj.isPurchased = isPurchased;

    console.log('🔍 Public course fetched:', course.title);
    console.log('🔍 Course ID:', course._id);
    console.log('🔍 Course instructor:', course.instructor?.username);
    console.log('🔍 Is user purchased:', isPurchased);

    res.status(200).json({
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
