const nodemailer = require('nodemailer');

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send email function
const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Udemy Admin'}" <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error('Email could not be sent');
  }
};

// Send OTP email
const sendOTPEmail = async (email, otp) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Email Verification</h2>
      <p>Thank you for registering with Udemy Admin. Please use the following OTP to verify your email address:</p>
      <div style="background: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0;">
        <span style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">${otp}</span>
      </div>
      <p>This OTP will expire in 10 minutes.</p>
      <p>If you didn't request this verification, please ignore this email.</p>
      <hr>
      <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject: 'Verify Your Email - Udemy Admin',
    html: html,
    text: `Your OTP is: ${otp}`
  });
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Password Reset</h2>
      <p>You requested a password reset for your Udemy Admin account.</p>
      <p>Click the button below to reset your password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
      </div>
      <p>Or copy and paste this link in your browser:</p>
      <p style="background: #f0f0f0; padding: 10px; word-break: break-all;">${resetUrl}</p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this password reset, please ignore this email.</p>
      <hr>
      <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject: 'Reset Your Password - Udemy Admin',
    html: html,
    text: `Reset your password here: ${resetUrl}`
  });
};

// Send welcome email
const sendWelcomeEmail = async (email, username) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Welcome to Udemy Admin!</h2>
      <p>Hi ${username},</p>
      <p>Thank you for registering with Udemy Admin. Your account has been successfully created.</p>
      <p>You can now:</p>
      <ul>
        <li>Create and manage courses</li>
        <li>Track student progress</li>
        <li>Generate certificates</li>
        <li>Manage announcements</li>
        <li>And much more!</li>
      </ul>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL}/login" style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Login to Your Account</a>
      </div>
      <p>If you have any questions, please don't hesitate to contact our support team.</p>
      <hr>
      <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject: 'Welcome to Udemy Admin!',
    html: html,
    text: `Welcome to Udemy Admin! You can now login to your account.`
  });
};

module.exports = {
  sendEmail,
  sendOTPEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail
};
