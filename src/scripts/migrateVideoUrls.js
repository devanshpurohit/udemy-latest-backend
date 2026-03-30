const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const Course = require('../models/Course');

const migrateVideoUrls = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/udemy-clone';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const courses = await Course.find({});
        console.log(`Found ${courses.length} courses to check`);

        let updatedCount = 0;

        for (const course of courses) {
            let modified = false;

            // Handle sections structure
            if (course.sections && course.sections.length > 0) {
                course.sections.forEach(section => {
                    if (section.lessons && section.lessons.length > 0) {
                        section.lessons.forEach(lesson => {
                            if (lesson.videoUrl && typeof lesson.videoUrl === 'string') {
                                const oldUrl = lesson.videoUrl;
                                lesson.videoUrl = { en: oldUrl, kn: '' };
                                modified = true;
                            }
                        });
                    }
                });
            }

            // Handle old lessons structure
            if (course.lessons && course.lessons.length > 0) {
                course.lessons.forEach(lesson => {
                    if (lesson.videoUrl && typeof lesson.videoUrl === 'string') {
                        const oldUrl = lesson.videoUrl;
                        lesson.videoUrl = { en: oldUrl, kn: '' };
                        modified = true;
                    }
                });
            }

            if (modified) {
                course.markModified('sections');
                course.markModified('lessons');
                await course.save();
                updatedCount++;
                console.log(`Updated course: ${course.title?.en || course._id}`);
            }
        }

        console.log(`Migration complete. Updated ${updatedCount} courses.`);
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrateVideoUrls();
