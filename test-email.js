require('dotenv').config();
const { sendOTPEmail } = require('./src/utils/emailService');

async function test() {
  try {
    console.log('Testing email sender...');
    await sendOTPEmail('purohitdevansh22@gmail.com', '123456');
    console.log('Success!');
  } catch(e) {
    console.error('Failed!', e);
  }
}

test();
