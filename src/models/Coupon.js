const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Coupon code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    match: [/^[A-Z0-9_-]+$/, 'Coupon code can only contain uppercase letters, numbers, underscores, and hyphens']
  },
  description: {
    type: String,
    required: [true, 'Coupon description is required'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed_amount'],
    required: true
  },
  value: {
    type: Number,
    required: [true, 'Coupon value is required'],
    min: [0, 'Value cannot be negative']
  },
  minimumAmount: {
    type: Number,
    default: 0,
    min: [0, 'Minimum amount cannot be negative']
  },
  maximumDiscount: {
    type: Number,
    min: [0, 'Maximum discount cannot be negative']
  },
  usageLimit: {
    total: {
      type: Number,
      default: null // null means unlimited
    },
    perUser: {
      type: Number,
      default: 1
    }
  },
  usedCount: {
    type: Number,
    default: 0
  },
  applicableTo: {
    type: String,
    enum: ['all_courses', 'specific_courses', 'specific_categories'],
    default: 'all_courses'
  },
  courses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  categories: [{
    type: String,
    enum: ['development', 'business', 'design', 'marketing', 'it-software', 'personal-development', 'health-fitness', 'music', 'academics']
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  usedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    usedAt: {
      type: Date,
      default: Date.now
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    discountAmount: {
      type: Number,
      required: true
    }
  }]
}, {
  timestamps: true
});

// Method to check if coupon is valid
couponSchema.methods.isValid = function(userId = null, courseId = null, courseCategory = null) {
  const now = new Date();
  
  // Check if coupon is active
  if (!this.isActive) return { valid: false, reason: 'Coupon is inactive' };
  
  // Check date range
  if (now < this.startDate) return { valid: false, reason: 'Coupon not yet active' };
  if (now > this.endDate) return { valid: false, reason: 'Coupon has expired' };
  
  // Check usage limits
  if (this.usageLimit.total && this.usedCount >= this.usageLimit.total) {
    return { valid: false, reason: 'Coupon usage limit reached' };
  }
  
  if (userId && this.usageLimit.perUser) {
    const userUsageCount = this.usedBy.filter(
      usage => usage.user.toString() === userId.toString()
    ).length;
    
    if (userUsageCount >= this.usageLimit.perUser) {
      return { valid: false, reason: 'Coupon usage limit per user reached' };
    }
  }
  
  // Check course applicability
  if (this.applicableTo === 'specific_courses' && courseId) {
    const isApplicable = this.courses.some(
      course => course.toString() === courseId.toString()
    );
    if (!isApplicable) {
      return { valid: false, reason: 'Coupon not applicable to this course' };
    }
  }
  
  if (this.applicableTo === 'specific_categories' && courseCategory) {
    if (!this.categories.includes(courseCategory)) {
      return { valid: false, reason: 'Coupon not applicable to this course category' };
    }
  }
  
  return { valid: true };
};

// Method to calculate discount
couponSchema.methods.calculateDiscount = function(originalAmount) {
  if (this.type === 'percentage') {
    let discount = (originalAmount * this.value) / 100;
    
    // Apply maximum discount limit if set
    if (this.maximumDiscount) {
      discount = Math.min(discount, this.maximumDiscount);
    }
    
    return discount;
  } else {
    return Math.min(this.value, originalAmount);
  }
};

// Method to use coupon
couponSchema.methods.useCoupon = function(userId, orderId, discountAmount) {
  this.usedCount++;
  this.usedBy.push({
    user: userId,
    order: orderId,
    discountAmount: discountAmount
  });
};

module.exports = mongoose.model('Coupon', couponSchema);
