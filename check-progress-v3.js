const mongoose = require('mongoose');
const User = require('./src/models/User');
const Student = require('./src/models/Student');
const Course = require('./src/models/Course');
const fs = require('fs');
require('dotenv').config();

const checkData = async () => {
    let output = '';
    const log = (msg) => {
        console.log(msg);
        output += msg + '\n';
    };

    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/udemy');
        log('Connected to MongoDB');

        const users = await User.find({ "progress.0": { $exists: true } }).limit(10);
        log(`Found ${users.length} users with progress entries.`);

        for (const user of users) {
            log(`\n--- User: ${user.username} (${user._id}) ---`);
            for (const p of user.progress) {
                const course = await Course.findById(p.courseId);
                const title = course ? course.title : 'Unknown';
                
                let totalLessons = 0;
                if (course && course.sections) {
                    course.sections.forEach(s => totalLessons += (s.lessons ? s.lessons.length : 0));
                }

                log(`Course: ${title} (${p.courseId})`);
                log(`  - Total lessons in DB (sections): ${totalLessons}`);
                log(`  - Completed lessons in User model: ${p.completedLessons.length}`);
                
                const student = await Student.findOne({ user: user._id });
                if (student) {
                    const ec = student.enrolledCourses.find(c => c.course && c.course.toString() === p.courseId.toString());
                    if (ec) {
                        log(`  - Completed lessons in Student model: ${ec.completedLessons.length}`);
                        log(`  - Progress percentage in Student model: ${ec.progress}%`);
                    } else {
                        log(`  - No matching enrollment in Student model for this course.`);
                    }
                } else {
                    log(`  - No Student record found for this user.`);
                }
            }
        }

        fs.writeFileSync('diagnostic-results.txt', output);
        log('\nResults written to diagnostic-results.txt');
        process.exit(0);
    } catch (error) {
        log(`Check failed: ${error.message}`);
        fs.writeFileSync('diagnostic-results.txt', output + `\nERROR: ${error.message}`);
        process.exit(1);
    }
};

checkData();
