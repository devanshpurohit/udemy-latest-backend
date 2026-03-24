const User = require('../models/User');
const Course = require('../models/Course');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').lean();
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { name, email, phone, countryCode, language, profile } = req.body;

    if (name) user.username = name; // Mapping name to username or creating a separate name field if needed, but username is required
    if (email) user.email = email;
    
    // Ensure profile exists
    if (!user.profile) user.profile = {};
    
    if (phone) user.profile.phone = phone;
    // We'll keep countryCode and language as root fields for now if they are used elsewhere, 
    // but since they aren't in the schema, we should ideally add them or put them in profile.
    // Given the schema doesn't have them, let's put them in profile for better organization.
    if (countryCode) user.profile.countryCode = countryCode;
    if (language) user.profile.language = language;

    // ⭐ profile image update
    if (profile?.profileImage) {
      if (!user.profile) {
        user.profile = {};
      }

      user.profile.profileImage = profile.profileImage;
    }

    // ⭐ billing information update
    if (req.body.billing) {
      if (!user.billing) {
        user.billing = {};
      }
      
      const { fullName, email: billingEmail, country, address, city, state, zipCode } = req.body.billing;
      
      if (fullName !== undefined) user.billing.fullName = fullName;
      if (billingEmail !== undefined) user.billing.email = billingEmail;
      if (country !== undefined) user.billing.country = country;
      if (address !== undefined) user.billing.address = address;
      if (city !== undefined) user.billing.city = city;
      if (state !== undefined) user.billing.state = state;
      if (zipCode !== undefined) user.billing.zipCode = zipCode;
    }

    const updatedUser = await user.save();

    res.json(updatedUser);

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user dashboard
// @route   GET /api/users/dashboard
// @access  Private
const getDashboard = async (req, res) => {
  try {
    console.log("🔍 Dashboard request - Authorization header:", req.headers.authorization);
    console.log("🔍 Dashboard request - User from middleware:", req.user);
    
    const user = req.user;
    
    if (!user) {
      console.log("❌ Dashboard: No user found in request");
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    console.log("🔍 Dashboard: User authenticated:", {
      id: user._id,
      username: user.username,
      role: user.role,
      profileImage: user.profile?.profileImage
    });

    // Optimization: Only select necessary fields for dashboard courses to avoid massive response size (20MB issue)
    // Only select essential fields to avoid response bloat (15MB issue)
    const courseSelectFields = 'title thumbnail price discountedPrice instructor duration level category totalLessons totalSections sections';
    
    const userWithEnrolledCourses = await User.findById(user._id)
      .populate({
        path: 'enrolledCourses',
        select: courseSelectFields,
        populate: [
          {
            path: 'instructor',
            select: 'username profile.profileImage'
          },
          {
            path: 'sections.lessons',
            select: '_id' // Only fetch IDs to keep it light
          }
        ]
      })
      .populate({
        path: 'wishlist',
        select: 'title thumbnail price discountedPrice instructor',
        populate: {
          path: 'instructor',
          select: 'username'
        }
      })
      .populate({
        path: 'cart',
        select: 'title thumbnail price discountedPrice instructor',
        populate: {
          path: 'instructor',
          select: 'username'
        }
      })
      .select('username email role profile progress enrolledCourses purchasedCourses wishlist cart')
      .lean();

    if (!userWithEnrolledCourses) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log("🔍 Dashboard: User with populated data:", {
      id: userWithEnrolledCourses._id,
      username: userWithEnrolledCourses.username,
      profileImage: userWithEnrolledCourses.profile?.profileImage,
      enrolledCoursesCount: userWithEnrolledCourses.enrolledCourses?.length || 0,
      wishlistCount: userWithEnrolledCourses.wishlist?.length || 0,
      cartCount: userWithEnrolledCourses.cart?.length || 0
    });

    // Fetch Student data to merge progress for old courses
    const Student = require('../models/Student');
    const studentData = await Student.findOne({ user: req.user.id }).lean();
    const studentEnrolled = studentData?.enrolledCourses || [];

    res.json({
      success: true,
      data: {
        user: {
          id: userWithEnrolledCourses._id,
          username: userWithEnrolledCourses.username,
          email: userWithEnrolledCourses.email,
          role: userWithEnrolledCourses.role,
          profile: {
            ...userWithEnrolledCourses.profile,
            profileImage: (userWithEnrolledCourses.profile?.profileImage && !userWithEnrolledCourses.profile.profileImage.includes('picsum.photos')) 
              ? userWithEnrolledCourses.profile.profileImage 
              : "/boy.png"
          }
        },
        enrolledCourses: (userWithEnrolledCourses.enrolledCourses || []).map(course => {
          const courseObj = { ...course };
          
          // Find progress from User model
          const userProgressEntry = (userWithEnrolledCourses.progress || []).find(
            p => p.courseId.toString() === course._id.toString()
          );

          // Find progress from Student model (backup for old courses)
          const studentProgressEntry = studentEnrolled.find(
            e => (e.course || e.courseId)?.toString() === course._id.toString()
          );

          // Robustly calculate total lessons
          let totalLessonsCount = course.totalLessons || 0;
          if (totalLessonsCount === 0 || !course.totalLessons) {
            if (course.sections && course.sections.length > 0) {
              totalLessonsCount = course.sections.reduce((total, section) => 
                total + (section.lessons ? section.lessons.length : 0), 0);
            } else if (course.lessons && course.lessons.length > 0) {
              totalLessonsCount = course.lessons.length;
            }
          }

          // Merge completed lessons from both models
          const userCompleted = (userProgressEntry?.completedLessons || []).map(l => 
            (l.lessonId || l._id || l.lesson)?.toString()
          );
          const studentCompleted = (studentProgressEntry?.completedLessons || []).map(l => 
            (l.lesson || l._id || l.lessonId)?.toString()
          );
          
          const uniqueCompleted = new Set([...userCompleted.filter(Boolean), ...studentCompleted.filter(Boolean)]);
          const completedLessonsCount = uniqueCompleted.size;
          
          const progressPercentage = totalLessonsCount > 0 
            ? Math.round((completedLessonsCount / totalLessonsCount) * 100) 
            : 0;

          // Merge quiz scores
          const userQuizzes = (userProgressEntry?.quizScores || []).map(q => q.lessonId.toString());
          const studentQuizzes = (studentProgressEntry?.quizScores || []).map(q => (q.lesson || q.lessonId)?.toString());
          const uniqueQuizzes = new Set([...userQuizzes.filter(Boolean), ...studentQuizzes.filter(Boolean)]);

          // DELETE huge fields to keep response small (15MB fix)
          delete courseObj.sections;
          delete courseObj.lessons;

          return {
            ...courseObj,
            progressPercentage,
            completedLessonsCount,
            totalLessonsCount,
            quizCount: uniqueQuizzes.size,
            isPurchased: true
          };
        }),
        wishlist: userWithEnrolledCourses.wishlist || [],
        cart: userWithEnrolledCourses.cart || [],
        stats: (() => {
          // Map courses to their merged progress again to calculate stats
          const mergedCourses = (userWithEnrolledCourses.enrolledCourses || []).map(course => {
            const courseIdStr = course._id.toString();
            const userProg = (userWithEnrolledCourses.progress || []).find(p => p.courseId.toString() === courseIdStr);
            const studentCourse = studentEnrolled.find(e => (e.course || e.courseId)?.toString() === courseIdStr);
            
            const userCompleted = (userProg?.completedLessons || []).map(l => (l.lessonId || l._id || l.lesson)?.toString());
            const studentCompleted = (studentCourse?.completedLessons || []).map(l => (l.lesson || l._id || l.lessonId)?.toString());
            const combinedCompleted = new Set([...userCompleted.filter(Boolean), ...studentCompleted.filter(Boolean)]);
            const completedCount = combinedCompleted.size;
            
            let totalLessons = course.totalLessons || 0;
            if (totalLessons === 0) {
                if (course.sections && course.sections.length > 0) {
                    totalLessons = course.sections.reduce((t, s) => t + (s.lessons ? s.lessons.length : 0), 0);
                } else if (course.lessons && course.lessons.length > 0) {
                    totalLessons = course.lessons.length;
                }
            }

            // Also aggregate quizzes for stats
            const userQuizzes = (userProg?.quizScores || []).map(q => q.lessonId.toString());
            const studentQuizzes = (studentCourse?.quizScores || []).map(q => (q.lesson || q.lessonId)?.toString());
            const uniqueQuizzes = new Set([...userQuizzes.filter(Boolean), ...studentQuizzes.filter(Boolean)]);

            return { completedCount, totalLessons, quizCount: uniqueQuizzes.size };
          });

          return {
            totalEnrolled: mergedCourses.length,
            totalActive: mergedCourses.filter(c => c.completedCount > 0 && c.completedCount < c.totalLessons).length,
            totalCompleted: mergedCourses.filter(c => c.totalLessons > 0 && c.completedCount >= c.totalLessons).length,
            totalQuizzes: mergedCourses.reduce((acc, c) => acc + c.quizCount, 0)
          };
        })()
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Check if user has access to course
// @route   GET /api/users/course-access/:id
// @access  Private
const checkCourseAccess = async (req, res) => {
  try {
    const courseId = req.params.id;
    const userId = req.user.id;

    // Check if user has purchased this course
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        isPurchased: false 
      });
    }

    // Check orders/enrollments
    // This is a simple check - you might need to adjust based on your actual data structure
    const hasPurchased = user.enrolledCourses && user.enrolledCourses.includes(courseId);
    
    // Alternative: Check orders collection if you have one
    // const Order = require('../models/Order');
    // const purchase = await Order.findOne({ 
    //   user: userId, 
    //   course: courseId, 
    //   paymentStatus: 'completed' 
    // });

    res.json({
      success: true,
      isPurchased: hasPurchased
    });
  } catch (error) {
    console.error('Check course access error:', error);
    res.status(500).json({ 
      success: false, 
      isPurchased: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getDashboard,
  checkCourseAccess
};
