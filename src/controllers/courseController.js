const Course = require('../models/Course');
const { deleteFile } = require('../middleware/upload');

// @desc    Create or update course draft (wizard)
// @route   POST /api/courses/wizard/draft
// @access  Private (Admin/Instructor)
const saveCourseDraft = async (req, res) => {
  try {
    const courseData = {
      ...req.body,
      instructor: req.user.id,
      status: 'draft',
      // Ensure price and duration are numbers
      price: parseFloat(req.body.price) || 0,
      duration: parseInt(req.body.duration) || 1
    };

    let course;
    if (req.body.courseId) {
      // Update existing draft
      course = await Course.findByIdAndUpdate(
        req.body.courseId,
        courseData,
        { new: true, runValidators: true }
      );
    } else {
      // Create new draft
      course = await Course.create(courseData);
    }

    await course.populate('instructor', 'username profile.firstName profile.lastName');

    res.status(201).json({
      success: true,
      message: 'Course draft saved successfully',
      data: course
    });
  } catch (error) {
    console.error('Save course draft error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while saving course draft',
      error: error.message
    });
  }
};

// @desc    Update course draft by ID
// @route   PUT /api/courses/wizard/draft/:id
// @access  Private (Admin/Instructor)
const updateCourseDraft = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Invalid course ID'
      });
    }

    const courseData = {
      ...req.body,
      // Ensure price and duration are numbers
      price: parseFloat(req.body.price) || 0,
      duration: parseInt(req.body.duration) || 1
    };

    const course = await Course.findByIdAndUpdate(
      id,
      courseData,
      { new: true, runValidators: true }
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course draft not found'
      });
    }

    await course.populate('instructor', 'username profile.firstName profile.lastName');

    res.status(200).json({
      success: true,
      message: 'Course draft updated successfully',
      data: course
    });
  } catch (error) {
    console.error('Update course draft error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating course draft',
      error: error.message
    });
  }
};

// @desc    Get course draft by ID
// @route   GET /api/courses/wizard/draft/:id
// @access  Private (Admin/Instructor)
const getCourseDraft = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Invalid course ID'
      });
    }

    const course = await Course.findById(id)
      .populate('instructor', 'username profile.firstName profile.lastName')
      .lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course draft not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Course draft retrieved successfully',
      data: course
    });
  } catch (error) {
    console.error('Get course draft error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving course draft',
      error: error.message
    });
  }
};

// @desc    Save course content (sections and lessons)
// @route   PUT /api/courses/wizard/content/:id
// @access  Private (Admin/Instructor)
const saveCourseContent = async (req, res) => {
  try {
    const { sections, lessons } = req.body;
    
    // Support both old lessons and new sections structure
    const updateData = sections ? { sections } : { lessons };
    
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Course content saved successfully',
      data: course
    });
  } catch (error) {
    console.error('Save course content error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while saving course content',
      error: error.message
    });
  }
};

// @desc    Save course pricing
// @route   PUT /api/courses/wizard/pricing/:id
// @access  Private (Admin/Instructor)
const saveCoursePricing = async (req, res) => {
  try {
    const pricingData = {
      price: parseFloat(req.body.price) || 0,
      discountedPrice: req.body.discountedPrice ? parseFloat(req.body.discountedPrice) : undefined
    };
    
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      pricingData,
      { new: true, runValidators: true }
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Course pricing saved successfully',
      data: course
    });
  } catch (error) {
    console.error('Save course pricing error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while saving course pricing',
      error: error.message
    });
  }
};

// @desc    Save course media
// @route   PUT /api/courses/wizard/media/:id
// @access  Private (Admin/Instructor)
const saveCourseMedia = async (req, res) => {
  try {
    const mediaData = {
      courseImage: req.body.courseImage || '',
      thumbnail: req.body.thumbnail || '',
      previewVideo: req.body.previewVideo || '',
      resources: req.body.resources || []
    };
    
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      mediaData,
      { new: true, runValidators: true }
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Course media saved successfully',
      data: course
    });
  } catch (error) {
    console.error('Save course media error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while saving course media',
      error: error.message
    });
  }
};

