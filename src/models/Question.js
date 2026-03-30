const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  question: {
    type: String,
    required: [true, 'Question is required'],
    trim: true,
    maxlength: [1000, 'Question cannot exceed 1000 characters']
  },
  answer: {
    type: String,
    trim: true,
    maxlength: [2000, 'Answer cannot exceed 2000 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'answered'],
    default: 'pending'
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  category: {
    type: String,
    default: 'General'
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: false
  }
}, {
  timestamps: true
});

// Index for faster queries
questionSchema.index({ user: 1, status: 1 });
questionSchema.index({ isPublic: 1 });

module.exports = mongoose.model('Question', questionSchema);
