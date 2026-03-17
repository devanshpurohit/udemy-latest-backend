const Statement = require('../models/Statement');

// @desc    Get all statements for admin
// @route   GET /api/admin/statements
// @access  Admin
const getStatements = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      status, 
      paymentMethod,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (paymentMethod && paymentMethod !== 'all') {
      filter.paymentMethod = paymentMethod;
    }

    if (search) {
      filter.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        // If course title search is needed, it might require a more complex query 
        // involving first finding courses then filtering statements by course IDs
      ];
    }

    // Sort options
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Count total for pagination
    const total = await Statement.countDocuments(filter);

    const statements = await Statement.find(filter)
      .populate("student", "username email")
      .populate("instructor", "username email")
      .populate("course", "title price")
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({
      success: true,
      data: statements,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get statements error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching statements' });
  }
};

module.exports = {
  getStatements
};
