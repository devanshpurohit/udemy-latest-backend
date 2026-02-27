const express = require('express');
const Course = require('../models/Course');

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

    // Sort options
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const courses = await Course.find(filter)
      .populate('instructor', 'username profile.firstName profile.lastName')
      .select('-lessons -requirements -whatYouWillLearn -enrolledStudents -ratings')
      .sort(sort)
      .exec();

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
    const course = await Course.findOne({
      _id: req.params.id,
      isPublished: true,
      status: 'published'
    })
    .populate('instructor', 'username profile.firstName profile.lastName profile.profileImage')
    .select('-enrolledStudents -ratings');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.status(200).json({
      success: true,
      data: course
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;
