const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Course description is required'],
    maxlength: [5000, 'Description cannot exceed 5000 characters']
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
  previewVideo: {
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
  lessons: [{
    title: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    videoUrl: {
      type: String
    },
    duration: {
      type: Number // in minutes
    },
    order: {
      type: Number,
      required: true
    },
    isPreview: {
      type: Boolean,
      default: false
    },
    resources: [{
      name: String,
      url: String,
      type: {
        type: String,
        enum: ['pdf', 'video', 'link', 'other']
      }
    }]
  }],
  requirements: [{
    type: String
  }],
  whatYouWillLearn: [{
    type: String
  }],
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
  totalEnrollments: {
    type: Number,
    default: 0
  },
  totalRevenue: {
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
  }]
}, {
  timestamps: true
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
  this.totalEnrollments = this.enrolledStudents.length;
};

// Update total revenue
courseSchema.methods.updateTotalRevenue = function() {
  const actualPrice = this.discountedPrice || this.price;
  this.totalRevenue = this.totalEnrollments * actualPrice;
};

// Index for search
courseSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Course', courseSchema);
