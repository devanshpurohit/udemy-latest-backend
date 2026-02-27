const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/udemy');

mongoose.connection.once('open', async () => {
  console.log('Testing API endpoint...');
  try {
    const response = await fetch('http://localhost:5002/api/public/courses');
    const data = await response.json();
    console.log('API Response success:', data.success);
    console.log('API Data length:', data.data?.length);
    if (data.data) {
      data.data.forEach((course, index) => {
        console.log(`${index + 1}. ${course.title}`);
      });
    }
    process.exit(0);
  } catch (error) {
    console.error('API Error:', error.message);
    process.exit(1);
  }
});
