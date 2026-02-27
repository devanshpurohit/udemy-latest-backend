const mongoose = require('mongoose');
const User = require('./src/models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const createTestUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/udemy-platform');
    console.log('🔄 Connected to MongoDB');
    
    // Clear existing test users
    await User.deleteMany({ email: { $in: ['test@example.com', 'admin@test.com'] } });
    console.log('🗑️ Cleared existing test users');
    
    // Create test student user
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    const testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: hashedPassword,
      role: 'student',
      profile: {
        firstName: 'Test',
        lastName: 'User'
      },
      isActive: true,
      emailVerified: true // Auto-verified for testing
    });
    
    await testUser.save();
    console.log('✅ Created test user:');
    console.log('   Email: test@example.com');
    console.log('   Password: password123');
    console.log('   Username: testuser');
    console.log('   Role: student');
    
    // Create test admin user
    const adminUser = new User({
      username: 'admin',
      email: 'admin@test.com',
      password: hashedPassword,
      role: 'admin',
      profile: {
        firstName: 'Admin',
        lastName: 'User'
      },
      isActive: true,
      emailVerified: true // Auto-verified for testing
    });
    
    await adminUser.save();
    console.log('\n✅ Created admin user:');
    console.log('   Email: admin@test.com');
    console.log('   Password: password123');
    console.log('   Username: admin');
    console.log('   Role: admin');
    
    console.log('\n🎯 Ready for testing!');
    console.log('📱 Use these credentials to test login');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    process.exit(1);
  }
};

createTestUser();
