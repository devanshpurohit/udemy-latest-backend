const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Progress Schema for tracking course progress
const progressSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  completedLessons: [{
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    completedAt: {
      type: Date,
      default: Date.now
    },
    timeSpent: {
      type: Number, // in minutes
      default: 0
    }
  }],
  quizScores: [{
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    attemptedAt: {
      type: Date,
      default: Date.now
    }
  }],
  currentLesson: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  }
}, { _id: true });

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  role: {
    type: String,
    enum: ['admin', 'instructor', 'student'],
    default: 'student'
  },
  profile: {
    firstName: {
      type: String,
      default: ''
    },
    lastName: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      default: ''
    },
    countryCode: {
      type: String,
      default: '+91'
    },
    language: {
      type: String,
      default: 'English'
    },
    bio: {
      type: String,
      default: ''
    },
    profileImage: {
      type: String,
      default: "/boy.png"
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  otp: String,
  otpExpire: Date,
  enrolledCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  progress: [progressSchema],
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  cart: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  purchasedCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }]
}, {
  timestamps: true
});

// Add indexes for performance optimization
userSchema.index({ wishlist: 1 });
// Note: _id index is automatically created by MongoDB - no need to specify

// Hash password before saving
userSchema.pre('save', async function(next) {
    // Skip password hashing if password is not modified
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
};

// Get user profile method
userSchema.methods.getProfile = function() {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
    profile: this.profile,
    isActive: this.isActive,
    emailVerified: this.emailVerified,
    createdAt: this.createdAt
  };
};

// Progress tracking methods
userSchema.methods.enrollInCourse = function(courseId) {
  if (!this.enrolledCourses.includes(courseId)) {
    this.enrolledCourses.push(courseId);
    
    // Add progress tracking for this course
    const existingProgress = this.progress.find(p => p.courseId.toString() === courseId.toString());
    if (!existingProgress) {
      this.progress.push({
        courseId: courseId,
        completedLessons: [],
        quizScores: [],
        currentLesson: null,
        enrolledAt: new Date()
      });
    }
  }
  return this.save();
};

userSchema.methods.markLessonComplete = function(courseId, lessonId, timeSpent = 0) {
  const progress = this.progress.find(p => p.courseId.toString() === courseId.toString());
  if (progress) {
    const existingLesson = progress.completedLessons.find(l => l.lessonId.toString() === lessonId.toString());
    if (!existingLesson) {
      progress.completedLessons.push({
        lessonId: lessonId,
        completedAt: new Date(),
        timeSpent: timeSpent
      });
    } else {
      existingLesson.timeSpent += timeSpent;
    }
    progress.lastAccessedAt = new Date();
  }
  return this.save();
};

userSchema.methods.addQuizScore = function(courseId, lessonId, score) {
  const progress = this.progress.find(p => p.courseId.toString() === courseId.toString());
  if (progress) {
    // Remove previous attempt for this lesson if exists
    progress.quizScores = progress.quizScores.filter(q => q.lessonId.toString() !== lessonId.toString());
    
    // Add new quiz score
    progress.quizScores.push({
      lessonId: lessonId,
      score: score,
      attemptedAt: new Date()
    });
    
    progress.lastAccessedAt = new Date();
  }
  return this.save();
};

userSchema.methods.getCourseProgress = function(courseId) {
  const progress = this.progress.find(p => p.courseId.toString() === courseId.toString());
  return progress || null;
};

userSchema.methods.getProgressPercentage = function(courseId, totalLessons) {
  const progress = this.getCourseProgress(courseId);
  if (!progress || totalLessons === 0) return 0;
  
  return Math.round((progress.completedLessons.length / totalLessons) * 100);
};

userSchema.methods.setCurrentLesson = function(courseId, lessonId) {
  const progress = this.progress.find(p => p.courseId.toString() === courseId.toString());
  if (progress) {
    progress.currentLesson = lessonId;
    progress.lastAccessedAt = new Date();
  }
  return this.save();
};

module.exports = mongoose.model('User', userSchema);

// Note: Indexes are automatically created by MongoDB
// No need for explicit index creation in this file
