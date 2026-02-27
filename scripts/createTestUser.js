const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config();

const createTestUser = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create test admin user
    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@udemy.com',
      password: 'Admin123',
      role: 'admin',
      profile: {
        firstName: 'Admin',
        lastName: 'User'
      },
      emailVerified: true,
      isActive: true
    });

    console.log('Admin user created:', adminUser.getProfile());

    // Create test instructor user
    const instructorUser = await User.create({
      username: 'instructor',
      email: 'instructor@udemy.com',
      password: 'Instructor123',
      role: 'instructor',
      profile: {
        firstName: 'Test',
        lastName: 'Instructor'
      },
      emailVerified: true,
      isActive: true
    });

    console.log('Instructor user created:', instructorUser.getProfile());

    // Create test student user
    const studentUser = await User.create({
      username: 'student',
      email: 'student@udemy.com',
      password: 'Student123',
      role: 'student',
      profile: {
        firstName: 'Test',
        lastName: 'Student'
      },
      emailVerified: true,
      isActive: true
    });

    console.log('Student user created:', studentUser.getProfile());

    console.log('\n=== Test Users Created ===');
    console.log('Admin Login: admin / Admin123');
    console.log('Instructor Login: instructor / Instructor123');
    console.log('Student Login: student / Student123');

  } catch (error) {
    console.error('Error creating test users:', error);
  } finally {
    await mongoose.disconnect();
  }
};

createTestUser();
