const axios = require('axios');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config({ path: './src/.env' });
const cloudinary = require('./src/config/cloudinary');

async function upload() {
  try {
    const cloudName = cloudinary.config().cloud_name;
    const apiKey = cloudinary.config().api_key;
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = 'test';
    
    // Create random 5MB buffer
    const buffer = Buffer.alloc(5 * 1024 * 1024, 'a');
    
    // write to temp file
    fs.writeFileSync('test.mp4', buffer);
    
    // sign
    const signature = cloudinary.utils.api_sign_request({ timestamp, folder }, cloudinary.config().api_secret);
    
    const uploadId = crypto.randomUUID();
    
    const formData = new FormData();
    const blob = new Blob([buffer]);
    formData.append('file', blob, 'test.mp4');
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    formData.append('folder', folder);
    
    // use object literal headers
    const headers = { 
        'X-Unique-Upload-Id': uploadId, 
        'Content-Range': 'bytes 0-5242879/5242880' 
    };
    
    const res = await axios.post(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, formData, { headers });
    console.log("Success URL:", res.data.secure_url);
  } catch (e) {
    console.error(e.response?.data || e.message);
  }
}

upload();
