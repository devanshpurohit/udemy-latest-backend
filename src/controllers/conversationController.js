const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

// @desc    Create or get conversation between 2 users
// @route   POST /api/conversations
// @access  Private
const createOrGetConversation = async (req, res) => {
    try {
        const { receiverId } = req.body;
        const senderId = req.user.id;

        console.log('🔍 [DEBUG] createOrGetConversation hit:', { 
            senderId, 
            receiverId,
            body: req.body 
        });

        let receiver = receiverId;

        if (!receiver) {
            console.log('🔍 [DEBUG] No receiverId provided, looking for an admin...');
            // 1. Try to find an active admin
            let admin = await User.findOne({ role: 'admin', isActive: true });
            
            // 2. Fallback: Find ANY admin if no "active" one found
            if (!admin) {
                console.log('⚠️ [DEBUG] No "active" admin found, falling back to any admin...');
                admin = await User.findOne({ role: 'admin' });
            }

            if (!admin) {
                console.log('❌ [DEBUG] ABSOLUTELY NO admin found in DB');
                return res.status(404).json({ success: false, message: 'No support admin found. Please try again later.' });
            }
            receiver = admin._id;
            console.log('🔍 [DEBUG] Admin resolved for chat:', receiver);
        }

        // Find conversation where both members exist
        let conversation = await Conversation.findOne({
            members: { $all: [senderId, receiver] }
        }).populate('members', 'id profile email role username');

        if (!conversation) {
            console.log('🔍 [DEBUG] No existing conversation found, creating new one...');
            conversation = new Conversation({
                members: [senderId, receiver]
            });
            await conversation.save();
            await conversation.populate('members', 'id profile email role username');
            console.log('✅ [DEBUG] New conversation created:', conversation._id);
        } else {
            console.log('🔍 [DEBUG] Existing conversation found:', conversation._id);
        }

        res.json({ success: true, data: conversation });
    } catch (error) {
        console.error('❌ [DEBUG] Create/Get Conversation Error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Get all conversations for the current user
// @route   GET /api/conversations
// @access  Private
const getConversations = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const conversations = await Conversation.find({
            members: userId
        })
        .populate('members', 'id profile email role username')
        .sort({ updatedAt: -1 });

        res.json({ success: true, data: conversations });
    } catch (error) {
        console.error('Get Conversations Error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Get messages for a conversation
// @route   GET /api/conversations/:conversationId/messages
// @access  Private
const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const messages = await Message.find({ conversationId })
            .sort({ createdAt: 1 });

        res.json({ success: true, data: messages });
    } catch (error) {
        console.error('Get Messages Error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

module.exports = {
    createOrGetConversation,
    getConversations,
    getMessages
};
