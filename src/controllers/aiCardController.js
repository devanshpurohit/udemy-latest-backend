const AICard = require('../models/AICard');

// @desc    Generate random AI Card
// @route   POST /api/ai-cards/generate
// @access  Private (Admin)
const generateCard = async (req, res) => {
  try {
    // Generate 12 digit random card number
    const cardNumber = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    
    // Generate 3 digit random CVV
    const cvv = Math.floor(100 + Math.random() * 900).toString();

    const newCard = await AICard.create({
      cardNumber,
      cvv
    });

    res.status(201).json({
      success: true,
      message: 'Card generated successfully',
      data: newCard
    });
  } catch (error) {
    console.error('Error generating AI card:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating card'
    });
  }
};

// @desc    Get all AI Cards
// @route   GET /api/ai-cards
// @access  Private (Admin)
const getAllCards = async (req, res) => {
  try {
    const cards = await AICard.find().sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: cards
    });
  } catch (error) {
    console.error('Error fetching AI cards:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching cards'
    });
  }
};

// @desc    Verify AI Card (Public)
// @route   POST /api/ai-cards/verify
// @access  Public
const verifyCard = async (req, res) => {
  try {
    const { cardNumber, cvv } = req.body;

    const card = await AICard.findOne({ cardNumber, cvv });

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Invalid Card Credentials'
      });
    }

    if (card.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Card is already ${card.status}`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Card verified'
    });
  } catch (error) {
    console.error('Verify card error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during card verification'
    });
  }
};

// @desc    Delete AI Card
// @route   DELETE /api/ai-cards/:id
// @access  Private (Admin)
const deleteCard = async (req, res) => {
  try {
    const card = await AICard.findById(req.params.id);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    await AICard.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Card deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting AI card:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting card'
    });
  }
};

module.exports = {
  generateCard,
  getAllCards,
  verifyCard,
  deleteCard
};

