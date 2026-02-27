const Chat = require('../models/Chat');
const User = require('../models/User');

// 🎯 MOST IMPORTANT CHECK
console.log("Live Chat System Ready - No AI");

// @desc    Send message (SIMPLE VERSION - NO AI)
// @route   POST /api/chat/send
// @access  Private
const sendMessage = async (req, res) => {
  try {
    console.log('📨 Live Chat Request:', {
      body: req.body,
      user: req.user?.id,
      headers: req.headers
    });

    const { message, sessionId } = req.body;
    const userId = req.user.id;
    
    // Get current user role
    const currentUserRole = req.user.role || 'student';
    console.log('👤 Current user role from token:', currentUserRole);

    // Validate input
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Message is required and must be a string'
      });
    }

    // Save user message
    const userMessage = new Chat({
      sender: userId,
      message: message.trim(),
      role: currentUserRole === 'admin' ? 'admin' : 'student',  // Set role based on current user
      messageType: currentUserRole === 'admin' ? 'admin' : 'user',  // Set messageType based on current user
      sessionId: sessionId || `session_${userId}_${Date.now()}`
    });

    await userMessage.save();
    console.log('✅ Message saved:', userMessage._id);
    console.log('👤 Saved message role:', userMessage.role);
    console.log('👤 Saved message sender:', userMessage.sender);

    // 🚀 EMIT SOCKET MESSAGE TO OTHERS (NOT SENDER)
    const io = req.app.get('io');
    if (io) {
      console.log('📡 Broadcasting message to others (not sender)...');
      // ✅ CORRECT: Broadcast to all except sender
      const broadcastMessage = {
        _id: userMessage._id,
        message: userMessage.message,
        role: userMessage.role,
        messageType: userMessage.messageType,
        sender: userMessage.sender,
        sessionId: userMessage.sessionId,
        createdAt: userMessage.createdAt
      };
      
      console.log('📡 Broadcasting message details:', broadcastMessage);
      req.app.get('io').emit("receiveMessage", broadcastMessage);
      console.log('✅ Message broadcasted to others');
    } else {
      console.log('❌ Socket.io not available');
    }

    res.json({
      success: true,
      data: userMessage,
    });

  } catch (error) {
    console.error('❌ FULL ERROR:', error);
    console.error('❌ ERROR STACK:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Message send error',
      error: error.message
    });
  }
};

// @desc    Get chat history
// @route   GET /api/chat/history
// @access  Private
const getChatHistory = async (req, res) => {
  try {
    console.log('🚀 getChatHistory called!');
    console.log('🚀 Request query:', req.query);
    console.log('🚀 Request user:', req.user);
    
    const { sessionId, page = 1, limit = 10 } = req.query;
    
    // Check if user exists
    if (!req.user || !req.user.id) {
      console.log('❌ User not authenticated');
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    const userId = req.user.id;

    console.log('🔍 User ID:', userId);
    console.log('🔍 Session ID:', sessionId);

    // Get ALL messages first to see what's available
    const allMessages = await Chat.find({}).lean().limit(5);
    console.log('📋 All messages in DB (sample):', allMessages.length);
    console.log('📋 Sample message structure:', allMessages[0]);

    // Get user's messages (without session filter first)
    const userMessages = await Chat.find({ sender: userId }).lean().limit(5);
    console.log('📋 User messages found:', userMessages.length);
    console.log('📋 User sessions:', [...new Set(userMessages.map(m => m.sessionId))]);

    // 🚀 GET ALL MESSAGES FOR NOW (DEBUGGING)
    const filter = {};  // No filter - get all messages

    console.log('🔍 Chat history filter:', filter);

    // Add lean() for better performance
    const chats = await Chat.find(filter)
      .select('message messageType role sender createdAt sessionId')  // Only select needed fields
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean()  // Use lean for better performance
      .exec();

    const total = await Chat.countDocuments(filter);

    console.log('📊 Found chats:', chats.length, 'of', total);
    console.log('📋 Sample chat:', chats[0]);

    const response = {
      success: true,
      data: {
        chats,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalMessages: total
        }
      }
    };

    console.log('📤 Sending response structure:', Object.keys(response));
    console.log('📤 Response success:', response.success);
    console.log('📤 Response data keys:', Object.keys(response.data));
    console.log('📤 Response data.chats length:', response.data.chats.length);
    
    res.json(response);
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat history'
    });
  }
};

