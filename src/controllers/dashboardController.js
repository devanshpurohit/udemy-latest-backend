const Course = require('../models/Course');
const User = require('../models/User');
const Student = require('../models/Student');
const Certificate = require('../models/Certificate');

// @desc    Get dashboard stats
// @route   GET /api/dashboard/stats
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let stats = {};

    if (userRole === 'admin') {
      // Admin stats - get all data
      const [
        totalCourses,
        publishedCourses,
        totalStudents,
        totalInstructors,
        totalRevenue,
        recentCourses,
        recentStudents,
        monthlyRevenue
      ] = await Promise.all([
        Course.countDocuments(),
        Course.countDocuments({ status: 'published' }),
        User.countDocuments({ role: 'student' }),
        User.countDocuments({ role: 'instructor' }),
        Course.aggregate([
          { $match: { status: 'published' } },
          { $group: { _id: null, total: { $sum: '$totalRevenue' } } }
        ]),
        Course.find({ status: 'published' })
          .populate('instructor', 'username profile.firstName profile.lastName')
          .sort({ createdAt: -1 })
          .limit(5),
        User.find({ role: 'student' })
          .sort({ createdAt: -1 })
          .limit(5),
        getMonthlyRevenue()
      ]);

      stats = {
        totalCourses,
        publishedCourses,
        totalStudents,
        totalInstructors,
        totalRevenue: totalRevenue[0]?.total || 0,
        recentCourses,
        recentStudents,
        monthlyRevenue
      };
    } else if (userRole === 'instructor') {
      // Instructor stats - get their data only
      const [
        instructorCourses,
        publishedCourses,
        totalEnrollments,
        totalRevenue,
        recentCourses,
        topCourses
      ] = await Promise.all([
        Course.countDocuments({ instructor: userId }),
        Course.countDocuments({ instructor: userId, status: 'published' }),
        Course.aggregate([
          { $match: { instructor: userId, status: 'published' } },
          { $group: { _id: null, total: { $sum: '$totalEnrollments' } } }
        ]),
        Course.aggregate([
          { $match: { instructor: userId, status: 'published' } },
          { $group: { _id: null, total: { $sum: '$totalRevenue' } } }
        ]),
        Course.find({ instructor: userId })
          .sort({ createdAt: -1 })
          .limit(5),
        Course.find({ instructor: userId, status: 'published' })
          .sort({ totalEnrollments: -1 })
          .limit(5)
      ]);

      stats = {
        totalCourses: instructorCourses,
        publishedCourses,
        totalEnrollments: totalEnrollments[0]?.total || 0,
        totalRevenue: totalRevenue[0]?.total || 0,
        recentCourses,
        topCourses
      };
    } else {
      // Student stats - get their learning data
      const student = await Student.findOne({ user: userId })
        .populate({
          path: 'enrolledCourses.course',
          populate: {
            path: 'instructor',
            select: 'username profile.firstName profile.lastName'
          }
        });

      if (student) {
        stats = {
          totalCoursesEnrolled: student.learningStats.totalCoursesEnrolled,
          totalCoursesCompleted: student.learningStats.totalCoursesCompleted,
          totalLearningTime: student.learningStats.totalLearningTime,
          averageCompletionRate: student.learningStats.averageCompletionRate,
          enrolledCourses: student.enrolledCourses.slice(0, 5),
          achievements: student.achievements
        };
      } else {
        stats = {
          totalCoursesEnrolled: 0,
          totalCoursesCompleted: 0,
          totalLearningTime: 0,
          averageCompletionRate: 0,
          enrolledCourses: [],
          achievements: []
        };
      }
    }

    res.status(200).json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard stats'
    });
  }
};

// @desc    Get monthly revenue data
// @route   GET /api/dashboard/revenue
// @access  Private (Admin)
const getRevenueData = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { period = 'monthly' } = req.query;

    let groupBy;
    switch (period) {
      case 'daily':
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
        break;
      case 'weekly':
        groupBy = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' }
        };
        break;
      case 'monthly':
      default:
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        };
        break;
    }

    const revenueData = await Course.aggregate([
      { $match: { status: 'published' } },
      {
        $group: {
          _id: groupBy,
          revenue: { $sum: '$totalRevenue' },
          enrollments: { $sum: '$totalEnrollments' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: { revenueData }
    });
  } catch (error) {
    console.error('Get revenue data error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching revenue data'
    });
  }
};

// @desc    Get course performance data
// @route   GET /api/dashboard/course-performance
// @access  Private
const getCoursePerformance = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let matchQuery = { status: 'published' };
    
    if (userRole === 'instructor') {
      matchQuery.instructor = userId;
    }

    const coursePerformance = await Course.aggregate([
      { $match: matchQuery },
      {
        $project: {
          title: 1,
          totalEnrollments: 1,
          totalRevenue: 1,
          averageRating: 1,
          enrolledStudents: { $size: '$enrolledStudents' },
          lessonsCount: { $size: '$lessons' }
        }
      },
      { $sort: { totalEnrollments: -1 } },
      { $limit: 10 }
    ]);

    res.status(200).json({
      success: true,
      data: { coursePerformance }
    });
  } catch (error) {
    console.error('Get course performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching course performance'
    });
  }
};

// @desc    Get enrollment trends
// @route   GET /api/dashboard/enrollment-trends
// @access  Private (Admin)
const getEnrollmentTrends = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { period = 'monthly' } = req.query;

    let groupBy;
    switch (period) {
      case 'daily':
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
        break;
      case 'weekly':
        groupBy = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' }
        };
        break;
      case 'monthly':
      default:
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        };
        break;
    }

    const enrollmentTrends = await User.aggregate([
      { $match: { role: 'student' } },
      {
        $group: {
          _id: groupBy,
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: { enrollmentTrends }
    });
  } catch (error) {
    console.error('Get enrollment trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching enrollment trends'
    });
  }
};

// Helper function to get monthly revenue
const getMonthlyRevenue = async () => {
  const currentYear = new Date().getFullYear();
  
  return await Course.aggregate([
    { $match: { status: 'published' } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        revenue: { $sum: '$totalRevenue' }
      }
    },
    { $match: { '_id.year': currentYear } },
    { $sort: { '_id.month': 1 } }
  ]);
};

module.exports = {
  getDashboardStats,
  getRevenueData,
  getCoursePerformance,
  getEnrollmentTrends
};
