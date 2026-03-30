const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME?.trim(),
  api_key: process.env.CLOUD_API_KEY?.trim(),
  api_secret: process.env.CLOUD_SECRET_KEY?.trim()
});

module.exports = cloudinary;