// @desc    Clear chat history
// @route   DELETE /api/chat/clear
// @access  Private
const clearChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user.id;
    const currentUserRole = req.user.role || 'student';

    console.log('🗑️ Clearing chat history for user:', userId);
    console.log('🗑️ User role:', currentUserRole);
    console.log('🗑️ Session ID:', sessionId);

    let filter = {};

    if (currentUserRole === 'admin') {
      // Admin: Clear ALL messages (admin + student)
      console.log('🗑️ Admin clearing ALL messages');
      filter = {};  // No filter - delete everything
    } else {
      // Student: Clear only their own messages + AI responses
      console.log('🗑️ Student clearing their messages');
      filter = {
        $or: [
          { sender: userId },
          { messageType: 'ai' }
        ]
      };
      
      if (sessionId) {
        filter.sessionId = sessionId;
      } else {
        // Clear all chats for this student
        filter.sessionId = { $regex: `^session_${userId}` };
      }
    }

    console.log('🗑️ Delete filter:', filter);

    const deleteResult = await Chat.deleteMany(filter);
    console.log('🗑️ Deleted messages count:', deleteResult.deletedCount);

    res.status(200).json({
      success: true,
      message: 'Chat history cleared successfully',
      deletedCount: deleteResult.deletedCount
    });
  } catch (error) {
    console.error('❌ Clear chat history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear chat history'
    });
  }
};

// New Gemini Response Function Add Karo
const generateGeminiResponse = async (userMessage, userId, sessionId) => {
  try {
    console.log('🤖 Calling Gemini API for message:', userMessage);
    console.log('🔑 Gemini API Key:', process.env.GEMINI_API_KEY ? 'Present' : 'Missing');

    // Get user context
    const user = await User.findById(userId);
    
    // Get recent chat history for context
    const recentChats = await Chat.find({ sessionId })
      .sort({ createdAt: 1 }) // Chronological order for conversation
      .limit(10) // Get more history for better context
      .select('message messageType createdAt');

    console.log('📚 Chat history found:', recentChats.length, 'messages');

    // Build conversation context for Gemini
    let conversationHistory = '';
    if (recentChats && recentChats.length > 0) {
      recentChats.forEach(chat => {
        if (chat.messageType === 'user') {
          conversationHistory += `User: ${chat.message}\n`;
        } else if (chat.messageType === 'ai') {
          conversationHistory += `AI: ${chat.message}\n`;
        }
      });
    }

    // Create prompt with context
    const prompt = `You are a helpful AI Learning Assistant for an online education platform. Your name is EduBot. You help students with various topics.

IMPORTANT INSTRUCTIONS:
- Provide specific, accurate, and detailed answers to user questions
- If asked about programming, give actual code examples and explanations
- If asked about concepts, provide clear definitions and examples
- Be direct and helpful - don't give generic responses
- Use your knowledge to answer questions accurately
- If you don't know something, admit it politely
- Remember the conversation context and respond accordingly
- Be conversational and natural

Your expertise includes:
- Web Development (HTML, CSS, JavaScript, React, Node.js, Python)
- Mobile App Development (React Native, Flutter)
- Data Science (Python, Machine Learning, AI)
- UI/UX Design (Figma, Adobe XD)
- Business & Marketing
- Career Guidance
- Study Techniques
- Technical Support

Current Context:
- User: ${user?.profile?.firstName || 'Student'}
- Platform: Online Learning Management System

Conversation History:
${conversationHistory}

Current User Message: ${userMessage}

Respond naturally and give specific, helpful answers to the user's questions.`;

    console.log('📤 Sending to Gemini with context length:', prompt.length);

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest",
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiResponse = response.text();

    console.log('✅ Gemini response received:', aiResponse);
    return aiResponse;

  } catch (error) {
    console.error("Gemini Error:", error);
    return await generateFallbackResponse(userMessage, userId, sessionId);
  }
};

