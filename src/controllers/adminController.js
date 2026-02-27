const User = require('../models/User');
const Course = require('../models/Course');
const Student = require('../models/Student');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin)
const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      role,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    if (role) filter.role = role;

    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } }
      ];
    }

    // Sort options
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const users = await User.find(filter)
      .select('-password')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private (Admin)
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('enrolledCourses.course', 'title thumbnail');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user'
    });
  }
};

// @desc    Update user status
// @route   PUT /api/admin/users/:id/status
// @access  Private (Admin)
const updateUserStatus = async (req, res) => {
  try {
    const { isActive, role } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive, role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating user'
    });
  }
};

// @desc    Get system statistics
// @route   GET /api/admin/stats
// @access  Private (Admin)
const getSystemStats = async (req, res) => {
  try {
    const [
      totalUsers,
      adminUsers,
      instructorUsers,
      studentUsers,
      activeUsers,
      verifiedUsers
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'instructor' }),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ emailVerified: true })
    ]);

    const recentUsers = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalUsers,
          adminUsers,
          instructorUsers,
          studentUsers,
          activeUsers,
          verifiedUsers
        },
        recentUsers
      }
    });
  } catch (error) {
    console.error('Get system stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching system stats'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/admin/users/:id/profile
// @access  Private (Admin)
// @desc    Update user profile
// @route   PUT /api/admin/users/:id/profile
// @access  Private (Admin)
// @desc    Update user profile
// @route   PUT /api/admin/users/:id/profile
// @access  Private (Admin)
const updateUserProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, bio, profileImage } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          "profile.firstName": firstName,
          "profile.lastName": lastName,
          "profile.phone": phone,
          "profile.bio": bio,
          "profile.profileImage": profileImage
        }
      },
      {
        new: true,
        runValidators: true
      }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    console.log("Admin - Profile updated:", updatedUser.profile);

    res.status(200).json({
      success: true,
      message: "User profile updated successfully",
      data: {
        user: updatedUser.getProfile()
      }
    });
  } catch (error) {
    console.error("Admin - Update user profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating user profile"
    });
  }
};


module.exports = {
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUserProfile,
  getSystemStats
};