// @desc    Publish course
// @route   POST /api/courses/wizard/publish/:id
// @access  Private (Admin/Instructor)
const publishCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { status: 'published' },
      { new: true, runValidators: true }
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Course published successfully',
      data: course
    });
  } catch (error) {
    console.error('Publish course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while publishing course',
      error: error.message
    });
  }
};

// @desc    Validate course before publishing
// @route   GET /api/courses/wizard/validate/:id
// @access  Private (Admin/Instructor)
const validateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const validationErrors = [];

    // Check required fields
    if (!course.title || course.title.trim() === '') {
      validationErrors.push('Course title is required');
    }
    if (!course.description || course.description.trim() === '') {
      validationErrors.push('Course description is required');
    }
    if (!course.category) {
      validationErrors.push('Course category is required');
    }
    
    // Check for lessons in sections structure
    const hasLessons = course.sections && course.sections.length > 0 && 
      course.sections.some(section => section.lessons && section.lessons.length > 0);
    
    if (!hasLessons) {
      validationErrors.push('At least one lesson is required');
    }
    
    if (course.price < 0) {
      validationErrors.push('Price cannot be negative');
    }

    res.status(200).json({
      success: validationErrors.length === 0,
      message: validationErrors.length === 0 ? 'Course is valid for publishing' : 'Course has validation errors',
      validationErrors,
      data: course
    });
  } catch (error) {
    console.error('Validate course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while validating course',
      error: error.message
    });
  }
};

// @desc    Create new course
// @route   POST /api/courses
// @access  Private (Admin/Instructor)
const createCourse = async (req, res) => {
  try {
    const courseData = {
      ...req.body,
      instructor: req.user.id,
      // Ensure price and duration are numbers
      price: parseFloat(req.body.price) || 0,
      duration: parseInt(req.body.duration) || 1,
      // Set isPublished based on status
      isPublished: req.body.status === 'published'
    };

    const course = await Course.create(courseData);

    await course.populate('instructor', 'username profile.firstName profile.lastName');

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: { course }
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating course',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get all courses
// @route   GET /api/courses
// @access  Private
const getCourses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      level,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    
    if (category) filter.category = category;
    if (level) filter.level = level;
    if (status) filter.status = status;
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // If user is not admin, only show their courses or published courses
    if (req.user.role !== 'admin') {
      const accessFilter = {
        $or: [
          { instructor: req.user.id },
          { status: 'published' }
        ]
      };

      // If we already have a filter (like search), combine them with $and
      if (Object.keys(filter).length > 0) {
        const existingFilter = { ...filter };
        // Clear old filter keys and wrap in $and
        Object.keys(existingFilter).forEach(key => delete filter[key]);
        filter.$and = [existingFilter, accessFilter];
      } else {
        filter.$or = accessFilter.$or;
      }
    }

    // Sort options
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // 🚀 Concurrent fetching of courses and total count
    const [courses, total] = await Promise.all([
      Course.find(filter)
        .populate('instructor', 'username profile.firstName profile.lastName')
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select('-sections -lessons')
        .lean(),
      Course.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: {
        courses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching courses'
    });
  }
};

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Private
const getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'username profile.firstName profile.lastName email')
      .populate('enrolledStudents', 'username profile.firstName profile.lastName email')
      .lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check access permissions
    if (req.user.role !== 'admin' && 
        course.instructor._id.toString() !== req.user.id && 
        course.status !== 'published') {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this course'
      });
    }

    res.status(200).json({
      success: true,
      data: { course }
    });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching course'
    });
  }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private (Admin/Instructor)
