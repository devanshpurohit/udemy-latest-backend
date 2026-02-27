const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { uploadSingle } = require('../middleware/upload');
const { generateToken } = require('../utils/generateToken');
const { sendOTPEmail, sendPasswordResetEmail, sendWelcomeEmail } = require('../utils/emailService');
const crypto = require('crypto');

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, role } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    // Create user (auto-verified for development)
    const user = await User.create({
      username,
      email,
      password,
      profile: {
        firstName,
        lastName
      },
      role: role || 'student', // Use provided role or default to student
      emailVerified: true, // Auto verify for development
      isActive: true
    });

    // Create corresponding student record if role is student
    if (user.role === 'student') {
      const Student = require('../models/Student');
      await Student.create({
        user: user._id,
        enrolledCourses: [],
        learningStats: {
          totalCoursesEnrolled: 0,
          totalCoursesCompleted: 0,
          totalLearningTime: 0,
          averageCompletionRate: 0
        },
        achievements: [],
        notes: []
      });
    }

    // Send welcome email (skip for development)
    try {
      // await sendWelcomeEmail(user.email, user.username);
      console.log('User registered successfully:', user.username);
    } catch (error) {
      console.log('Welcome email skipped for development');
    }

    // Generate token
    const token = generateToken({ id: user._id });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: user.getProfile(),
        token,
        emailVerificationRequired: false
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: errors.join(', ')
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// @desc    Verify email with OTP
// @route   POST /api/auth/verify-email
// @access  Public
const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }

    if (user.emailVerificationToken !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    if (user.emailVerificationExpires < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired'
      });
    }

    // Verify email
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Send welcome email
    await sendWelcomeEmail(user.email, user.username);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during email verification'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    console.log("🔍 Incoming request body:", req.body);
    console.log("🔍 Request headers:", req.headers);
    
    const { username, password } = req.body;
    
    console.log('🔍 Login attempt:', { username, passwordLength: password?.length });

    // Find user by username or email
    const user = await User.findOne({
      $or: [{ username }, { email: username }]
    });

    console.log('🔍 User found:', user ? 'YES' : 'NO');
    if (user) {
      console.log('🔍 User details:', {
        id: user._id,
        username: user.username,
        email: user.email,
        isActive: user.isActive,
        emailVerified: user.emailVerified
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Skip email verification check in development
    if (!user.emailVerified && process.env.NODE_ENV === 'production') {
      return res.status(401).json({
        success: false,
        message: 'Please verify your email before logging in'
      });
    }

    // Check password
    console.log('🔍 Checking password...');
    const isPasswordValid = await user.comparePassword(password);
    
    console.log('🔍 Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('❌ Password comparison failed');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    console.log('✅ Backend - User authenticated, generating token');

    // Generate token with role
    const token = generateToken({ id: user._id, role: user.role });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          profile: {
            ...user.profile,
            profileImage: user.profile?.profileImage || "https://picsum.photos/seed/user123/80/80.jpg"
          }
        },
        token
      }
    });
  } catch (error) {
    console.error('Backend - Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    // Send reset email
    await sendPasswordResetEmail(email, resetToken);

    res.status(200).json({
      success: true,
      message: 'Password reset email sent'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset request'
    });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset'
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: {
        user: user.getProfile()
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user data'
    });
  }
};

// @desc    Update profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    console.log('Backend - Profile update request received:', req.body);
    console.log('Backend - User ID from token:', req.user.id);
    
    const { firstName, lastName, bio, phone, profileImage } = req.body;
    
    // First check if user exists
    const user = await User.findById(req.user.id);
    console.log('Backend - Found user:', user);
    console.log('Backend - Current profile data:', user?.profile);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if profile object exists
    if (!user.profile) {
      console.log('Backend - Profile object missing, creating new profile object');
      user.profile = {
        firstName: '',
        lastName: '',
        bio: '',
        phone: '',
        profileImage: ''
      };
    }
    
    // Update profile using $set operator for nested objects
    const updateData = {
      $set: {
        'profile.firstName': firstName || user.profile.firstName,
        'profile.lastName': lastName || user.profile.lastName,
        'profile.bio': bio || user.profile.bio,
        'profile.phone': phone || user.profile.phone,
        'profile.profileImage': profileImage || user.profile.profileImage
      }
    };
    
    console.log('Backend - Update data with $set:', updateData);
    console.log('Backend - User ID:', req.user.id);
    console.log('Backend - About to save user to database...');
    
    const savedUser = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    console.log('Backend - Saved user to database:', savedUser);
    console.log('Backend - Save operation completed. User profile after save:', savedUser.profile);
    
    // Verify save by immediately fetching
    const verificationUser = await User.findById(req.user.id);
    console.log('Backend - Verification fetch after save:', verificationUser.profile);
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: savedUser.getProfile()
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
    });
  }
};

// @desc    Upload profile image
// @route   POST /api/auth/upload-profile-image
// @access  Private
const uploadProfileImage = async (req, res) => {
  try {
    console.log('Backend - Profile image upload request received');
    console.log('Backend - Request files:', req.files);
    console.log('Backend - Request file:', req.file);
    console.log('Backend - Request body:', req.body);
    console.log('Backend - Request headers:', req.headers);
    
    if (!req.file) {
      console.log('Backend - No file found in request');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    console.log('Backend - File details:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      filename: req.file.filename
    });

    const user = await User.findById(req.user.id);
    if (!user) {
      console.log('Backend - User not found');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update profile image URL
    user.profile.profileImage = `/uploads/avatars/${req.file.filename}`;
    await user.save();

    console.log('Backend - Profile image updated:', user.profile.profileImage);

    res.status(200).json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: {
        profileImage: user.profile.profileImage
      }
    });
  } catch (error) {
    console.error('Backend - Upload profile image error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading profile image'
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Update password (pre-save hook will hash it)
    user.password = newPassword;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while changing password'
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    console.log('Backend - Logout request received from user:', req.user.id);
    
    // Clear token cookie if using cookies
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    });

    res.status(200).json({
      success: true,
      message: 'User logged out successfully'
    });
  } catch (error) {
    console.error('Backend - Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while logging out'
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  uploadProfileImage,
  changePassword,
  verifyEmail,
  forgotPassword,
  resetPassword
};
