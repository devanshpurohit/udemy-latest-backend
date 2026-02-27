const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  certificateId: {
    type: String,
    required: true,
    unique: true
  },
  issuedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    required: true
  },
  studentName: {
    type: String,
    required: false // Make optional for manual certificates
  },
  courseTitle: {
    type: String,
    required: true
  },
  instructorName: {
    type: String,
    required: false // Make optional for manual certificates
  },
  duration: {
    type: String, // e.g., "6 weeks", "30 hours"
    required: true
  },
  grade: {
    type: String,
    enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'Pass'],
    default: 'Pass'
  },
  score: {
    type: Number,
    min: 0,
    max: 100
  },
  template: {
    type: String,
    enum: ['modern', 'classic', 'minimal', 'professional'],
    default: 'modern'
  },
  certificateUrl: {
    type: String
  },
  qrCodeUrl: {
    type: String
  },
  verificationUrl: {
    type: String
  },
  isRevoked: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'revoked'],
    default: 'active'
  },
  revokedAt: {
    type: Date
  },
  revokedReason: {
    type: String
  },
  metadata: {
    totalLessons: Number,
    completedLessons: Number,
    averageScore: Number,
    timeSpent: Number // in minutes
  }
}, {
  timestamps: true
});

// Index for student and course lookup
certificateSchema.index({ student: 1, course: 1 }, { unique: true });

// Pre-save middleware to generate certificate ID
certificateSchema.pre('save', function(next) {
  if (!this.certificateId) {
    // Generate unique certificate ID
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    this.certificateId = `CERT-${timestamp}-${random}`.toUpperCase();
  }
  next();
});

// Method to generate verification URL
certificateSchema.methods.generateVerificationUrl = function(baseUrl) {
  this.verificationUrl = `${baseUrl}/verify-certificate/${this.certificateId}`;
  return this.verificationUrl;
};

// Method to revoke certificate
certificateSchema.methods.revoke = function(reason) {
  this.isRevoked = true;
  this.revokedAt = new Date();
  this.revokedReason = reason;
};

// Static method to verify certificate
certificateSchema.statics.verifyCertificate = async function(certificateId) {
  const certificate = await this.findOne({ 
    certificateId: certificateId.toUpperCase(),
    isRevoked: false 
  })
  .populate('student', 'username email')
  .populate('course', 'title')
  .populate('instructor', 'username profile.firstName profile.lastName');
  
  return certificate;
};

module.exports = mongoose.model('Certificate', certificateSchema);
