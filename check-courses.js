const mongoose = require('mongoose');
const Course = require('./src/models/Course');

mongoose.connect('mongodb://localhost:27017/udemy')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    try {
      // Check all courses
      const allCourses = await Course.find({});
      console.log('All courses count:', allCourses.length);
      
      // Check published courses with both conditions
      const publishedCourses = await Course.find({ isPublished: true, status: 'published' });
      console.log('Published courses (both conditions) count:', publishedCourses.length);
      
      // Check only isPublished
      const isPublishedCourses = await Course.find({ isPublished: true });
      console.log('isPublished=true courses count:', isPublishedCourses.length);
      
      // Check only status
      const statusPublishedCourses = await Course.find({ status: 'published' });
      console.log('status=published courses count:', statusPublishedCourses.length);
      
      // Show course details
      console.log('\nCourse Details:');
      allCourses.forEach(course => {
        console.log(`- ${course.title}: isPublished=${course.isPublished}, status=${course.status}`);
      });
      
    } catch (error) {
      console.error('Error:', error);
    }
    
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
