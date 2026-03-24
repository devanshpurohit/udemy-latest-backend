const Question = require('../models/Question');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

// @desc    Create a new question
// @route   POST /api/questions
// @access  Private (Student)
const createQuestion = async (req, res) => {
  try {
    const { question } = req.body;
    const userId = req.user.id;

    if (!question || question.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Question content is required'
      });
    }

    const newQuestion = new Question({
      user: userId,
      question: question.trim()
    });

    await newQuestion.save();

    // Populate user info for socket
    const populatedQuestion = await Question.findById(newQuestion._id)
      .populate('user', 'name email profile.firstName profile.lastName');

    // 🚀 EMIT SOCKET MESSAGE TO ADMINS
    const io = req.app.get('io');
    if (io) {
      console.log('📡 Broadcasting new question to admins...');
      io.emit("new_question", populatedQuestion);
    }

    res.status(201).json({
      success: true,
      data: populatedQuestion
    });

  } catch (error) {
    console.error('❌ Create Question Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create question',
      error: error.message
    });
  }
};
// @access  Private (Student)
const getMyQuestions = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 1. Fetch regular questions from Question model
    const questions = await Question.find({ user: userId }).sort({ createdAt: -1 }).lean();

    // 2. Fetch chat history as "Questions" from the Message system
    // Find all conversations where user is a member
    const userConvos = await Conversation.find({ 
      members: userId 
    }).select('_id').lean();
    
    const convoIds = userConvos.map(c => c._id);
    
    // Get all messages for these conversations
    const messages = await Message.find({ 
      conversationId: { $in: convoIds } 
    }).sort({ createdAt: 1 }).lean();

    const chatQuestions = [];
    for (let i = 0; i < messages.length; i++) {
        // A "Question" is a message sent by the user
        // We ensure we don't pick up the same message twice OR treat admin messages as questions
        if (messages[i].sender.toString() === userId.toString()) {
            
            // Look for the next message - if it's NOT from the user, it's an answer
            let answer = null;
            let nextMsg = messages[i + 1];
            
            if (nextMsg && 
                nextMsg.conversationId.toString() === messages[i].conversationId.toString() && 
                nextMsg.sender.toString() !== userId.toString()) {
              answer = nextMsg.text;
            }

            chatQuestions.push({
              _id: messages[i]._id,
              user: userId,
              question: messages[i].text,
              answer: answer,
              status: answer ? 'answered' : 'pending',
              isPublic: false,
              createdAt: messages[i].createdAt,
              isChat: true // Flag for UI
            });
        }
    }

    // 3. Merge and sort all by date
    const allQuestions = [...questions, ...chatQuestions].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json({
      success: true,
      data: allQuestions
    });
  } catch (error) {
    console.error('❌ Get My Questions Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your questions'
    });
  }
};

// @desc    Get all public questions
// @route   GET /api/questions/public
// @access  Public
const getPublicQuestions = async (req, res) => {
  try {
    // Show all questions by default as requested by the user
    // "kisi bhi user ne koi bhi question pucha ho usme dikhna ciaye"
    const questions = await Question.find()
      .populate('user', 'name profile.firstName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: questions
    });
  } catch (error) {
    console.error('❌ Get Public Questions Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch FAQ questions'
    });
  }
};

// @desc    Answer a question (Admin only)
// @route   PUT /api/questions/:id/answer
// @access  Private (Admin)
const answerQuestion = async (req, res) => {
  try {
    const { answer, isPublic = false } = req.body;
    const questionId = req.params.id;

    if (!answer || answer.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Answer content is required'
      });
    }

    const question = await Question.findById(questionId);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    question.answer = answer.trim();
    question.status = 'answered';
    question.isPublic = isPublic;

    await question.save();

    // Populate for socket
    const updatedQuestion = await Question.findById(questionId)
      .populate('user', 'name email');

    // 🚀 EMIT SOCKET MESSAGE TO USER
    const io = req.app.get('io');
    if (io) {
      console.log('📡 Broadcasting answer to user:', question.user);
      io.emit("answer_received", updatedQuestion);
    }

    res.json({
      success: true,
      data: updatedQuestion
    });

  } catch (error) {
    console.error('❌ Answer Question Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save answer'
    });
  }
};

// @desc    Get all pending questions (Admin only)
// @route   GET /api/questions/admin/pending
// @access  Private (Admin)
const getPendingQuestions = async (req, res) => {
  try {
    const questions = await Question.find({ status: 'pending' })
      .populate('user', 'name email profile.firstName profile.lastName')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      data: questions
    });
  } catch (error) {
    console.error('❌ Get Pending Questions Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending questions'
    });
  }
};

// @desc    Create a new FAQ (Admin only)
// @route   POST /api/questions/admin/create
// @access  Private (Admin)
const createFAQ = async (req, res) => {
  try {
    const { question, answer, isPublic = true } = req.body;
    const adminId = req.user.id;

    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        message: 'Both question and answer are required'
      });
    }

    const newQuestion = new Question({
      user: adminId,
      question: question.trim(),
      answer: answer.trim(),
      status: 'answered',
      isPublic: isPublic
    });

    await newQuestion.save();

    const populatedQuestion = await Question.findById(newQuestion._id)
      .populate('user', 'name email profile.firstName');

    // 🚀 EMIT SOCKET MESSAGE (Optional, broad notification)
    const io = req.app.get('io');
    if (io) {
      io.emit("new_faq", populatedQuestion);
      // Also emit to public faq list if relevant
      io.emit("answer_received", populatedQuestion);
    }

    res.status(201).json({
      success: true,
      message: 'FAQ created successfully',
      data: populatedQuestion
    });
  } catch (error) {
    console.error('❌ Create FAQ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create FAQ',
      error: error.message
    });
  }
};

module.exports = {
  createQuestion,
  getMyQuestions,
  getPublicQuestions,
  answerQuestion,
  getPendingQuestions,
  createFAQ
};
