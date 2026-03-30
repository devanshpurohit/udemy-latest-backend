const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'src', '.env') });

const Feedback = require('./src/models/Feedback');

async function checkFeedback() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/udemy');
        console.log('Connected to MongoDB');

        const total = await Feedback.countDocuments();
        const approved = await Feedback.countDocuments({ isApproved: true });
        const pending = await Feedback.countDocuments({ isApproved: false });

        console.log(`Total Feedback: ${total}`);
        console.log(`Approved Feedback: ${approved}`);
        console.log(`Pending Feedback: ${pending}`);

        if (total > 0) {
            const latest = await Feedback.find().sort('-createdAt').limit(5);
            console.log('\nLatest 5 Feedbacks:');
            latest.forEach(f => {
                console.log(`- [${f.isApproved ? 'APPROVED' : 'PENDING'}] ${f.name}: "${f.comment.slice(0, 30)}..."`);
            });
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkFeedback();
