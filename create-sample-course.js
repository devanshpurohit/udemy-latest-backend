const mongoose = require('mongoose');
const Course = require('./src/models/Course');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('✅ MongoDB Connected');
    
    // Create sample published course
    const sampleCourse = {
        title: 'React Masterclass - Complete Guide',
        description: 'Learn React from scratch with this comprehensive course. We will cover everything from basics to advanced concepts including hooks, context, and modern React patterns.',
        instructor: '6799838fc49f9812d244e133', // Admin user ID (replace with actual admin ID)
        category: 'development',
        level: 'beginner',
        price: 2999,
        discountedPrice: 1999,
        thumbnail: 'https://via.placeholder.com/400x200/007bff/ffffff?text=React+Course',
        courseImage: 'https://via.placeholder.com/400x200/007bff/ffffff?text=React+Course',
        language: 'English',
        duration: 3,
        status: 'published',
        isPublished: true,
        requirements: [
            'Basic JavaScript knowledge',
            'HTML and CSS understanding',
            'Computer with internet connection'
                        ],
        whatYouWillLearn: [
                            'React fundamentals and components',
            'State management with hooks',
            'Modern React patterns',
            'Building responsive applications'
                        ],
        tags: ['react', 'javascript', 'web development', 'frontend']
                    };

    Course.create(sampleCourse)
        .then(course => {
            console.log('✅ Sample course created:', course.title);
            console.log('📋 Course ID:', course._id);
            console.log('🔗 Course URL:', `http://localhost:5002/api/public/courses`);
        })
        .catch(error => {
            console.error('❌ Error creating course:', error);
        })
        .finally(() => {
            mongoose.disconnect();
            console.log('🔌 MongoDB Disconnected');
        });
})
.catch(error => {
    console.error('❌ MongoDB connection error:', error);
});
