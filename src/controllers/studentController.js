const User = require('../models/User');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Certificate = require('../models/Certificate');

// @desc    Get all students
// @route   GET /api/students
// @access  Private (Admin)
const getStudents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    console.log('=== GET STUDENTS START ===');
    console.log('Query params:', { page, limit, search, sortBy, sortOrder });

    // Build filter
    const filter = { role: 'student' };

    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } }
      ];
    }

    console.log('Filter:', JSON.stringify(filter, null, 2));

    // Sort options
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get students with pagination
    const total = await User.countDocuments(filter);
    console.log('Total students count:', total);
    
    const students = await User.find(filter)
      .select('-password')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    console.log('Students found:', students.length);

    // Get student details for each user
    const studentsWithDetails = await Promise.all(
      students.map(async (student) => {
        const studentDetails = await Student.findOne({ user: student._id })
          .populate({
            path: 'enrolledCourses.course',
            select: 'title thumbnail instructor totalEnrollments'
          });
        
        return {
          ...student.toObject(),
          studentDetails: studentDetails || {
            enrolledCourses: [],
            learningStats: {
              totalCoursesEnrolled: 0,
              totalCoursesCompleted: 0,
              totalLearningTime: 0,
              averageCompletionRate: 0
            },
            achievements: []
          }
        };
      })
    );

    console.log('Students with details:', studentsWithDetails.length);
    console.log('=== GET STUDENTS END ===');

    res.status(200).json({
      success: true,
      data: {
        students: studentsWithDetails,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching students'
    });
  }
};

// @desc    Get single student
// @route   GET /api/students/:id
// @access  Private (Admin)
const getStudent = async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: 'student' })
      .select('-password');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const studentDetails = await Student.findOne({ user: student._id })
      .populate({
        path: 'enrolledCourses.course',
        select: 'title thumbnail instructor totalEnrollments'
      });

    res.status(200).json({
      success: true,
      data: {
        student: {
          ...student.toObject(),
          studentDetails: studentDetails || {
            enrolledCourses: [],
            learningStats: {
              totalCoursesEnrolled: 0,
              totalCoursesCompleted: 0,
              totalLearningTime: 0,
              averageCompletionRate: 0
            },
            achievements: []
          }
        }
      }
    });
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching student'
    });
  }
};

// @desc    Update student status
// @route   PUT /api/students/:id/status
// @access  Private (Admin)
const updateStudentStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    
    const student = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Student status updated successfully'
    });
  } catch (error) {
    console.error('Update student status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating student status'
    });
  }
};

// @desc    Delete student
// @route   DELETE /api/students/:id
// @access  Private (Admin)
const deleteStudent = async (req, res) => {
  try {
    const student = await User.findByIdAndDelete(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Also delete student record
    await Student.findOneAndDelete({ user: req.params.id });

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting student'
    });
  }
};

// @desc    Get student progress
// @route   GET /api/students/:studentId/courses/:courseId/progress
// @access  Private (Admin and Student)
const getStudentProgress = async (req, res) => {
  try {
    const { studentId, courseId } = req.params;

    const student = await Student.findOne({ user: studentId })
      .populate({
        path: 'enrolledCourses.course',
        select: 'title thumbnail instructor totalEnrollments'
      });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const enrolledCourse = student.enrolledCourses.find(
      course => course.course && course.course._id.toString() === courseId
    );

    if (!enrolledCourse) {
      return res.status(404).json({
        success: false,
        message: 'Course not found in student enrollments'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        progress: enrolledCourse.progress || 0,
        completedLessons: enrolledCourse.completedLessons || [],
        lastAccessedAt: enrolledCourse.lastAccessedAt,
        certificate: enrolledCourse.certificate || { issued: false }
      }
    });
  } catch (error) {
    console.error('Get student progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching student progress'
    });
  }
};