const updateCourse = async (req, res) => {
  try {
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
        message: 'Access denied. You can only update your own courses.'
      });
    }

    // Update course
    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('instructor', 'username profile.firstName profile.lastName');

    res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      data: { course: updatedCourse }
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating course'
    });
  }
};

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private (Admin/Instructor)
const deleteCourse = async (req, res) => {
  try {
    console.log('DELETE request for course ID:', req.params.id);
    console.log('User making request:', req.user.id, req.user.role);
    
    const course = await Course.findById(req.params.id);
    console.log('Found course:', course);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && course.instructor.toString() !== req.user.id) {
      console.log('Permission denied - course.instructor:', course.instructor, 'req.user.id:', req.user.id);
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete your own courses.'
      });
    }

    console.log('Permission granted, proceeding with deletion');

    // Check course count before deletion
    const courseCountBefore = await Course.countDocuments();
    console.log('Course count before deletion:', courseCountBefore);

    // Delete associated files
    if (course.thumbnail) {
      deleteFile(course.thumbnail);
    }

    // Handle lessons from sections structure
    if (course.sections && course.sections.length > 0) {
      course.sections.forEach(section => {
        if (section.lessons && section.lessons.length > 0) {
          section.lessons.forEach(lesson => {
            if (lesson.videoUrl) {
              deleteFile(lesson.videoUrl);
            }
          });
        }
      });
    } else if (course.lessons && course.lessons.length > 0) {
      // Handle old lessons structure for backward compatibility
      course.lessons.forEach(lesson => {
        if (lesson.videoUrl) {
          deleteFile(lesson.videoUrl);
        }
      });
    }

    const deletedCourse = await Course.findByIdAndDelete(req.params.id);
    console.log('Deleted course object:', deletedCourse);

    // Check course count after deletion
    const courseCountAfter = await Course.countDocuments();
    console.log('Course count after deletion:', courseCountAfter);
    console.log('Course deletion verification:', courseCountAfter === courseCountBefore - 1 ? 'SUCCESS' : 'FAILED');

    res.status(200).json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting course'
    });
  }
};

// @desc    Add section to course
// @route   POST /api/courses/:id/sections
// @access  Private (Admin/Instructor)
const addSection = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (req.user.role !== 'admin' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only add sections to your own courses.'
      });
    }

    const { title, description } = req.body;

    const section = {
      title,
      description,
      order: course.sections.length,
      lessons: []
    };

    course.sections.push(section);
    await course.save();

    res.status(201).json({
      success: true,
      message: 'Section added successfully',
      data: { section: course.sections[course.sections.length - 1] }
    });
  } catch (error) {
    console.error('Add section error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding section'
    });
  }
};

// @desc    Add lesson to section
// @route   POST /api/courses/:id/sections/:sectionId/lessons
// @access  Private (Admin/Instructor)
const addLessonToSection = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (req.user.role !== 'admin' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only add lessons to your own courses.'
      });
    }

    const section = course.sections.id(req.params.sectionId);
    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }

    const { title, description, videoUrl, duration, isPreview } = req.body;

    const lesson = {
      title,
      description,
      videoUrl,
      duration,
      order: section.lessons.length,
      isPreview: isPreview === 'true' || isPreview === true || isPreview === 'on' || isPreview === 1,
      quizzes: []
    };

    section.lessons.push(lesson);
    await course.save();

    res.status(201).json({
      success: true,
      message: 'Lesson added to section successfully',
      data: { lesson: section.lessons[section.lessons.length - 1] }
    });
  } catch (error) {
    console.error('Add lesson to section error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding lesson to section'
    });
  }
};

// @desc    Add quiz to lesson
// @route   POST /api/courses/:id/sections/:sectionId/lessons/:lessonId/quiz
// @access  Private (Admin/Instructor)
const addQuizToLesson = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (req.user.role !== 'admin' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only add quizzes to your own courses.'
      });
    }

    const section = course.sections.id(req.params.sectionId);
    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }

    const lesson = section.lessons.id(req.params.lessonId);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    const { question, options, correctAnswer } = req.body;

    // Validate quiz data
    if (!question || !options || !Array.isArray(options) || correctAnswer === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Invalid quiz data. All fields are required.'
      });
    }

    if (options.length < 2 || options.length > 6) {
      return res.status(400).json({
        success: false,
        message: 'Quiz must have between 2 and 6 options'
      });
    }

    if (correctAnswer < 0 || correctAnswer >= options.length) {
      return res.status(400).json({
        success: false,
        message: 'Correct answer must be a valid option index'
      });
    }

    const quiz = {
      question,
      options,
      correctAnswer
    };

    lesson.quizzes.push(quiz);
    await course.save();

    res.status(201).json({
      success: true,
      message: 'Quiz added to lesson successfully',
      data: { quiz: lesson.quizzes[lesson.quizzes.length - 1] }
    });
  } catch (error) {
    console.error('Add quiz to lesson error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding quiz to lesson'
    });
  }
};

