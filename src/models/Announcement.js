const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Announcement title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Announcement content is required'],
    maxlength: [5000, 'Content cannot exceed 5000 characters']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['general', 'course_update', 'system_maintenance', 'new_feature', 'urgent'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  targetAudience: {
    type: String,
    enum: ['all', 'students', 'instructors', 'admins'],
    default: 'all'
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['published', 'draft', 'archive'],
    default: 'published'
  },
  scheduledFor: {
    type: Date
  },
  expiresAt: {
    type: Date
  },
  attachments: [{
    filename: String,
    originalName: String,
    url: String,
    size: Number,
    mimeType: String
  }],
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Index for active announcements
announcementSchema.index({ isActive: 1, scheduledFor: 1, expiresAt: 1 });

// Method to check if announcement is currently active
announcementSchema.methods.isCurrentlyActive = function() {
  const now = new Date();
  
  if (!this.isActive) return false;
  
  if (this.scheduledFor && this.scheduledFor > now) return false;
  
  if (this.expiresAt && this.expiresAt < now) return false;
  
  return true;
};

// Method to mark as read by user
announcementSchema.methods.markAsRead = function(userId) {
  const alreadyRead = this.readBy.some(
    read => read.user.toString() === userId.toString()
  );
  
  if (!alreadyRead) {
    this.readBy.push({ user: userId });
  }
};

module.exports = mongoose.model('Announcement', announcementSchema);
