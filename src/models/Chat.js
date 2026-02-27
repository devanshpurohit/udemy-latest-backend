const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.messageType === 'user';
    }
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  messageType: {
    type: String,
    enum: ['user', 'admin', 'ai'],
    default: 'user'
  },
  sessionId: {
    type: String,
    required: true
  },
  context: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for faster queries
chatSchema.index({ sessionId: 1, createdAt: -1 });

module.exports = mongoose.model('Chat', chatSchema);
