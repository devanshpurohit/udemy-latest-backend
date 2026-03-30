const Complaint = require('../models/Complaint');

// @desc    Create new complaint
// @route   POST /api/complaints
// @access  Public
exports.createComplaint = async (req, res) => {
    try {
        const { firstName, lastName, email, contactNumber, message } = req.body;

        if (!firstName || !lastName || !email || !message) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        const complaint = await Complaint.create({
            firstName,
            lastName,
            email,
            contactNumber,
            message
        });

        res.status(201).json({
            success: true,
            data: complaint,
            message: 'Complaint submitted successfully'
        });
    } catch (err) {
        console.error('Create complaint error:', err);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Get all complaints
// @route   GET /api/complaints
// @access  Private/Admin
exports.getComplaints = async (req, res) => {
    try {
        const complaints = await Complaint.find().sort('-createdAt');

        res.status(200).json({
            success: true,
            count: complaints.length,
            data: complaints
        });
    } catch (err) {
        console.error('Get complaints error:', err);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Delete complaint
// @route   DELETE /api/complaints/:id
// @access  Private/Admin
exports.deleteComplaint = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id);

        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        await complaint.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Complaint deleted successfully'
        });
    } catch (err) {
        console.error('Delete complaint error:', err);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};
