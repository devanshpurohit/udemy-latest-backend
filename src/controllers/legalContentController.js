const LegalContent = require('../models/LegalContent');

// @desc    Get legal content
// @route   GET /api/legal
// @access  Public
const getLegalContent = async (req, res) => {
  try {
    const content = await LegalContent.getContent();
    res.status(200).json({
      success: true,
      data: content
    });
  } catch (error) {
    console.error('Get legal content error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching legal content'
    });
  }
};

// @desc    Update legal content
// @route   PUT /api/legal
// @access  Private (Admin)
const updateLegalContent = async (req, res) => {
  try {
    const content = await LegalContent.getContent();
    
    const { privacyPolicy, termsConditions, cookiesPolicy, licenseAgreement } = req.body;
    
    if (privacyPolicy !== undefined) content.privacyPolicy = privacyPolicy;
    if (termsConditions !== undefined) content.termsConditions = termsConditions;
    if (cookiesPolicy !== undefined) content.cookiesPolicy = cookiesPolicy;
    if (licenseAgreement !== undefined) content.licenseAgreement = licenseAgreement;
    
    content.updatedAt = Date.now();
    await content.save();

    res.status(200).json({
      success: true,
      message: 'Legal content updated successfully',
      data: content
    });
  } catch (error) {
    console.error('Update legal content error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating legal content'
    });
  }
};

module.exports = {
  getLegalContent,
  updateLegalContent
};
