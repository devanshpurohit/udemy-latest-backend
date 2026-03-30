const Review = require("../models/Review");
const Course = require("../models/Course");

// @desc    Get reviews for a course (Only approved)
// @route   GET /api/reviews/:courseId
// @access  Public
exports.getReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      courseId: req.params.courseId
      // isApproved filter removed
    }).populate("userId", "username profile").lean();

    console.log(`🔍 [DEBUG] getReviews for course ${req.params.courseId}:`, reviews.length, 'approved reviews found');
    if (reviews.length > 0) {
      console.log(`   - First review ID: ${reviews[0]._id}, User: ${reviews[0].userId?.username}`);
    }

    res.json({
      success: true,
      data: reviews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create new review (Pending approval)
// @route   POST /api/reviews/:courseId
// @access  Private
exports.createReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const { courseId } = req.params;
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    // Check if user already reviewed this course
    const existingReview = await Review.findOne({ courseId, userId });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this course"
      });
    }

    // Create review - isApproved is true by default in model
    const review = new Review({ courseId, userId, rating, comment });
    await review.save();

    // UPDATE COURSE STATS IMMEDIATELY
    const reviews = await Review.find({ courseId, isApproved: true }).lean();
    const avgRating = reviews.length > 0 ? (reviews.reduce((acc, item) => acc + item.rating, 0) / reviews.length) : 0;

    await Course.findByIdAndUpdate(courseId, {
        averageRating: avgRating.toFixed(1),
        numReviews: reviews.length
    });

    // Populate user details for response
    await review.populate("userId", "username profile");

    res.status(201).json({
      success: true,
      data: review,
      message: "Review submitted successfully!"
    });

  } catch (error) {
    console.error("Create review error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all reviews (Admin only)
// @route   GET /api/reviews
// @access  Private/Admin
exports.getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("userId", "username email profile")
      .populate("courseId", "title")
      .sort("-createdAt")
      .lean();

    // 🌐 Localize course titles for Admin
    const localizedReviews = reviews.map(r => {
        if (r.courseId && r.courseId.title && typeof r.courseId.title === 'object') {
            r.courseId.title = r.courseId.title.en || r.courseId.title.kn || 'Untitled';
        }
        return r;
    });

    res.json({
      success: true,
      data: localizedReviews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update review status (Approve/Reject)
// @route   PUT /api/reviews/:id/approve
// @access  Private/Admin
exports.updateReviewStatus = async (req, res) => {
  try {
    const { isApproved } = req.body;
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { isApproved },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found"
      });
    }

    // IF APPROVED, Update Course Stats
    if (isApproved) {
        const courseId = review.courseId;
        const reviews = await Review.find({ courseId, isApproved: true }).lean();
        const avgRating = reviews.length > 0 ? (reviews.reduce((acc, item) => acc + item.rating, 0) / reviews.length) : 0;

        await Course.findByIdAndUpdate(courseId, {
            averageRating: avgRating.toFixed(1),
            numReviews: reviews.length
        });
        console.log(`✅ Course ${courseId} stats updated after review approval`);
    }

    res.json({
      success: true,
      data: review,
      message: `Review ${isApproved ? "approved" : "unapproved"} successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private/Admin
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found"
      });
    }

    const courseId = review.courseId;
    await review.deleteOne();

    // Recalculate Course Stats
    const reviews = await Review.find({ courseId, isApproved: true }).lean();
    const avgRating = reviews.length > 0 ? (reviews.reduce((acc, item) => acc + item.rating, 0) / reviews.length) : 0;

    await Course.findByIdAndUpdate(courseId, {
        averageRating: avgRating.toFixed(1),
        numReviews: reviews.length
    });

    res.json({
      success: true,
      message: "Review deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};