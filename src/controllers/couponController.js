const Coupon = require('../models/Coupon');
const Course = require('../models/Course');

// @desc    Create coupon
// @route   POST /api/coupons
// @access  Private (Admin)
const createCoupon = async (req, res) => {
  try {
    console.log('🚀 Creating coupon with data:', req.body);
    console.log('👤 User ID:', req.user?.id);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const couponData = {
      ...req.body,
      value: Number(req.body.value), // 🔥 ensure number
      createdBy: req.user.id
    };

    console.log('📝 Coupon data to create:', couponData);

    // ✅ Step 1: Create
    const coupon = await Coupon.create(couponData);

    // ✅ Step 2: Populate
    await coupon.populate(
      'createdBy',
      'username profile.firstName profile.lastName'
    );

    console.log('✅ Coupon created:', coupon);

    res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      data: { coupon }
    });

  } catch (error) {
    console.error('❌ Create coupon error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code already exists'
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message,
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all coupons
// @route   GET /api/coupons
// @access  Private (Admin)
const getCoupons = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};

    if (type) filter.type = type;
    
    if (status === 'active') {
      filter.isActive = true;
      filter.startDate = { $lte: new Date() };
      filter.endDate = { $gte: new Date() };
    } else if (status === 'expired') {
      filter.endDate = { $lt: new Date() };
    } else if (status === 'inactive') {
      filter.isActive = false;
    }

    if (search) {
      filter.$or = [
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Sort options
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const coupons = await Coupon.find(filter)
      .populate('createdBy', 'username profile.firstName profile.lastName')
      .populate('courses', 'title')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Coupon.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        coupons,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get coupons error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching coupons'
    });
  }
};

// @desc    Get single coupon
// @route   GET /api/coupons/:id
// @access  Private (Admin)
const getCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id)
      .populate('createdBy', 'username profile.firstName profile.lastName email')
      .populate('courses', 'title price')
      .populate('usedBy.user', 'username email')
      .populate('usedBy.order', 'totalAmount');

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { coupon }
    });
  } catch (error) {
    console.error('Get coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching coupon'
    });
  }
};

// @desc    Update coupon
// @route   PUT /api/coupons/:id
// @access  Private (Admin)
const updateCoupon = async (req, res) => {
  try {
    console.log('🔍 Updating coupon with ID:', req.params.id);
    
    const coupon = await Coupon.findById(req.params.id);
    console.log('📥 Found coupon:', coupon);

    if (!coupon) {
      console.log('❌ Coupon not found for ID:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    const updatedCoupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'username profile.firstName profile.lastName')
     .populate('courses', 'title');

    console.log('✅ Coupon updated successfully:', updatedCoupon);

    res.status(200).json({
      success: true,
      message: 'Coupon updated successfully',
      data: { coupon: updatedCoupon }
    });
  } catch (error) {
    console.error('Update coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating coupon'
    });
  }
};

// @desc    Delete coupon
// @route   DELETE /api/coupons/:id
// @access  Private (Admin)
const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    await Coupon.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully'
    });
  } catch (error) {
    console.error('Delete coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting coupon'
    });
  }
};

// @desc    Validate coupon
// @route   POST /api/coupons/validate
// @access  Private
const validateCoupon = async (req, res) => {
  try {
    const { code, courseId, courseAmount } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code is required'
      });
    }

    const coupon = await Coupon.findOne({ 
      code: code.toUpperCase(),
      isActive: true 
    }).populate('courses', 'title category');

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Invalid coupon code'
      });
    }

    // Get course category if courseId is provided
    let courseCategory = null;
    if (courseId) {
      const course = await Course.findById(courseId);
      if (course) {
        courseCategory = course.category;
      }
    }

    // Validate coupon
    const validation = coupon.isValid(req.user.id, courseId, courseCategory);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.reason
      });
    }

    // Calculate discount
    const discountAmount = coupon.calculateDiscount(courseAmount || 0);
    const finalAmount = Math.max(0, (courseAmount || 0) - discountAmount);

    res.status(200).json({
      success: true,
      message: 'Coupon is valid',
      data: {
        coupon: {
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          description: coupon.description
        },
        discountAmount,
        finalAmount,
        savings: discountAmount
      }
    });
  } catch (error) {
    console.error('Validate coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while validating coupon'
    });
  }
};

// @desc    Apply coupon
// @route   POST /api/coupons/apply
// @access  Private
const applyCoupon = async (req, res) => {
  try {
    const { code, courseId, orderAmount, orderId } = req.body;

    if (!code || !courseId || !orderAmount || !orderId) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: code, courseId, orderAmount, orderId'
      });
    }

    const coupon = await Coupon.findOne({ 
      code: code.toUpperCase(),
      isActive: true 
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Invalid coupon code'
      });
    }

    // Get course category
    const course = await Course.findById(courseId);
    const courseCategory = course ? course.category : null;

    // Validate coupon
    const validation = coupon.isValid(req.user.id, courseId, courseCategory);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.reason
      });
    }

    // Calculate discount
    const discountAmount = coupon.calculateDiscount(orderAmount);

    // Use coupon
    coupon.useCoupon(req.user.id, orderId, discountAmount);
    await coupon.save();

    res.status(200).json({
      success: true,
      message: 'Coupon applied successfully',
      data: {
        discountAmount,
        finalAmount: orderAmount - discountAmount
      }
    });
  } catch (error) {
    console.error('Apply coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while applying coupon'
    });
  }
};

// @desc    Toggle coupon status
// @route   PUT /api/coupons/:id/toggle-status
// @access  Private (Admin)
const toggleCouponStatus = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    res.status(200).json({
      success: true,
      message: `Coupon ${coupon.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { coupon }
    });
  } catch (error) {
    console.error('Toggle coupon status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while toggling coupon status'
    });
  }
};

module.exports = {
  createCoupon,
  getCoupons,
  getCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  applyCoupon,
  toggleCouponStatus
};
