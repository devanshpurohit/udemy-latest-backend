const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/udemy');
const Course = require('./src/models/Course');

Course.find({}).then(courses => {
  console.log('Total courses:', courses.length);
  courses.forEach((course, index) => {
    console.log(`${index + 1}. ${course.title} - ID: ${course._id}`);
  });
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
