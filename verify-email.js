try {
  const nodemailer = require('nodemailer');
  require('dotenv').config();

  const transporter = nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  transporter.verify(function(error, success) {
    if (error) {
      console.log("Nodemailer verify error:");
      console.log(error);
    } else {
      console.log("Server is ready to take our messages");
    }
  });
} catch(e) {
  console.log("Fatal Error Caught:", e.message);
  console.log(e.stack);
}
