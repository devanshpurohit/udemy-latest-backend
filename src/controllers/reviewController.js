const Review = require("../models/Review");
const Course = require("../models/Course");

exports.getReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      courseId: req.params.courseId
    }).populate("userId", "username profile").lean();

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
    const userId = req.user?.id;

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

    const review = new Review({ courseId, userId, rating, comment });
    await review.save();

    // 🚀 Update Course Stats (Average Rating & Review Count)
    const reviews = await Review.find({ courseId }).lean();
    const avgRating = reviews.reduce((acc, item) => acc + item.rating, 0) / reviews.length;

    await Course.findByIdAndUpdate(courseId, {
      averageRating: avgRating.toFixed(1),
      numReviews: reviews.length
    });

    console.log(`✅ Course ${courseId} updated: Avg Rating = ${avgRating.toFixed(1)}, Total Reviews = ${reviews.length}`);

    // Populate user details for response
    await review.populate("userId", "username profile");

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