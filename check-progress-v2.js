const mongoose = require('mongoose');
const User = require('./src/models/User');
const Student = require('./src/models/Student');
const Course = require('./src/models/Course');
require('dotenv').config();

const checkData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/udemy');
        console.log('Connected to MongoDB');

        const users = await User.find({ "progress.0": { $exists: true } }).limit(10);
        console.log(`Found ${users.length} users with progress entries.`);

        for (const user of users) {
            console.log(`\n--- User: ${user.username} ---`);
            for (const p of user.progress) {
                const course = await Course.findById(p.courseId);
                const title = course ? course.title : 'Unknown';
                
                // Calculate total lessons like in public.js
                let totalLessons = 0;
                if (course && course.sections) {
                    course.sections.forEach(s => totalLessons += (s.lessons ? s.lessons.length : 0));
                }

                console.log(`Course: ${title}`);
                console.log(`  - Total lessons in DB (sections): ${totalLessons}`);
                console.log(`  - Completed lessons in User model: ${p.completedLessons.length}`);
                
                // Check student model too
                const student = await Student.findOne({ user: user._id });
                if (student) {
                    const ec = student.enrolledCourses.find(c => c.course && c.course.toString() === p.courseId.toString());
                    if (ec) {
                        console.log(`  - Completed lessons in Student model: ${ec.completedLessons.length}`);
                        console.log(`  - Progress percentage in Student model: ${ec.progress}%`);
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
