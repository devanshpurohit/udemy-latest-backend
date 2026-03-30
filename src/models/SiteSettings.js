const mongoose = require('mongoose');

const SiteSettingsSchema = new mongoose.Schema({
  logoUrl: {
    type: String,
    default: '/logo.png'
  },
  footerContent: {
    type: String,
    default: 'UDEMY is a leading online learning platform dedicated to providing high-quality courses to students worldwide.'
  },
  siteName: {
    type: String,
    default: 'UDEMY'
  },
  contactEmail: String,
  contactPhone: String,
  address: String,
  socialLinks: {
    facebook: String,
    twitter: String,
    instagram: String,
    linkedin: String
  },
  bannerTitle: {
    type: String,
    default: 'Learn AI the Smart Way'
  },
  bannerSubtitle: {
    type: String,
    default: 'Simple, practical AI concepts designed for school students.'
  },
  bannerDescription: {
    type: String,
    default: 'Explore the basics of AI through guided lessons and real examples.Learn how artificial intelligence is shaping the world around us.'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Static method to get the singleton settings document
SiteSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('SiteSettings', SiteSettingsSchema);
