const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');

mongoose.connect('mongodb://localhost:27017/udemy', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to DB');
  
  // Find a user to test
  const user = await User.findOne({});
  if (!user) {
    console.log('No user found in DB');
    return process.exit(0);
  }
  
  console.log('Testing reset on user:', user.email);
  const oldHash = user.password;
  console.log('Old Hash:', oldHash);

  const newPassword = 'NewPassword123!';
  const salt = await bcrypt.genSalt(10);
  const newHash = await bcrypt.hash(newPassword, salt);
  console.log('New Hash:', newHash);

  await User.updateOne({ email: user.email }, { $set: { password: newHash } });

  const updatedUser = await User.findOne({ email: user.email });
  console.log('Updated Hash:', updatedUser.password);
  
  console.log('Hashes match update:', updatedUser.password === newHash);
  
  // Revert back
  await User.updateOne({ email: user.email }, { $set: { password: oldHash } });
  
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
