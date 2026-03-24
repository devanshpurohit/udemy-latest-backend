const mongoose = require('mongoose');
const Course = require('./src/models/Course');
require('dotenv').config();

async function addTestRating() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const course = await Course.findOne({ title: 'fdxv' });
        if (!course) {
            console.log('No published course found');
            return;
        }

        console.log('Updating course:', course.title);
        course.averageRating = 4.5;
        course.numReviews = 10;
        await course.save();
        
        console.log('Successfully updated course rating to 4.5');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

addTestRating();