// @desc    Update section
// @route   PUT /api/courses/:id/sections/:sectionId
// @access  Private (Admin/Instructor)
const updateSection = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    if (req.user.role !== 'admin' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const section = course.sections.id(req.params.sectionId);
    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });

    Object.assign(section, req.body);
    await course.save();

    res.status(200).json({ success: true, message: 'Section updated', data: { section } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete section
// @route   DELETE /api/courses/:id/sections/:sectionId
// @access  Private (Admin/Instructor)
const deleteSection = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    if (req.user.role !== 'admin' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    course.sections.pull(req.params.sectionId);
    await course.save();

    res.status(200).json({ success: true, message: 'Section deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update lesson in section
// @route   PUT /api/courses/:id/sections/:sectionId/lessons/:lessonId
// @access  Private (Admin/Instructor)
const updateLessonInSection = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    if (req.user.role !== 'admin' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const section = course.sections.id(req.params.sectionId);
    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });

    const lesson = section.lessons.id(req.params.lessonId);
    if (!lesson) return res.status(404).json({ success: false, message: 'Lesson not found' });

    Object.assign(lesson, req.body);
    await course.save();

    res.status(200).json({ success: true, message: 'Lesson updated', data: { lesson } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete lesson from section
// @route   DELETE /api/courses/:id/sections/:sectionId/lessons/:lessonId
// @access  Private (Admin/Instructor)
const deleteLessonFromSection = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    if (req.user.role !== 'admin' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const section = course.sections.id(req.params.sectionId);
    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });

    section.lessons.pull(req.params.lessonId);
    await course.save();

    res.status(200).json({ success: true, message: 'Lesson deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update quiz
// @route   PUT /api/courses/:id/sections/:sectionId/lessons/:lessonId/quiz/:quizId
// @access  Private (Admin/Instructor)
const updateQuiz = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    if (req.user.role !== 'admin' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const section = course.sections.id(req.params.sectionId);
    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });

    const lesson = section.lessons.id(req.params.lessonId);
    if (!lesson) return res.status(404).json({ success: false, message: 'Lesson not found' });

    const quiz = lesson.quizzes.id(req.params.quizId);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });

    Object.assign(quiz, req.body);
    await course.save();

    res.status(200).json({ success: true, message: 'Quiz updated', data: { quiz } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete quiz
// @route   DELETE /api/courses/:id/sections/:sectionId/lessons/:lessonId/quiz/:quizId
// @access  Private (Admin/Instructor)
const deleteQuiz = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    if (req.user.role !== 'admin' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const section = course.sections.id(req.params.sectionId);
    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });

    const lesson = section.lessons.id(req.params.lessonId);
    if (!lesson) return res.status(404).json({ success: false, message: 'Lesson not found' });

    lesson.quizzes.pull(req.params.quizId);
    await course.save();

    res.status(200).json({ success: true, message: 'Quiz deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get lesson with quizzes
// @route   GET /api/courses/:id/sections/:sectionId/lessons/:lessonId
// @access  Private
const getLesson = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const section = course.sections.id(req.params.sectionId);
    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }

    const lesson = section.lessons.id(req.params.lessonId);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { lesson }
    });
  } catch (error) {
    console.error('Get lesson error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching lesson'
    });
  }
};

// @desc    Add lesson to course (legacy - for backward compatibility)
// @route   POST /api/courses/:id/lessons
// @access  Private (Admin/Instructor)
const addLesson = async (req, res) => {
  try {
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
        message: 'Access denied. You can only add lessons to your own courses.'
      });
    }

    const { title, description, videoUrl, duration, order, isPreview } = req.body;

    const lesson = {
      title,
      description,
      videoUrl,
      duration,
      order: order || course.lessons.length + 1,
      isPreview: isPreview || false
    };

    course.lessons.push(lesson);
    await course.save();

    // Update course duration
    course.duration = course.lessons.reduce((total, lesson) => total + (lesson.duration || 0), 0);
    await course.save();

    res.status(201).json({
      success: true,
      message: 'Lesson added successfully',
      data: { lesson: course.lessons[course.lessons.length - 1] }
    });
  } catch (error) {
    console.error('Add lesson error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding lesson'
    });
  }
};

