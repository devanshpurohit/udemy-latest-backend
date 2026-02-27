const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

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

const app = express();

/* =======================
   SECURITY
======================= */
app.use(helmet());

/* =======================
   ✅ CORS — FIRST
======================= */
app.use(
  cors({
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://yourdomain.com', 'https://www.yourdomain.com'] 
      : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ✅ ALWAYS allow preflight
app.options('*', (req, res) => res.sendStatus(200));

/* =======================
   BODY PARSING
======================= */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
   CORS
======================= */
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

/* =======================
   STATIC FILES
======================= */
// Serve static files from uploads directory (absolute path)
const uploadsPath = path.resolve(__dirname, '..', 'uploads');
console.log('Serving static files from:', uploadsPath);
console.log('Uploads directory exists:', require('fs').existsSync(uploadsPath));

// Also serve from src/uploads for student images
const srcUploadsPath = path.resolve(__dirname, 'src', 'uploads');
console.log('Also serving from:', srcUploadsPath);
console.log('Src uploads directory exists:', require('fs').existsSync(srcUploadsPath));

// Add a simple file server middleware with proper URL decoding
app.use('/uploads', (req, res, next) => {
    // Decode the URL to handle spaces and special characters
    const decodedPath = decodeURIComponent(req.path);
    
    // Try main uploads directory first
    let filePath = path.join(uploadsPath, decodedPath.replace('/uploads', ''));
    
    // If not found in main uploads, try src/uploads
    if (!require('fs').existsSync(filePath)) {
        filePath = path.join(srcUploadsPath, decodedPath.replace('/uploads', ''));
    }
    
    console.log('Request for:', req.url);
    console.log('Decoded path:', decodedPath);
    console.log('File path:', filePath);
    console.log('File exists:', require('fs').existsSync(filePath));
    
    if (require('fs').existsSync(filePath)) {
        // Set proper headers for images
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.sendFile(filePath);
    } else {
        console.log('File not found:', filePath);
        res.status(404).json({ 
            error: 'File not found', 
            path: filePath,
            originalUrl: req.url,
            decodedPath: decodedPath
        });
    }
});

// Test endpoint to check if uploads directory is accessible
app.get('/test-uploads', (req, res) => {
    const fs = require('fs');
    try {
        const avatarsPath = path.join(srcUploadsPath, 'avatars');
        console.log('Checking avatars path:', avatarsPath);
        console.log('Avatars directory exists:', fs.existsSync(avatarsPath));
        
        if (fs.existsSync(avatarsPath)) {
            const files = fs.readdirSync(avatarsPath);
            res.json({
                success: true,
                uploadsPath: uploadsPath,
                srcUploadsPath: srcUploadsPath,
                avatarsPath: avatarsPath,
                files: files.slice(0, 10) // Show first 10 files
            });
        } else {
            res.json({
                success: false,
                error: 'Avatars directory does not exist',
                uploadsPath: uploadsPath,
                srcUploadsPath: srcUploadsPath,
                avatarsPath: avatarsPath
            });
        }
    } catch (error) {
        res.json({
            success: false,
            error: error.message,
            uploadsPath: uploadsPath,
            srcUploadsPath: srcUploadsPath
        });
    }
});

// Test specific file
app.get('/test-file/:filename', (req, res) => {
    const fs = require('fs');
    const filename = req.params.filename;
    
    // Try main uploads first
    let filePath = path.join(uploadsPath, 'avatars', filename);
    
    // If not found, try src/uploads
    if (!fs.existsSync(filePath)) {
        filePath = path.join(srcUploadsPath, 'avatars', filename);
    }
    
    console.log('Testing file:', filePath);
    console.log('File exists:', fs.existsSync(filePath));
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({
            success: false,
            error: 'File not found',
            filePath: filePath
        });
    }
});

/* =======================
   DATABASE
======================= */
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/udemy-platform')
  .then(() => console.log('Connected to MongoDB: udemy-platform'))
  .catch((err) => console.error('MongoDB connection error:', err));

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
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://yourdomain.com', 'https://www.yourdomain.com'] 
      : ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
    methods: ["GET", "POST"],
    credentials: true
  },
});

// Store io in app for controllers to access
app.set('io', io);

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("sendMessage", (data) => {
    console.log("Message received via socket:", data);
    io.emit("receiveMessage", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});
