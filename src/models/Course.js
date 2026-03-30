const mongoose = require('mongoose');

// Quiz Schema
const quizSchema = new mongoose.Schema({
  question: {
    en: { type: String, trim: true },
    kn: { type: String, trim: true }
  },
  options: [{
    en: { type: String, trim: true },
    kn: { type: String, trim: true }
  }],
  correctAnswer: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: true });

// Lesson Schema
const lessonSchema = new mongoose.Schema({
  title: {
    en: { type: String, trim: true },
    kn: { type: String, trim: true }
  },
  description: {
    en: { type: String, trim: true },
    kn: { type: String, trim: true }
  },
  videoUrl: {
    en: { type: String, trim: true },
    kn: { type: String, trim: true }
  },
  duration: {
    type: Number, // in minutes
    required: true,
    min: 1
  },
  order: {
    type: Number,
    required: true
  },
  isPreview: {
    type: Boolean,
    default: false
  },
  quizzes: [quizSchema],
  resources: [{
    name: String,
    url: String,
    type: {
      type: String,
      enum: ['pdf', 'video', 'link', 'other']
    }
  }]
}, { _id: true });

// Section Schema
const sectionSchema = new mongoose.Schema({
  title: {
    en: { type: String, trim: true },
    kn: { type: String, trim: true }
  },
  description: {
    en: { type: String, trim: true },
    kn: { type: String, trim: true }
  },
  lessons: [lessonSchema],
  order: {
    type: Number,
    required: true
  }
}, { _id: true });

const courseSchema = new mongoose.Schema({
  title: {
    en: { type: String, required: [true, 'English title is required'], trim: true },
    kn: { type: String, trim: true }
  },
  description: {
    en: { type: String, required: [true, 'English description is required'] },
    kn: { type: String }
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['development', 'business', 'design', 'marketing', 'it-software', 'personal-development', 'health-fitness', 'music', 'academics']
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  discountedPrice: {
    type: Number,
    min: [0, 'Discounted price cannot be negative']
  },
  sections: [sectionSchema],
  sections_kn: [sectionSchema],
  previewVideo: {
    type: String
  },
  previewVideo_kn: {
    type: String
  },
  thumbnail: {
    type: String,
    default: ''
  },
  courseImage: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: 'English'
  },
  duration: {
    type: Number, // in months
    required: true,
    min: [1, 'Duration must be at least 1 month'],
    max: [24, 'Duration cannot exceed 24 months']
  },
  requirements: {
    en: [{ type: String, trim: true }],
    kn: [{ type: String, trim: true }]
  },
  whatYouWillLearn: {
    en: [{ type: String, trim: true }],
    kn: [{ type: String, trim: true }]
  },
  tags: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  enrolledStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  ratings: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    review: {
      type: String
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  numReviews: {
    type: Number,
    default: 0
  },
  totalEnrollments: {
    type: Number,
    default: 0
  },
  totalRevenue: {
    type: Number,
    default: 0
  },
  totalLessons: {
    type: Number,
    default: 0
  },
  totalSections: {
    type: Number,
    default: 0
  },
  certificate: {
    enabled: {
      type: Boolean,
      default: true
    },
    template: {
      type: String
    }
  },
  currentStep: {
    type: Number,
    default: 1
  },
  completedSteps: [{
    type: Number
  }],
  resources: [{
    name: String,
    url: String,
    type: {
      type: String,
      enum: ['pdf', 'video', 'link', 'other']
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add indexes for performance optimization
courseSchema.index({ title: 1 });
courseSchema.index({ status: 1 });
// Note: _id index is automatically created by MongoDB - no need to specify

// Methods for sections, lessons, and quizzes
courseSchema.methods.addSection = function(sectionData) {
  const section = {
    ...sectionData,
    order: this.sections.length,
    lessons: []
  };
  this.sections.push(section);
  return this.save();
};

courseSchema.methods.addLesson = function(sectionId, lessonData) {
  const section = this.sections.id(sectionId);
  if (!section) {
    throw new Error('Section not found');
  }
  
  const lesson = {
    ...lessonData,
    order: section.lessons.length,
    quizzes: []
  };
  
  section.lessons.push(lesson);
  return this.save();
};

courseSchema.methods.addQuiz = function(sectionId, lessonId, quizData) {
  const section = this.sections.id(sectionId);
  if (!section) {
    throw new Error('Section not found');
  }
  
  const lesson = section.lessons.id(lessonId);
  if (!lesson) {
    throw new Error('Lesson not found');
  }
  
  lesson.quizzes.push(quizData);
  return this.save();
};

courseSchema.methods.getLessonById = function(lessonId) {
  for (const section of this.sections) {
    const lesson = section.lessons.id(lessonId);
    if (lesson) {
      return lesson;
    }
  }
  return null;
};

// Virtual for course statistics
courseSchema.virtual('stats').get(function() {
  const sections = this.sections || [];
  const enrolledStudents = this.enrolledStudents || [];
  
  return {
    totalSections: sections.length,
    totalLessons: sections.reduce((total, section) => total + (section.lessons ? section.lessons.length : 0), 0),
    totalDuration: sections.reduce((total, section) => {
      return total + (section.lessons ? section.lessons.reduce((lessonTotal, lesson) => lessonTotal + (lesson.duration || 0), 0) : 0);
    }, 0),
    totalQuizzes: sections.reduce((total, section) => {
      return total + (section.lessons ? section.lessons.reduce((lessonTotal, lesson) => lessonTotal + (lesson.quizzes ? lesson.quizzes.length : 0), 0) : 0);
    }, 0),
    enrolledCount: enrolledStudents.length
  };
});

courseSchema.virtual('students').get(function() {
  return this.totalEnrollments || (this.enrolledStudents ? this.enrolledStudents.length : 0);
});

// Pre-save middleware to calculate total duration
courseSchema.pre('save', function(next) {
  let totalDuration = 0;
  let totalLessons = 0;
  
  if (this.sections && Array.isArray(this.sections)) {
    this.totalSections = this.sections.length;
    this.sections.forEach(section => {
      if (section.lessons && Array.isArray(section.lessons)) {
        totalLessons += section.lessons.length;
        section.lessons.forEach(lesson => {
          totalDuration += (lesson.duration || 0);
        });
      }
    });
  }

  this.totalLessons = totalLessons;
  
  // Update duration field if not set or zero
  if (!this.duration || this.duration === 0) {
    this.duration = Math.ceil(totalDuration / (60 * 8 * 30)); // Convert minutes to months (8h/day, 30 days/month)
    if (this.duration === 0) this.duration = 1; // Minimum 1 month
  }
  
  next();
});

// Calculate average rating
courseSchema.methods.calculateAverageRating = function() {
  if (this.ratings.length === 0) {
    this.averageRating = 0;
    return;
  }
  
  const sum = this.ratings.reduce((acc, rating) => acc + rating.rating, 0);
  this.averageRating = sum / this.ratings.length;
};

// Update total enrollments
courseSchema.methods.updateTotalEnrollments = function() {
  this.totalEnrollments = (this.enrolledStudents && Array.isArray(this.enrolledStudents)) ? this.enrolledStudents.length : 0;
};

// Update total revenue
courseSchema.methods.updateTotalRevenue = function() {
  const actualPrice = this.discountedPrice || this.price;
  this.totalRevenue = this.totalEnrollments * actualPrice;
};

// Index for search
courseSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Course', courseSchema);

// Note: Indexes are automatically created by MongoDB
// No need for explicit index creation in this file
