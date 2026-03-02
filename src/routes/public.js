const express = require('express');
const Course = require('../models/Course');
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
      .select('-lessons -requirements -whatYouWillLearn -enrolledStudents -ratings')
      .sort(sort)
      .exec();

    console.log('🔍 Public Courses API - Found courses:', courses.length);
    console.log('🔍 Public Courses API - Course titles:', courses.map(c => c.title));

    res.status(200).json({
      success: true,
      data: courses
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

    console.log('🔍 Public course fetched:', course.title);
    console.log('🔍 Course ID:', course._id);
    console.log('🔍 Course instructor:', course.instructor?.username);

    res.status(200).json({
      success: true,
      data: course
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
