const mongoose = require('mongoose');
const Certificate = require('../models/Certificate');
const Course = require('../models/Course');
const User = require('../models/User');
const Student = require('../models/Student');

// @desc    Generate certificate
// @route   POST /api/certificates/generate
// @access  Private
const generateCertificate = async (req, res) => {
  try {
    const { courseId, studentId } = req.body;

    // Check permissions
    if (req.user.role !== 'admin' && req.user.id !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const course = await Course.findById(courseId).populate('instructor', 'username profile.firstName profile.lastName');
    const student = await User.findById(studentId);
    const studentDetails = await Student.findOne({ user: studentId });

    if (!course || !student) {
      return res.status(404).json({
        success: false,
        message: 'Course or student not found'
      });
    }

    // Check if student is enrolled and completed the course
    const enrolledCourse = studentDetails?.enrolledCourses.id(courseId);
    if (!enrolledCourse || enrolledCourse.progress !== 100) {
      return res.status(400).json({
        success: false,
        message: 'Student has not completed this course'
      });
    }

    // Check if certificate already exists
    const existingCertificate = await Certificate.findOne({
      student: studentId,
      course: courseId,
      isRevoked: false
    });

    if (existingCertificate) {
      return res.status(400).json({
        success: false,
        message: 'Certificate already exists for this course'
      });
    }

    // Generate certificate
    const certificate = await Certificate.create({
      student: studentId,
      course: courseId,
      instructor: course.instructor._id,
      studentName: `${student.profile.firstName} ${student.profile.lastName}`,
      courseTitle: course.title,
      instructorName: `${course.instructor.profile.firstName} ${course.instructor.profile.lastName}`,
      duration: `${course.duration} minutes`,
      completedAt: enrolledCourse.completedAt,
      metadata: {
        totalLessons: course.lessons.length,
        completedLessons: enrolledCourse.completedLessons.length,
        averageScore: 0, // You might want to calculate this from quiz results
        timeSpent: studentDetails.learningStats.totalLearningTime
      }
    });

    // Update student record
    if (studentDetails) {
      const enrolledCourse = studentDetails.enrolledCourses.id(courseId);
      enrolledCourse.certificate = {
        issued: true,
        issuedAt: new Date(),
        certificateUrl: certificate.certificateId
      };
      await studentDetails.save();
    }

    await certificate.populate('student', 'username email');
    await certificate.populate('course', 'title');
    await certificate.populate('instructor', 'username profile.firstName profile.lastName');

    res.status(201).json({
      success: true,
      message: 'Certificate generated successfully',
      data: { certificate }
    });
  } catch (error) {
    console.error('Generate certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating certificate'
    });
  }
};

// @desc    Get all certificates
// @route   GET /api/certificates
// @access  Private (Admin)
const getCertificates = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50, // Increased limit to show more certificates
      courseId,
      studentId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};

    if (courseId) filter.course = courseId;
    if (studentId) filter.student = studentId;
    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (search) {
      filter.$or = [
        { certificateId: { $regex: search, $options: 'i' } },
        { courseTitle: { $regex: search, $options: 'i' } }
      ];
    }

    // Sort options
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const certificates = await Certificate.find(filter)
      .populate('student', 'username email profile.firstName profile.lastName')
      .populate('course', 'title thumbnail')
      .populate('instructor', 'username profile.firstName profile.lastName')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Certificate.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        certificates,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get certificates error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching certificates'
    });
  }
};

// @desc    Get single certificate
// @route   GET /api/certificates/:id
// @access  Private
const getCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id)
      .populate('student', 'username email profile.firstName profile.lastName')
      .populate('course', 'title description thumbnail instructor')
      .populate('instructor', 'username profile.firstName profile.lastName email');

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && 
        req.user.id !== certificate.student._id.toString() && 
        req.user.id !== certificate.instructor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      data: { certificate }
    });
  } catch (error) {
    console.error('Get certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching certificate'
    });
  }
};

