const mongoose = require('mongoose');
const Statement = require('../models/Statement');
const Course = require('../models/Course');
const User = require('../models/User');

// Sample statements data
const sampleStatements = [
    {
        orderId: 'ORD001',
        amount: 5698,
        paymentMethod: 'UPI',
        status: 'Paid',
        notes: 'Payment completed successfully'
    },
    {
        orderId: 'ORD002',
        amount: 4299,
        paymentMethod: 'Bank Transfer',
        status: 'Pending',
        notes: 'Awaiting bank confirmation'
    },
    {
        orderId: 'ORD003',
        amount: 3499,
        paymentMethod: 'UPI',
        status: 'Paid',
        notes: 'Payment received'
    },
    {
        orderId: 'ORD004',
        amount: 7899,
        paymentMethod: 'UPI',
        status: 'Pending',
        notes: 'Payment processing'
    },
    {
        orderId: 'ORD005',
        amount: 5698,
        paymentMethod: 'Bank Transfer',
        status: 'Paid',
        notes: 'Payment confirmed'
    }
];

async function seedStatements() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/udemy');
        console.log('Connected to MongoDB');

        // Get existing data
        const existingCourses = await Course.find().limit(5);
        const existingUsers = await User.find().limit(5);
        
        if (existingCourses.length === 0 || existingUsers.length === 0) {
            console.log('No existing courses or users found. Please create some courses and users first.');
            return;
        }

        // Clear existing statements
        await Statement.deleteMany({});
        console.log('Cleared existing statements');

        // Create sample statements
        const statementsToCreate = sampleStatements.map((stmt, index) => ({
            ...stmt,
            course: existingCourses[index % existingCourses.length]._id,
            student: existingUsers[index % existingUsers.length]._id,
            instructor: existingCourses[index % existingCourses.length].instructor,
            paymentDate: stmt.status === 'Paid' ? new Date() : null
        }));

        const createdStatements = await Statement.insertMany(statementsToCreate);
        console.log(`Created ${createdStatements.length} sample statements`);

        // Log created statements
        createdStatements.forEach((stmt, index) => {
            console.log(`${index + 1}. ${stmt.orderId} - $${stmt.amount} - ${stmt.status}`);
        });

        console.log('Statements seeded successfully!');
        
    } catch (error) {
        console.error('Error seeding statements:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

// Run the seed function
if (require.main === module) {
    seedStatements();
}

module.exports = { seedStatements, sampleStatements };
