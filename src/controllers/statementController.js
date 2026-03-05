const Statement = require('../models/Statement');

// @desc    Get all statements for admin
// @route   GET /api/admin/statements
// @access  Admin
const getStatements = async (req, res) => {
  try {
    const statements = await Statement.find()
      .populate("student", "username email") // Use student field (not user)
      .populate("instructor", "username email") // Use instructor field
      .populate("course", "title price")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: statements
    });

  } catch (error) {
    console.error('Get statements error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching statements' });
  }
};

module.exports = {
  getStatements
};
