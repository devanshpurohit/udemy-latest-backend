const express = require("express");
const router = express.Router();

const { getReviews, createReview } = require("../controllers/reviewController");
const { protect } = require("../middleware/auth");

router.get("/reviews/:courseId", getReviews);
router.post("/reviews/:courseId", protect, createReview);

module.exports = router;