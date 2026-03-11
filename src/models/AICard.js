const mongoose = require('mongoose');

const aiCardSchema = new mongoose.Schema({
  cardNumber: {
    type: String,
    required: true,
    unique: true
  },
  cvv: {
    type: String,
    required: true
  },
  expiryDate: {
    type: String,
    default: "12/29" // Default expiry for generated cards
  },
  cardHolder: {
    type: String,
    default: "AI Generated"
  },
  status: {
    type: String,
    enum: ["active", "inuse", "inactive"],
    default: "active"
  },
  usedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('AICard', aiCardSchema);
