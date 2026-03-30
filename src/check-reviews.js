const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Review = require('./models/Review');
const Course = require('./models/Course');

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/udemy');
        console.log('Connected to DB');

        const reviews = await Review.find().populate('courseId', 'title').populate('userId', 'username');
        console.log(`Total reviews in DB: ${reviews.length}`);

        reviews.forEach(r => {
            console.log(`- Course: ${r.courseId?.title} (ID: ${r.courseId?._id})`);
            console.log(`  User: ${r.userId?.username}`);
            console.log(`  Rating: ${r.rating}`);
            console.log(`  Approved: ${r.isApproved}`);
            console.log('---');
        });

        const courses = await Course.find({}, 'title averageRating numReviews');
        console.log('\nCourse Stats:');
        courses.forEach(c => {
            console.log(`- ${c.title}: Rating ${c.averageRating}, Reviews ${c.numReviews}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
