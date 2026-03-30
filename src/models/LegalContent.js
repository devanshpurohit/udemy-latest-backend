const mongoose = require('mongoose');

const LegalContentSchema = new mongoose.Schema({
  privacyPolicy: {
    type: String,
    default: 'Privacy Policy content here...'
  },
  termsConditions: {
    type: String,
    default: 'Terms and Conditions content here...'
  },
  cookiesPolicy: {
    type: String,
    default: 'Cookies Policy content here...'
  },
  licenseAgreement: {
    type: String,
    default: 'License Agreement content here...'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Static method to get the singleton legal content document
LegalContentSchema.statics.getContent = async function() {
  let content = await this.findOne();
  if (!content) {
    content = await this.create({});
  }
  return content;
};

module.exports = mongoose.model('LegalContent', LegalContentSchema);
