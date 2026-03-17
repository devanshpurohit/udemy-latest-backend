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
      course,
      progress,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    console.log('=== GET STUDENTS START ===');
    console.log('Query params:', { page, limit, search, course, progress, sortBy, sortOrder });

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

    // Filter by course
    if (course && course !== 'All') {
      const studentMatches = await Student.find({ 'enrolledCourses.course': course }).distinct('user');
      filter._id = { $in: studentMatches };
    }

    // Filter by progress
    if (progress && progress !== 'All') {
      const [min, max] = progress.split('-').map(Number);
      
      // We need to find students whose average progress is within range
      // This is complex with find(), so let's find all students and filter IDs
      // A more performant way would be aggregation, but for now:
      const allStudents = await Student.find({});
      const matchingUserIds = allStudents.filter(s => {
        if (!s.enrolledCourses || s.enrolledCourses.length === 0) return false;
        const avg = s.enrolledCourses.reduce((acc, curr) => acc + (curr.progress || 0), 0) / s.enrolledCourses.length;
        return avg >= min && avg <= max;
      }).map(s => s.user);

      if (filter._id) {
        // Intersect with existing course filter
        const existingIds = filter._id.$in.map(id => id.toString());
        const newIds = matchingUserIds.map(id => id.toString());
        const intersection = existingIds.filter(id => newIds.includes(id));
        filter._id = { $in: intersection };
      } else {
        filter._id = { $in: matchingUserIds };
      }
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
        select: 'title thumbnail instructor totalEnrollments sections',
        populate: {
          path: 'sections.lessons',
          select: 'title type duration'
        }
      });

    // Fetch AI Card used by this student
    const AICard = require('../models/AICard');
    const aiCard = await AICard.findOne({ usedBy: student._id });

    // Calculate Quiz Stats from user.progress
    let totalAttempts = 0;
    let totalScore = 0;
    let passedQuizzes = 0;
    let failedQuizzes = 0;
    let totalQuizzes = 0;

    if (student.progress && Array.isArray(student.progress)) {
        student.progress.forEach(p => {
            if (p.quizScores && Array.isArray(p.quizScores)) {
                p.quizScores.forEach(q => {
                    totalAttempts++;
                    totalScore += q.score;
                    if (q.score >= 70) passedQuizzes++;
                    else failedQuizzes++;
                    totalQuizzes++;
                });
            }
        });
    }

    const quizStats = {
        totalAttempts,
        averageScore: totalQuizzes > 0 ? Math.round(totalScore / totalQuizzes) : 0,
        passedQuizzes,
        failedQuizzes
    };

    res.status(200).json({
      success: true,
      data: {
        student: {
          ...student.toObject(),
          aiCard: aiCard || null,
          studentDetails: studentDetails ? {
            ...studentDetails.toObject(),
            quizStats
          } : {
            enrolledCourses: [],
            learningStats: {
              totalCoursesEnrolled: 0,
              totalCoursesCompleted: 0,
              totalLearningTime: 0,
              averageCompletionRate: 0
            },
            quizStats,
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

        // 🚀 Auto-calculate progress percentage
        try {
            const Course = require('../models/Course');
            const course = await Course.findById(courseId);
            if (course) {
                const totalLessons = course.sections.reduce((total, section) => total + section.lessons.length, 0);
                if (totalLessons > 0) {
                    enrolledCourse.progress = Math.round((enrolledCourse.completedLessons.length / totalLessons) * 100);
                    console.log(`Calculated progress for student ${studentId} in course ${courseId}: ${enrolledCourse.progress}%`);
                }
            }
        } catch (courseError) {
            console.error('Error calculating progress percentage:', courseError);
        }
      }
    }

    // Update statistics
    student.updateLearningStats();

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

// @desc    Submit quiz score
// @route   POST /api/users/quiz-score
// @access  Private
const submitQuizScore = async (req, res) => {
  try {
    const { courseId, lessonId, score } = req.body;
    const userId = req.user._id;

    console.log(`🔍 Received quiz score submission: User=${userId}, Course=${courseId}, Lesson=${lessonId}, Score=${score}`);

    if (!courseId || !lessonId || score === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ User not found for quiz submission');
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Find progress for this course
    let progressEntry = user.progress.find(p => p.courseId.toString() === courseId);
    
    if (!progressEntry) {
      console.log('📝 Creating new progress entry for course:', courseId);
      user.progress.push({
        courseId,
        completedLessons: [],
        quizScores: []
      });
      progressEntry = user.progress[user.progress.length - 1];
    }

    // Add quiz score
    console.log('📝 Adding quiz score to progress entry');
    progressEntry.quizScores.push({
      lessonId,
      score,
      attemptedAt: new Date()
    });

    user.markModified('progress');
    await user.save();
    
    console.log('✅ Quiz score saved successfully');

    res.status(200).json({
      success: true,
      message: 'Quiz score submitted successfully'
    });
  } catch (error) {
    console.error('❌ Submit quiz score error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while submitting quiz score',
      error: error.message
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
  updateProfileImage,
  submitQuizScore
};
