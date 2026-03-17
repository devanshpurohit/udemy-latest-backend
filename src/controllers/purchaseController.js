const User = require('../models/User');
const Course = require('../models/Course');
const Statement = require('../models/Statement');
const Order = require('../models/Order');

const Student = require('../models/Student');

// @desc    Purchase course (fake payment)
// @route   POST /api/purchase/:courseId
// @access  Private
const purchaseCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?.id || req.user?._id;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // If your app only allows published purchases
    if (course.status && course.status !== 'published') {
      return res.status(400).json({ success: false, message: 'Course is not available for purchase' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const alreadyPurchased = (user.purchasedCourses || []).some(
      (id) => String(id) === String(courseId)
    );
    if (alreadyPurchased) {
      return res.json({ success: false, message: 'Already purchased' });
    }

    user.purchasedCourses = user.purchasedCourses || [];
    user.purchasedCourses.push(courseId);

    // Keep existing "learning access" logic working
    if (typeof user.enrollInCourse === 'function') {
      await user.enrollInCourse(courseId);
    } else {
      user.enrolledCourses = user.enrolledCourses || [];
      if (!user.enrolledCourses.some((id) => String(id) === String(courseId))) {
        user.enrolledCourses.push(courseId);
      }
      await user.save();
    }

    // ⭐ Sync with Student model for Admin Panel
    try {
        let studentRecord = await Student.findOne({ user: userId });
        if (studentRecord) {
            if (!studentRecord.enrolledCourses.some(e => String(e.course) === String(courseId))) {
                studentRecord.enrolledCourses.push({
                    course: courseId,
                    enrolledAt: new Date(),
                    progress: 0
                });
                studentRecord.updateLearningStats();
                await studentRecord.save();
                console.log(`Synced course ${courseId} to Student record for user ${userId}`);
            }
        } else {
            // Create student record if it doesn't exist (e.g. for legacy users)
            studentRecord = await Student.create({
                user: userId,
                enrolledCourses: [{
                    course: courseId,
                    enrolledAt: new Date(),
                    progress: 0
                }]
            });
            studentRecord.updateLearningStats();
            await studentRecord.save();
            console.log(`Created and synced Student record for user ${userId}`);
        }
    } catch (studentSyncError) {
        console.error('Error syncing to Student model:', studentSyncError);
        // Don't fail the whole purchase if student record sync fails, but log it
    }

    // Also mark in course.enrolledStudents (frontend checks this)
    course.enrolledStudents = course.enrolledStudents || [];
    const alreadyInCourse = course.enrolledStudents.some(
      (id) => String(id) === String(userId)
    );
    if (!alreadyInCourse) {
      course.enrolledStudents.push(userId);
      if (typeof course.updateTotalEnrollments === 'function') {
        course.updateTotalEnrollments();
      }
      await course.save();
    }

    // 2️⃣ Generate Order ID
    const orderId = `ORD-${Date.now()}`;

    // 3️⃣ Save Statement
    await Statement.create({
      orderId,
      student: userId, // Use student field (not user)
      course: courseId,
      amount: course.price || 0,
      paymentMethod: "Other", // Required field
      status: "Paid", // Required field (using status instead of paymentStatus)
      instructor: course.instructor || null, // Required field
      paymentDate: new Date() // Required field
    });

    // 4️⃣ Save Order for Dashboard
    await Order.create({
      userId: userId,
      courseId: courseId,
      orderId: orderId,
      amount: course.price || 0,
      paymentStatus: "completed",
      paymentMethod: "Other"
    });

    // 5️⃣ Create Notification for Admin
    try {
      const Notification = require('../models/Notification');
      await Notification.create({
        type: 'purchase',
        orderId: orderId,
        message: `New Course Purchase #${orderId} has been placed.`
      });
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't fail the whole purchase if notification creation fails
    }

    return res.json({
      success: true,
      message: 'Course purchased successfully',
      orderId
    });
  } catch (error) {
    console.error('Purchase course error:', error);
    return res.status(500).json({ success: false, message: 'Server error while purchasing course' });
  }
};

// @desc    Get purchased courses
// @route   GET /api/my-courses
// @access  Private
const getMyCourses = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    const user = await User.findById(userId).populate('purchasedCourses');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      courses: user.purchasedCourses || []
    });
  } catch (error) {
    console.error('Get my courses error:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching my courses' });
  }
};

module.exports = {
  purchaseCourse,
  getMyCourses
};

