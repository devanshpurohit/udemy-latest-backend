const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/udemy');
const Course = require('./src/models/Course');

Course.find({}).then(courses => {
  console.log('Total courses:', courses.length);
  console.log('First 5 courses (should be all):');
  courses.slice(0, 5).forEach((course, index) => {
    console.log(`${index + 1}. ${course.title}`);
  });
  console.log('\nChecking slice(0, 5):');
  const firstFive = courses.slice(0, 5);
  console.log('Length of slice(0, 5):', firstFive.length);
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
