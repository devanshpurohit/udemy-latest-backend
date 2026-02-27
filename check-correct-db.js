const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/udemy')
  .then(async () => {
    console.log('Connected to MongoDB (udemy database)');
    
    // List all collections
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('Available collections:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });
    
    // Check if courses collection exists and count documents
    const courseCount = await db.collection('courses').countDocuments();
    console.log(`\nCourses collection document count: ${courseCount}`);
    
    // If courses exist, show sample data
    if (courseCount > 0) {
      const allCourses = await db.collection('courses').find({}).toArray();
      console.log('\nAll courses:');
      allCourses.forEach(course => {
        console.log(`Title: ${course.title || 'No title'}`);
        console.log(`Status: ${course.status || 'No status'}`);
        console.log(`isPublished: ${course.isPublished || 'Not set'}`);
        console.log('---');
      });
    }
    
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('Connection error:', err);
    process.exit(1);
  });
