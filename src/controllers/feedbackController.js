const Feedback = require('../models/Feedback');

// @desc    Submit new feedback
// @route   POST /api/feedback
// @access  Public (or semi-private)
exports.submitFeedback = async (req, res) => {
  try {
    const { name, email, rating, comment } = req.body;

    if (!name || !email || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    const feedback = await Feedback.create({
      user: req.user?._id,
      name,
      email,
      rating,
      comment,
      userRole: req.user ? (req.user.role === 'admin' ? 'Instructor' : 'Student') : 'Student',
      userImage: req.user?.profile?.profileImage || '/boy.png'
    });

    res.status(201).json({
      success: true,
      data: feedback,
      message: 'Feedback submitted successfully! It will be visible after approval.'
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Get all approved feedbacks
// @route   GET /api/feedback/approved
// @access  Public
exports.getApprovedFeedbacks = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ isApproved: true }).sort('-createdAt');
    res.status(200).json({
      success: true,
      data: feedbacks
    });
  } catch (error) {
    console.error('Get approved feedbacks error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Get all feedbacks (Admin only)
// @route   GET /api/feedback
// @access  Private/Admin
exports.getAllFeedbacks = async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort('-createdAt');
    res.status(200).json({
      success: true,
      data: feedbacks
    });
  } catch (error) {
    console.error('Get all feedbacks error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Update feedback status (Approve/Reject)
// @route   PUT /api/feedback/:id
// @access  Private/Admin
exports.updateFeedbackStatus = async (req, res) => {
  try {
    const { isApproved } = req.body;
    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      { isApproved },
      { new: true, runValidators: true }
    );

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    res.status(200).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Update feedback status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Admin create feedback manually
// @route   POST /api/feedback/admin
// @access  Private/Admin
exports.adminCreateFeedback = async (req, res) => {
  try {
    const { name, rating, comment, userRole, userImage, isApproved } = req.body;

    const feedback = await Feedback.create({
      name,
      email: 'admin-created@example.com',
      rating,
      comment,
      userRole: userRole || 'Student',
      userImage: userImage || '/feedback_01.jpg',
      isApproved: isApproved !== undefined ? isApproved : true
    });

    res.status(201).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Admin create feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Delete feedback
// @route   DELETE /api/feedback/:id
// @access  Private/Admin
exports.deleteFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Feedback deleted'
    });
  } catch (error) {
    console.error('Delete feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};
