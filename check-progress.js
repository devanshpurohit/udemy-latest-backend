const mongoose = require('mongoose');
const User = require('./src/models/User');
const Student = require('./src/models/Student');
const Course = require('./src/models/Course');
require('dotenv').config();

const checkData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/udemy');
        console.log('Connected to MongoDB');

        // Find users with progress entries
        const usersWithProgress = await User.find({ "progress.0": { $exists: true } }).limit(5);
        
        if (usersWithProgress.length === 0) {
            console.log('No users found with any progress entries in User model.');
        } else {
            console.log(`Found ${usersWithProgress.length} users with progress entries.`);
            for (const user of usersWithProgress) {
                console.log(`\nUser: ${user.username} (${user._id})`);
                console.log(`Enrolled Courses: ${user.enrolledCourses.length}`);
                console.log(`Progress Entries: ${user.progress.length}`);
                
                for (const p of user.progress) {
                    const course = await Course.findById(p.courseId);
                    const courseTitle = course ? course.title : 'Unknown';
                    console.log(`  - Course: ${courseTitle} (${p.courseId})`);
                    console.log(`    Completed Lessons: ${p.completedLessons.length}`);
                    if (p.completedLessons.length > 0) {
                        console.log(`    First Lesson ID: ${p.completedLessons[0].lessonId}`);
                    }
                }
            }
        }

        // Also check Student model
        const students = await Student.find({ "enrolledCourses.completedLessons.0": { $exists: true } }).limit(5);
        if (students.length === 0) {
            console.log('\nNo students found with completed lessons in Student model.');
        } else {
            console.log(`\nFound ${students.length} students with completed lessons in Student model.`);
            for (const s of students) {
                const user = await User.findById(s.user);
                console.log(`\nStudent (User: ${user ? user.username : 'Unknown'} - ${s.user})`);
                for (const ec of s.enrolledCourses) {
                    if (ec.completedLessons.length > 0) {
                        const course = await Course.findById(ec.course);
                        console.log(`  - Course: ${course ? course.title : 'Unknown'} (${ec.course})`);
                        console.log(`    Completed Lessons: ${ec.completedLessons.length}`);
                        console.log(`    First Lesson ID: ${ec.completedLessons[0].lesson}`);
                    }
                }
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Check failed:', error);
        process.exit(1);
    }
};

checkData();
