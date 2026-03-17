const SiteSettings = require('../models/SiteSettings');

// @desc    Get site settings
// @route   GET /api/public/settings
// @access  Public
const getSettings = async (req, res) => {
  try {
    const settings = await SiteSettings.getSettings();
    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching site settings'
    });
  }
};

// @desc    Update site settings
// @route   PUT /api/admin/settings
// @access  Private (Admin)
const updateSettings = async (req, res) => {
  try {
    const settings = await SiteSettings.getSettings();
    
    // Update logo if file is uploaded
    if (req.file) {
      settings.logoUrl = `/uploads/others/${req.file.filename}`;
    }

    // Update other fields
    const { footerContent, siteName, contactEmail, contactPhone, address, facebook, twitter, instagram, linkedin } = req.body;
    
    if (footerContent !== undefined) settings.footerContent = footerContent;
    if (siteName !== undefined) settings.siteName = siteName;
    if (contactEmail !== undefined) settings.contactEmail = contactEmail;
    if (contactPhone !== undefined) settings.contactPhone = contactPhone;
    if (address !== undefined) settings.address = address;
    
    if (settings.socialLinks) {
        if (facebook !== undefined) settings.socialLinks.facebook = facebook;
        if (twitter !== undefined) settings.socialLinks.twitter = twitter;
        if (instagram !== undefined) settings.socialLinks.instagram = instagram;
        if (linkedin !== undefined) settings.socialLinks.linkedin = linkedin;
    } else {
        settings.socialLinks = { facebook, twitter, instagram, linkedin };
    }

    settings.updatedAt = Date.now();
    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Site settings updated successfully',
      data: settings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating site settings'
    });
  }
};

module.exports = {
  getSettings,
  updateSettings
};