// @desc    Update student progress
// @route   PUT /api/students/:studentId/courses/:courseId/progress
// @access  Private (Admin and Student)
const updateStudentProgress = async (req, res) => {
  try {
    const { studentId, courseId } = req.params;
    const { progress, lessonId } = req.body;

    const student = await Student.findOne({ user: studentId });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Find the enrolled course
    const enrolledCourseIndex = student.enrolledCourses.findIndex(
      course => course.course && course.course._id.toString() === courseId
    );

    if (enrolledCourseIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Course not found in student enrollments'
      });
    }

    const enrolledCourse = student.enrolledCourses[enrolledCourseIndex];

    // Update progress
    if (progress !== undefined) {
      enrolledCourse.progress = Math.min(100, Math.max(0, progress));
    }

    // Mark lesson as completed
    if (lessonId) {
      const isLessonCompleted = enrolledCourse.completedLessons.some(
        lesson => lesson.lesson && lesson.lesson.toString() === lessonId
      );

      if (!isLessonCompleted) {
        enrolledCourse.completedLessons.push({
          lesson: lessonId,
          completedAt: new Date()
        });
      }
    }

    // Update last accessed time
    enrolledCourse.lastAccessedAt = new Date();

    await student.save();

    res.status(200).json({
      success: true,
      message: 'Student progress updated successfully'
    });
  } catch (error) {
    console.error('Update student progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating student progress'
    });
  }
};

// @desc    Get student certificates
// @route   GET /api/students/:studentId/certificates
// @access  Private (Admin and Student)
const getStudentCertificates = async (req, res) => {
  try {
    const { studentId } = req.params;

    const certificates = await Certificate.find({ student: studentId })
      .populate({
        path: 'course',
        select: 'title duration instructorName grade score'
      });

    res.status(200).json({
      success: true,
      data: certificates
    });
  } catch (error) {
    console.error('Get student certificates error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching student certificates'
    });
  }
};

// @desc    Add student note
// @route   POST /api/students/:studentId/notes
// @access  Private (Admin and Student)
const addStudentNote = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { courseId, lessonId, content, timestamp } = req.body;

    const student = await Student.findOne({ user: studentId });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Find the enrolled course
    const enrolledCourseIndex = student.enrolledCourses.findIndex(
      course => course.course && course.course._id.toString() === courseId
    );

    if (enrolledCourseIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Course not found in student enrollments'
      });
    }

    const enrolledCourse = student.enrolledCourses[enrolledCourseIndex];

    // Add note
    enrolledCourse.notes.push({
      course: courseId,
      lesson: lessonId,
      content,
      timestamp: timestamp || 0,
      createdAt: new Date()
    });

    await student.save();

    res.status(200).json({
      success: true,
      message: 'Note added successfully'
    });
  } catch (error) {
    console.error('Add student note error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding student note'
    });
  }
};

// @desc    Update student profile image
// @route   POST /api/students/:id/profile-image
// @access  Private (Admin and Student)
const updateProfileImage = async (req, res) => {
  try {
    const studentId = req.params.id;
    
    console.log('=== PROFILE IMAGE UPLOAD START ===');
    console.log('Student ID:', studentId);
    console.log('Request file:', req.file);
    
    if (!req.file) {
      console.log('ERROR: No file provided');
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    console.log('File uploaded:', req.file);
    console.log('File path:', req.file.path);
    console.log('File filename:', req.file.filename);
    console.log('File destination:', req.file.destination);

    // Check if file actually exists
    const fs = require('fs');
    if (!fs.existsSync(req.file.path)) {
      console.log('ERROR: File does not exist at path:', req.file.path);
      return res.status(500).json({
        success: false,
        message: 'File was not saved properly'
      });
    }

    console.log('File exists at:', req.file.path);

    // Find the user
    const user = await User.findById(studentId);
    
    if (!user) {
      console.log('ERROR: Student not found');
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    console.log('Student found:', user.username);

    // Update profile image with full path
    const imagePath = `/uploads/avatars/${req.file.filename}`;
    user.profile.profileImage = imagePath;
    await user.save();

    console.log('Profile image updated in database:', imagePath);
    console.log('Full file path:', req.file.path);
    console.log('=== PROFILE IMAGE UPLOAD END ===');

    res.status(200).json({
      success: true,
      message: 'Profile image updated successfully',
      data: {
        profileImage: imagePath,
        fullPath: req.file.path
      }
    });
  } catch (error) {
    console.error('Update profile image error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile image'
    });
  }
};

module.exports = {
  getStudents,
  getStudent,
  updateStudentStatus,
  deleteStudent,
  getStudentProgress,
  updateStudentProgress,
  getStudentCertificates,
  addStudentNote,
  updateProfileImage
};
