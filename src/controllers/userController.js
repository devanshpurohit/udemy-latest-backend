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
    const user = await User.findById(req.user.id).select('-password');
    
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

    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (countryCode) user.countryCode = countryCode;
    if (language) user.language = language;

    // ⭐ profile image update
    if (profile?.profileImage) {
      if (!user.profile) {
        user.profile = {};
      }

      user.profile.profileImage = profile.profileImage;
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

    const userWithEnrolledCourses = await User.findById(user._id).populate({
      path: 'enrolledCourses',
      populate: {
        path: 'instructor',
        select: 'name'
      }
    }).populate('wishlist').populate('cart');

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
            profileImage: userWithEnrolledCourses.profile?.profileImage || "https://picsum.photos/seed/user123/80/80.jpg"
          }
        },
        enrolledCourses: userWithEnrolledCourses.enrolledCourses || [],
        wishlist: userWithEnrolledCourses.wishlist || [],
        cart: userWithEnrolledCourses.cart || [],
        stats: {
          totalEnrolled: userWithEnrolledCourses.enrolledCourses?.length || 0,
          totalActive: userWithEnrolledCourses.enrolledCourses?.filter(c => c.status === 'active')?.length || 0,
          totalCompleted: userWithEnrolledCourses.enrolledCourses?.filter(c => c.status === 'completed')?.length || 0,
          totalQuizzes: 0 // Will be added later
        }
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
    const user = await User.findById(userId);
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
