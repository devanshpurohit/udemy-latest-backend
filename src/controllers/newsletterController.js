const Newsletter = require('../models/Newsletter');

// @desc    Subscribe to newsletter
// @route   POST /api/newsletter/subscribe
// @access  Public
exports.subscribe = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an email'
            });
        }

        // Check if subscriber already exists
        let subscriber = await Newsletter.findOne({ email });

        if (subscriber) {
            return res.status(400).json({
                success: false,
                message: 'This email is already subscribed'
            });
        }

        subscriber = await Newsletter.create({ email });

        res.status(201).json({
            success: true,
            data: subscriber,
            message: 'Successfully subscribed to newsletter'
        });
    } catch (err) {
        console.error('Newsletter subscribe error:', err);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Get all subscribers
// @route   GET /api/newsletter
// @access  Private/Admin
exports.getSubscribers = async (req, res) => {
    try {
        const subscribers = await Newsletter.find().sort('-createdAt');

        res.status(200).json({
            success: true,
            count: subscribers.length,
            data: subscribers
        });
    } catch (err) {
        console.error('Get subscribers error:', err);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};