// Fallback Response Function (Original Logic)
const generateFallbackResponse = async (userMessage, userId, sessionId) => {
  try {
    // Get user context
    const user = await User.findById(userId);
    
    // Get recent chat history for context
    const recentChats = await Chat.find({ sessionId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('message messageType createdAt');

    // AI Response Logic (Original)
    let response = '';

    // Course-related queries
    if (userMessage.toLowerCase().includes('course') || 
        userMessage.toLowerCase().includes('learning') ||
        userMessage.toLowerCase().includes('study') ||
        userMessage.toLowerCase().includes('पढ़ाई')) {
      response = `I can help you find the perfect course! What subject are you interested in learning? I can recommend courses in:

🎓 **Popular Categories:**
• Web Development (React, Node.js, Python)
• Mobile App Development (React Native, Flutter)
• Data Science (Python, Machine Learning)
• UI/UX Design (Figma, Adobe XD)
• Business & Marketing (Digital Marketing, Analytics)

💡 **How can I assist you:**
• Course recommendations based on your goals
• Learning path suggestions
• Career guidance
• Skill assessment

What would you like to explore today?`;
    }
    
    // Help/Support queries
    else if (userMessage.toLowerCase().includes('help') || 
             userMessage.toLowerCase().includes('assist') ||
             userMessage.toLowerCase().includes('support') ||
             userMessage.toLowerCase().includes('मदद') ||
             userMessage.toLowerCase().includes('सहायता')) {
      response = `I'm here to help you succeed! I can assist you with:

🔹 **Technical Support:**
• Course enrollment issues
• Payment and billing problems  
• Account access problems
• Certificate download issues

🔹 **Learning Support:**
• Study planning and scheduling
• Progress tracking
• Resource recommendations
• Doubt clearing

🔹 **Platform Guidance:**
• Feature explanations
• Navigation help
• Best practices for learning

🔹 **Administrative Help:**
• Profile management
• Settings configuration
• Data privacy and security

What specific challenge are you facing today? I'll provide personalized solutions!`;
    }
    
    // Greeting
    else if (userMessage.toLowerCase().includes('नमस्ते') ||
             userMessage.toLowerCase().includes('हेलो') ||
             userMessage.toLowerCase().includes('hi') ||
             userMessage.toLowerCase().includes('hello') ||
             userMessage.toLowerCase().includes('hey')) {
      response = `Hello ${user?.profile?.firstName || 'there'}! 👋 I'm your AI Learning Assistant, ready to help you achieve your goals!

🚀 **What I can do for you:**
• Answer questions about courses and learning
• Provide study recommendations
• Help with technical issues
• Assist with career planning
• Offer learning resources and tips

💡 **Let's start with:**
• What brings you here today?
• Are you looking for a specific course?
• Do you need help with your current studies?
• Any challenges I can help you overcome?

I'm equipped with knowledge about web development, programming, data science, and more. Feel free to ask me anything - I'm here to support your learning journey! 🎓`;
    }
    
    // Default response
    else {
      response = `That's an excellent question! I'm here to provide personalized guidance. 

🎯 **How I can help you:**
• Recommend learning paths and resources
• Provide coding exercises and solutions
• Help with project planning and execution
• Offer career guidance and interview prep

💡 **Available Expertise:**
• Web Development (Frontend/Backend/Full-stack)
• Mobile Development & Cross-platform
• Data Science & Machine Learning
• Cloud & DevOps
• UI/UX Design Principles

What would you like to focus on today? I'm ready to dive deep into any topic! 🚀`;
    }

    return response;
  } catch (error) {
    console.error('Fallback Response Generation Error:', error);
    return 'I apologize, but I\'m still processing your request. Please try again in a moment.';
  }
};

// Fallback Response Handler
const sendFallbackResponse = async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const userId = req.user.id;

    // Save user message
    const userMessage = new Chat({
      sender: userId,
      message: message.trim(),
      messageType: 'user',
      sessionId: sessionId || `session_${userId}_${Date.now()}`
    });

    await userMessage.save();

    // Generate fallback response
    const aiResponse = await generateFallbackResponse(message, userId, sessionId);

    // Save AI response
    const aiMessage = new Chat({
      sender: null,
      message: aiResponse,
      messageType: 'ai',
      sessionId: userMessage.sessionId,
      context: {
        previousMessage: message,
        userId: userId
      }
    });

    await aiMessage.save();

    res.status(200).json({
      success: true,
      data: {
        userMessage: {
          _id: userMessage._id,
          message: userMessage.message,
          messageType: 'user',
          createdAt: userMessage.createdAt
        },
        aiMessage: {
          _id: aiMessage._id,
          message: aiMessage.message,
          messageType: 'ai',
          createdAt: aiMessage.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Fallback Response Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating response'
    });
  }
};

// @desc    Get all users for admin chat
// @route   GET /api/chat/users
// @access  Private
const getAllUsers = async (req, res) => {
  try {
    console.log('👥 Getting all users for admin chat');
    
    // Get all users from database (assuming you have a User model)
    const User = require('../models/User'); // Adjust path as needed
    
    const users = await User.find({}).select('id name email role createdAt').lean();
    
    console.log('👥 Found users:', users.length);
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('❌ Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users'
    });
  }
};

module.exports = {
  sendMessage,
  getChatHistory,
  clearChatHistory,
  getAllUsers
};
