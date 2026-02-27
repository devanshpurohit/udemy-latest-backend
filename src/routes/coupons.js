const express = require('express');
const { body } = require('express-validator');
const couponController = require('../controllers/couponController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// Validation middleware
const createCouponValidation = [
  body('code')
    .notEmpty()
    .withMessage('Coupon code is required')
    .isLength({ min: 3, max: 20 })
    .withMessage('Coupon code must be between 3 and 20 characters')
    .matches(/^[A-Z0-9_-]+$/)
    .withMessage('Coupon code can only contain uppercase letters, numbers, underscores, and hyphens'),
  body('description')
    .notEmpty()
    .withMessage('Coupon description is required')
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('type')
    .isIn(['percentage', 'fixed_amount'])
    .withMessage('Type must be either percentage or fixed_amount'),
  body('value')
    .isNumeric()
    .withMessage('Value must be a number')
    .isFloat({ min: 0 })
    .withMessage('Value cannot be negative')
    .custom((value, { req }) => {
      if (req.body.type === 'percentage' && (value < 0 || value > 100)) {
        throw new Error('Percentage value must be between 0 and 100');
      }
      return true;
    }),
  body('minimumAmount')
    .optional()
    .isNumeric()
    .withMessage('Minimum amount must be a number')
    .isFloat({ min: 0 })
    .withMessage('Minimum amount cannot be negative'),
  body('maximumDiscount')
    .optional()
    .isNumeric()
    .withMessage('Maximum discount must be a number')
    .isFloat({ min: 0 })
    .withMessage('Maximum discount cannot be negative'),
  body('usageLimit.total')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Total usage limit must be a positive integer'),
  body('usageLimit.perUser')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Per user usage limit must be a positive integer'),
  body('applicableTo')
    .optional()
    .isIn(['all_courses', 'specific_courses', 'specific_categories'])
    .withMessage('Invalid applicable to option'),
  body('courses')
    .optional()
    .isArray()
    .withMessage('Courses must be an array'),
  body('categories')
    .optional()
    .isArray()
    .withMessage('Categories must be an array'),
  body('startDate')
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  body('endDate')
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    })
];

const updateCouponValidation = [
  body('code')
    .optional()
    .isLength({ min: 3, max: 20 })
    .withMessage('Coupon code must be between 3 and 20 characters')
    .matches(/^[A-Z0-9_-]+$/)
    .withMessage('Coupon code can only contain uppercase letters, numbers, underscores, and hyphens'),
  body('description')
    .optional()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be between 1 and 500 characters'),
  body('type')
    .optional()
    .isIn(['percentage', 'fixed_amount'])
    .withMessage('Type must be either percentage or fixed_amount'),
  body('value')
    .optional()
    .isNumeric()
    .withMessage('Value must be a number')
    .isFloat({ min: 0 })
    .withMessage('Value cannot be negative'),
  body('minimumAmount')
    .optional()
    .isNumeric()
    .withMessage('Minimum amount must be a number')
    .isFloat({ min: 0 })
    .withMessage('Minimum amount cannot be negative'),
  body('maximumDiscount')
    .optional()
    .isNumeric()
    .withMessage('Maximum discount must be a number')
    .isFloat({ min: 0 })
    .withMessage('Maximum discount cannot be negative'),
  body('usageLimit.total')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Total usage limit must be a positive integer'),
  body('usageLimit.perUser')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Per user usage limit must be a positive integer'),
  body('applicableTo')
    .optional()
    .isIn(['all_courses', 'specific_courses', 'specific_categories'])
    .withMessage('Invalid applicable to option'),
  body('courses')
    .optional()
    .isArray()
    .withMessage('Courses must be an array'),
  body('categories')
    .optional()
    .isArray()
    .withMessage('Categories must be an array'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

const validateCouponValidation = [
  body('code')
    .notEmpty()
    .withMessage('Coupon code is required')
    .isLength({ min: 3 })
    .withMessage('Coupon code must be at least 3 characters long'),
  body('courseId')
    .optional()
    .isMongoId()
    .withMessage('Course ID must be a valid MongoDB ID'),
  body('courseAmount')
    .optional()
    .isNumeric()
    .withMessage('Course amount must be a number')
    .isFloat({ min: 0 })
    .withMessage('Course amount cannot be negative')
];

const applyCouponValidation = [
  body('code')
    .notEmpty()
    .withMessage('Coupon code is required'),
  body('courseId')
    .isMongoId()
    .withMessage('Course ID must be a valid MongoDB ID'),
  body('orderAmount')
    .isNumeric()
    .withMessage('Order amount must be a number')
    .isFloat({ min: 0 })
    .withMessage('Order amount cannot be negative'),
  body('orderId')
    .isMongoId()
    .withMessage('Order ID must be a valid MongoDB ID')
];

// Admin only routes
console.log('🎫 Registering coupon routes...');
router.post('/', authorize('admin'), createCouponValidation, couponController.createCoupon);
router.get('/', authorize('admin'), couponController.getCoupons);
router.get('/:id', authorize('admin'), couponController.getCoupon);
router.put('/:id', authorize('admin'), updateCouponValidation, couponController.updateCoupon);
router.delete('/:id', authorize('admin'), couponController.deleteCoupon);
router.put('/:id/toggle-status', authorize('admin'), couponController.toggleCouponStatus);
console.log('✅ Coupon routes registered successfully!');

// Public routes (accessible by all authenticated users)
router.post('/validate', validateCouponValidation, couponController.validateCoupon);
router.post('/apply', applyCouponValidation, couponController.applyCoupon);

module.exports = router;