// @desc    Update lesson
// @route   PUT /api/courses/:id/lessons/:lessonId
// @access  Private (Admin/Instructor)
const updateLesson = async (req, res) => {
  try {
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
        message: 'Access denied. You can only update lessons in your own courses.'
      });
    }

    const lesson = course.lessons.id(req.params.lessonId);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // Update lesson
    Object.assign(lesson, req.body);
    await course.save();

    res.status(200).json({
      success: true,
      message: 'Lesson updated successfully',
      data: { lesson }
    });
  } catch (error) {
    console.error('Update lesson error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating lesson'
    });
  }
};

// @desc    Delete lesson
// @route   DELETE /api/courses/:id/lessons/:lessonId
// @access  Private (Admin/Instructor)
const deleteLesson = async (req, res) => {
  try {
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
        message: 'Access denied. You can only delete lessons from your own courses.'
      });
    }

    const lesson = course.lessons.id(req.params.lessonId);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // Delete lesson video if exists
    if (lesson.videoUrl) {
      deleteFile(lesson.videoUrl);
    }

    course.lessons.pull(req.params.lessonId);
    await course.save();

    res.status(200).json({
      success: true,
      message: 'Lesson deleted successfully'
    });
  } catch (error) {
    console.error('Delete lesson error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting lesson'
    });
  }
};

// @desc    Enroll student in course
// @route   POST /api/courses/:id/enroll
// @access  Private
const enrollCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (course.status !== 'published') {
      return res.status(400).json({
        success: false,
        message: 'Course is not available for enrollment'
      });
    }

    // Check if already enrolled
    const isEnrolled = course.enrolledStudents.includes(req.user.id);

    if (isEnrolled) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in this course'
      });
    }

    // Enroll student
    course.enrolledStudents.push(req.user.id);
    course.updateTotalEnrollments();
    await course.save();

    res.status(200).json({
      success: true,
      message: 'Enrolled successfully',
      data: { course }
    });
  } catch (error) {
    console.error('Enroll course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while enrolling in course'
    });
  }
};

// @desc    Upload course video (generic endpoint)
// @route   POST /api/courses/upload-video
// @access  Private (Admin/Instructor)
const uploadCourseVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No video file uploaded'
      });
    }

    // Return the generated file path to the client.
    // The client should keep this and attach it to the `videoUrl` field when creating/updating the lesson.
    res.status(200).json({
      success: true,
      message: 'Video uploaded successfully',
      data: {
        videoUrl: '/uploads/videos/' + req.file.filename // req.file.path or filename depending on OS separator; using filename for safer portable front-end path.
      }
    });
  } catch (error) {
    console.error('Upload video error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading video',
      error: error.message
    });
  }
};

// @desc    Get all course titles and IDs (for dropdowns)
// @route   GET /api/courses/list
// @access  Private
const getCourseList = async (req, res) => {
  try {
    const courses = await Course.find({})
      .select('title')
      .sort({ title: 1 });

    res.status(200).json({
      success: true,
      data: courses
    });
  } catch (error) {
    console.error('Get course list error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching course list'
    });
  }
};

module.exports = {
  createCourse,
  getCourses,
  getCourse,
  updateCourse,
  deleteCourse,
  addLesson,
  updateLesson,
  deleteLesson,
  enrollCourse,
  // New sections and quizzes functions
  addSection,
  addLessonToSection,
  addQuizToLesson,
  getLesson,
  updateSection,
  deleteSection,
  updateLessonInSection,
  deleteLessonFromSection,
  updateQuiz,
  deleteQuiz,
  // Wizard functions
  saveCourseDraft,
  updateCourseDraft,
  getCourseDraft,
  saveCourseContent,
  saveCoursePricing,
  saveCourseMedia,
  publishCourse,
  validateCourse,
  uploadCourseVideo,
  getCourseList
};