// @desc    Update certificate
// @route   PUT /api/certificates/:id
// @access  Private (Admin)
const updateCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id);

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    const updatedCertificate = await Certificate.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('student', 'username email profile.firstName profile.lastName')
     .populate('course', 'title')
     .populate('instructor', 'username profile.firstName profile.lastName');

    res.status(200).json({
      success: true,
      message: 'Certificate updated successfully',
      data: { certificate: updatedCertificate }
    });
  } catch (error) {
    console.error('Update certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating certificate'
    });
  }
};

// @desc    Revoke certificate
// @route   PUT /api/certificates/:id/revoke
// @access  Private (Admin)
const revokeCertificate = async (req, res) => {
  try {
    const { reason, status = 'revoked' } = req.body;
    
    const certificate = await Certificate.findById(req.params.id);

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    // Update certificate status
    if (status === 'active') {
      certificate.isRevoked = false;
      certificate.revokedAt = null;
      certificate.revokedReason = null;
      certificate.status = 'active';
    } else if (status === 'inactive') {
      certificate.isRevoked = false;
      certificate.revokedAt = null;
      certificate.revokedReason = null;
      certificate.status = 'inactive';
    } else {
      certificate.isRevoked = true;
      certificate.revokedAt = new Date();
      certificate.revokedReason = reason || 'Revoked by admin';
      certificate.status = 'revoked';
    }
    
    await certificate.save();

    res.status(200).json({
      success: true,
      message: `Certificate ${status === 'inactive' ? 'marked as inactive' : 'revoked'} successfully`,
      data: { certificate }
    });
  } catch (error) {
    console.error('Revoke certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating certificate'
    });
  }
};

// @desc    Verify certificate
// @route   GET /api/certificates/verify/:certificateId
// @access  Public
const verifyCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;

    const certificate = await Certificate.verifyCertificate(certificateId);

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found or has been revoked'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Certificate is valid',
      data: { certificate }
    });
  } catch (error) {
    console.error('Verify certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while verifying certificate'
    });
  }
};

// @desc    Download certificate
// @route   GET /api/certificates/:id/download
// @access  Private
const downloadCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id)
      .populate('student', 'username email profile.firstName profile.lastName')
      .populate('course', 'title')
      .populate('instructor', 'username profile.firstName profile.lastName');

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.id !== certificate.student._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (certificate.isRevoked) {
      return res.status(400).json({
        success: false,
        message: 'Certificate has been revoked'
      });
    }

    // Generate PDF certificate (you would need a PDF generation library here)
    // For now, we'll return the certificate data
    res.status(200).json({
      success: true,
      message: 'Certificate data ready for download',
      data: { certificate }
    });
  } catch (error) {
    console.error('Download certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while downloading certificate'
    });
  }
};

// @desc    Create manual certificate (for admin use)
// @route   POST /api/certificates/create-manual
// @access  Private (Admin)
const createManualCertificate = async (req, res) => {
  try {
    const {
      courseTitle,
      duration,
      score,
      template,
      completedAt
    } = req.body;

    // Generate unique certificate ID
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    const certificateId = `CERT-${timestamp}-${random}`.toUpperCase();

    // Create a dummy course reference for manual certificates
    // We'll use a placeholder ObjectId since course is required
    const dummyCourseId = new mongoose.Types.ObjectId();

    // Create certificate manually
    const certificate = await Certificate.create({
      student: req.user.id, // Use admin as placeholder for now
      course: dummyCourseId, // Use dummy course ID for manual certificates
      instructor: req.user.id, // Use admin as instructor for now
      certificateId, // Manually generated certificate ID
      courseTitle,
      duration,
      score,
      template,
      completedAt: completedAt || new Date(),
      metadata: {
        totalLessons: 0,
        completedLessons: 0,
        averageScore: score || 0,
        timeSpent: 0
      }
    });

    await certificate.populate('student', 'username email');
    await certificate.populate('instructor', 'username profile.firstName profile.lastName');

    res.status(201).json({
      success: true,
      message: 'Certificate created successfully',
      data: { certificate }
    });
  } catch (error) {
    console.error('Create manual certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating certificate'
    });
  }
};

module.exports = {
  generateCertificate,
  getCertificates,
  getCertificate,
  updateCertificate,
  revokeCertificate,
  verifyCertificate,
  downloadCertificate,
  createManualCertificate
};
