const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/udemy')
  .then(async () => {
    console.log('Connected to MongoDB (udemy database)');
    
    const db = mongoose.connection.db;
    
    // Find courses without isPublished field or with isPublished: false/null
    const coursesToFix = await db.collection('courses').find({
      $or: [
        { isPublished: { $exists: false } },
        { isPublished: null },
        { isPublished: false }
      ]
    }).toArray();
    
    console.log(`Found ${coursesToFix.length} courses to fix:`);
    coursesToFix.forEach(course => {
      console.log(`- ${course.title} (isPublished: ${course.isPublished})`);
    });
    
    // Update all courses to have isPublished: true
    const result = await db.collection('courses').updateMany(
      { 
        $or: [
          { isPublished: { $exists: false } },
          { isPublished: null },
          { isPublished: false }
        ]
      },
      { $set: { isPublished: true } }
    );
    
    console.log(`\nUpdated ${result.modifiedCount} courses`);
    
    // Verify final result
    const finalCourses = await db.collection('courses').find({
      status: 'published',
      isPublished: true
    }).toArray();
    
    console.log(`\n✅ Final published courses count: ${finalCourses.length}`);
    finalCourses.forEach(course => {
      console.log(`✅ ${course.title} - Status: ${course.status}, Published: ${course.isPublished}`);
    });
    
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('Connection error:', err);
    process.exit(1);
  });
