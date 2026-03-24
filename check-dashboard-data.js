const mongoose = require('mongoose');
const User = require('./src/models/User');
const Course = require('./src/models/Course');
require('dotenv').config();

async function checkDashboardData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const user = await User.findOne({ role: 'student' }).populate({
            path: 'purchasedCourses',
            select: 'title averageRating numReviews sections'
        });

        if (!user) {
            console.log('No student user found');
            return;
        }

        console.log('User:', user.username);
        console.log('Purchased Courses count:', user.purchasedCourses.length);
        
        user.purchasedCourses.forEach((course, i) => {
            console.log(`Course ${i+1}: ${course.title}`);
            console.log(` - averageRating: ${course.averageRating}`);
            console.log(` - numReviews: ${course.numReviews}`);
            console.log(` - sections count: ${course.sections?.length || 0}`);
            
            const progress = user.progress.find(p => p.courseId.toString() === course._id.toString());
            console.log(` - progress found: ${!!progress}`);
            if (progress) {
                console.log(` - completedLessons: ${progress.completedLessons.length}`);
            }
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkDashboardData();
