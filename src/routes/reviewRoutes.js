const express = require("express");
const router = express.Router();
const { getReviews, createReview, getAllReviews, updateReviewStatus, deleteReview } = require("../controllers/reviewController");
const { protect, admin } = require("../middleware/auth");

// Public
router.get("/reviews/:courseId", getReviews);

// Private (User)
router.post("/reviews/:courseId", protect, createReview);

// Private (Admin)
router.get("/all-reviews", protect, admin, getAllReviews);
router.put("/reviews/:id/approve", protect, admin, updateReviewStatus);
router.delete("/reviews/:id", protect, admin, deleteReview);

module.exports = router;