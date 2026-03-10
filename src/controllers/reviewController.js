const Review = require("../models/Review");

exports.getReviews = async (req, res) => {
  try {

    const reviews = await Review.find({
      courseId: req.params.courseId
    }).populate("userId", "name profileImage");

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

exports.createReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const { courseId } = req.params;
    const userId = req.user?.id; // Get user ID from auth middleware

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    // Check if user already reviewed this course
    const existingReview = await Review.findOne({
      courseId,
      userId
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this course"
      });
    }

    // Create new review
    const review = new Review({
      courseId,
      userId,
      rating,
      comment
    });

    await review.save();

    // Populate user details for response
    await review.populate("userId", "name profileImage");

    res.status(201).json({
      success: true,
      data: review,
      message: "Review submitted successfully"
    });

  } catch (error) {
    console.error("Create review error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};