const mongoose = require('mongoose');
const User = require('./src/models/User');
const Student = require('./src/models/Student');
require('dotenv').config();

const syncProgress = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/udemy');
        console.log('Connected to MongoDB');

        const students = await Student.find({});
        console.log(`Found ${students.length} student records to sync...`);

        for (const student of students) {
            const user = await User.findById(student.user);
            if (!user) {
                console.log(`User not found for student ${student._id}`);
                continue;
            }

            let modified = false;
            for (const enrolledCourse of student.enrolledCourses) {
                if (!enrolledCourse.course) continue;

                const courseId = enrolledCourse.course.toString();
                let userProgressEntry = user.progress.find(p => p.courseId.toString() === courseId);

                if (!userProgressEntry) {
                    user.progress.push({
                        courseId: courseId,
                        completedLessons: [],
                        quizScores: []
                    });
                    userProgressEntry = user.progress[user.progress.length - 1];
                    modified = true;
                }

                // Sync completed lessons
                for (const studentLesson of enrolledCourse.completedLessons) {
                    if (!studentLesson.lesson) continue;

                    const lessonId = studentLesson.lesson.toString();
                    const isAlreadyInUser = userProgressEntry.completedLessons.some(
                        l => l.lessonId && l.lessonId.toString() === lessonId
                    );

                    if (!isAlreadyInUser) {
                        userProgressEntry.completedLessons.push({
                            lessonId: lessonId,
                            completedAt: studentLesson.completedAt || new Date()
                        });
                        modified = true;
                    }
                }
            }

            if (modified) {
                user.markModified('progress');
                await user.save();
                console.log(`✅ Synced progress for user: ${user.username}`);
            }
        }

        console.log('Migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

syncProgress();
