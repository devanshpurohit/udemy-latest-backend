const mongoose = require('mongoose');
const Course = require('./src/models/Course');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('✅ MongoDB Connected');
    
    // Step 1: Check all courses
    return Course.find({});
})
.then(courses => {
    console.log(`📋 Found ${courses.length} courses in database`);
    
    let updatedCount = 0;
    let wrongFieldCount = 0;
    
    // Step 2: Check each course
    courses.forEach(course => {
        console.log(`\n🔍 Course: ${course.title}`);
        console.log(`   Status: ${course.status}`);
        console.log(`   isPublished: ${course.isPublished}`);
        console.log(`   Published field exists: ${course.hasOwnProperty('published')}`);
        
        if (course.hasOwnProperty('published')) {
            wrongFieldCount++;
            console.log(`   ❌ WRONG FIELD: 'published' field found!`);
        }
        
        // Step 3: Fix isPublished based on status
        if (course.status === 'published' && !course.isPublished) {
            course.isPublished = true;
            course.save();
            updatedCount++;
            console.log(`   ✅ FIXED: Set isPublished to true`);
        } else if (course.status === 'published' && course.isPublished) {
            console.log(`   ✅ ALREADY CORRECT: isPublished is true`);
        } else {
            console.log(`   ⚠️  NOT PUBLISHED: Status is ${course.status}`);
        }
    });
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total courses: ${courses.length}`);
    console.log(`   Wrong 'published' field found: ${wrongFieldCount}`);
    console.log(`   Courses fixed: ${updatedCount}`);
    
    // Step 4: Remove wrong field if exists
    if (wrongFieldCount > 0) {
        console.log(`\n🔧 Removing wrong 'published' field...`);
        return Course.updateMany(
            {},
            { $unset: { published: "" } }
        );
    }
})
.then(result => {
    if (result) {
        console.log(`✅ Removed wrong 'published' field from ${result.modifiedCount} courses`);
    }
    
    // Step 5: Final check
    return Course.find({ isPublished: true });
})
.then(publishedCourses => {
    console.log(`\n🎉 FINAL RESULT:`);
    console.log(`   Published courses with isPublished=true: ${publishedCourses.length}`);
    
    publishedCourses.forEach(course => {
        console.log(`   ✅ ${course.title} (Status: ${course.status}, isPublished: ${course.isPublished})`);
    });
})
.catch(error => {
    console.error('❌ Error:', error);
})
.finally(() => {
    mongoose.disconnect();
    console.log('\n🔌 MongoDB Disconnected');
});
