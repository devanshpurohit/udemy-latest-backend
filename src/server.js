const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users'); // Add user routes import
const courseRoutes = require('./routes/courses');
const studentRoutes = require('./routes/students');
const dashboardRoutes = require('./routes/dashboard');
const announcementRoutes = require('./routes/announcements');
const couponRoutes = require('./routes/coupons');
const certificateRoutes = require('./routes/certificates');
const adminRoutes = require('./routes/admin');
const statementRoutes = require('./routes/statements');
const chatRoutes = require('./routes/chat');
const publicRoutes = require('./routes/public');
const purchaseRoutes = require('./routes/purchase');
const reviewRoutes = require("./routes/reviewRoutes");
const aiCardRoutes = require('./routes/aiCard');
const siteSettingsRoutes = require('./routes/siteSettings');
const newsletterRoutes = require('./routes/newsletter');
const notificationRoutes = require('./routes/notifications');
const questionRoutes = require('./routes/questionRoutes');
const conversationRoutes = require('./routes/conversations');
const feedbackRoutes = require('./routes/feedbackRoutes');




const app = express();

/* =======================
   TRUST PROXY FOR RATE LIMITING
======================= */
app.set('trust proxy', 1);


/* =======================
   ✅ CORS — FIRST (MUST BE FIRST)
======================= */
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}));

// ✅ ALWAYS allow preflight
app.options('*', (req, res) => res.sendStatus(200));

/* =======================
   SECURITY
======================= */
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

/* =======================
   BODY PARSING
======================= */
app.use(express.json({ limit: '5000mb' }));
app.use(express.urlencoded({ extended: true, limit: '5000mb' }));

/* =======================
   RATE LIMIT (AFTER CORS)
======================= */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased from 100 to 1000 requests
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS', // 🔥 CRITICAL
  message: {
    success: false,
    message: 'Too many requests. Please wait 15 minutes before trying again.'
  }
});

app.use('/api', limiter);

// Separate rate limit for public routes (more lenient)
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // Even higher for public routes
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  message: {
    success: false,
    message: 'Too many requests. Please wait 15 minutes before trying again.'
  }
});

/* =======================
   ROUTES
======================= */
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes); // Add user routes
app.use('/api/courses', courseRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/statements', statementRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/public', publicLimiter, publicRoutes); // Apply rate limit then routes
app.use('/api', purchaseRoutes);
app.use("/api", reviewRoutes);
app.use('/api/ai-cards', aiCardRoutes);
app.use('/api/settings', siteSettingsRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/feedback', feedbackRoutes);

/* =======================
   STATIC FILES
======================= */
// Serve static files from uploads directory
const uploadsPath = path.join(__dirname, 'uploads');
console.log('Serving static files from:', uploadsPath);

// Configure static file options with CORS and security headers
const staticOptions = {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
};

app.use('/uploads', express.static(uploadsPath, staticOptions));

// Fallback for not found files in uploads
app.use('/uploads', (req, res) => {
  console.log('File not found in any uploads directory:', req.url);
  res.status(404).json({ error: 'File not found' });
});

/* =======================
   DATABASE
======================= */
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/udemy')
  .then(() => console.log('Connected to MongoDB: udemy'))
  .catch((err) => console.error('MongoDB connection error:', err));

/* =======================
   HEALTH
======================= */
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

/* =======================
   ERRORS
======================= */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const { Server } = require("socket.io");

// Start server
const PORT = process.env.PORT || 5002;
const BASE_URL = process.env.BASE_URL || 'http://localhost:5002';

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 API Base URL: ${BASE_URL}`);
});

// 🚀 STEP 4 — Backend Socket Setup
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  allowEIO3: true // Support older clients if any
});

// Store io in app for controllers to access
app.set('io', io);

const Conversation = require('./models/Conversation');
const Message = require('./models/Message');

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // 📡 Step 4: Join room
  socket.on("join", (userId) => {
    console.log(`👤 User ${userId} joined their room`);
    socket.join(userId);
  });

  // 💬 Step 5: Send message
  socket.on("sendMessage", async (data) => {
    try {
      console.log("Message received via socket:", data);
      const { senderId, receiverId, text, conversationId } = data;

      if (!text || !senderId || !receiverId || !conversationId) {
        console.error("❌ Invalid message data:", data);
        return;
      }

      // 1. Save message to DB
      const newMessage = new Message({
        conversationId,
        sender: senderId,
        text
      });
      await newMessage.save();

      // 2. Update conversation last message
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: text,
        lastMessageSender: senderId,
        updatedAt: Date.now()
      });

      // 3. Emit to receiver room
      io.to(receiverId).emit("receiveMessage", newMessage);

      // Also emit back to sender to confirm (or for multi-device sync)
      io.to(senderId).emit("receiveMessage", newMessage);

      console.log(`✅ Message sent from ${senderId} to ${receiverId}`);
    } catch (error) {
      console.error("❌ Socket sendMessage error:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});
