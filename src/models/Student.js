const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  enrolledCourses: [{
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    completedLessons: [{
      lesson: {
        type: mongoose.Schema.Types.ObjectId
      },
      completedAt: {
        type: Date,
        default: Date.now
      }
    }],
    lastAccessedAt: {
      type: Date
    },
    completedAt: {
      type: Date
    },
    certificate: {
      issued: {
        type: Boolean,
        default: false
      },
      issuedAt: {
        type: Date
      },
      certificateUrl: {
        type: String
      }
    }
  }],
  learningStats: {
    totalCoursesEnrolled: {
      type: Number,
      default: 0
    },
    totalCoursesCompleted: {
      type: Number,
      default: 0
    },
    totalLearningTime: {
      type: Number, // in minutes
      default: 0
    },
    averageCompletionRate: {
      type: Number,
      default: 0
    }
  },
  preferences: {
    learningGoals: [{
      type: String
    }],
    interests: [{
      type: String
    }],
    timeCommitment: {
      type: String,
      enum: ['casual', 'regular', 'intensive'],
      default: 'regular'
    }
  },
  achievements: [{
    type: {
      type: String,
      enum: ['first_course', 'course_completed', 'streak_7_days', 'streak_30_days', 'top_performer']
    },
    earnedAt: {
      type: Date,
      default: Date.now
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed
    }
  }],
  notes: [{
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    lesson: {
      type: mongoose.Schema.Types.ObjectId
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Number // video timestamp in seconds
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Update learning stats
studentSchema.methods.updateLearningStats = function() {
  this.learningStats.totalCoursesEnrolled = this.enrolledCourses.length;
  this.learningStats.totalCoursesCompleted = this.enrolledCourses.filter(
    course => course.progress === 100
  ).length;
  
  if (this.learningStats.totalCoursesEnrolled > 0) {
    this.learningStats.averageCompletionRate = 
      (this.learningStats.totalCoursesCompleted / this.learningStats.totalCoursesEnrolled) * 100;
  }
};

// Calculate course progress
studentSchema.methods.calculateCourseProgress = function(courseId) {
  const enrolledCourse = this.enrolledCourses.find(
    course => course.course.toString() === courseId.toString()
  );
  
  if (!enrolledCourse) return 0;
  
  // This would need to be calculated based on total lessons in the course
  // For now, we'll use the stored progress
  return enrolledCourse.progress;
};

module.exports = mongoose.model('Student', studentSchema);
