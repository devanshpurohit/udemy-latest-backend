const mongoose = require('mongoose');
const Course = require('./src/models/Course');

mongoose.connect('mongodb://localhost:27017/udemy-platform')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Get all courses
    const allCourses = await Course.find({});
    console.log(`Total courses found: ${allCourses.length}`);
    
    // Update all courses to be published
    const result = await Course.updateMany(
      {}, // All courses
      { 
        $set: { 
          status: 'published',
          isPublished: true
        }
      }
    );
    
    console.log(`Updated ${result.modifiedCount} courses to published status`);
    
    // Verify the update
    const publishedCourses = await Course.find({isPublished: true, status: 'published'});
    console.log(`Published courses count: ${publishedCourses.length}`);
    
    publishedCourses.forEach(course => {
      console.log(`✅ ${course.title} - Status: ${course.status}, Published: ${course.isPublished}`);
    });
    
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('Connection error:', err);
    process.exit(1);
  });
