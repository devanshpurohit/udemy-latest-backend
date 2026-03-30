const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const ensureUploadDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = path.resolve(__dirname, '..', 'uploads');
    
    console.log('Current __dirname:', __dirname);
    console.log('Calculated uploadPath:', uploadPath);
    
    // Create subdirectories based on file type
    if (file.fieldname === 'thumbnail') {
      uploadPath = path.join(uploadPath, 'thumbnails');
    } else if (file.fieldname === 'video') {
      uploadPath = path.join(uploadPath, 'videos');
    } else if (file.fieldname === 'avatar' || file.fieldname === 'profileImage') {
      uploadPath = path.join(uploadPath, 'avatars');
    } else if (file.fieldname === 'document') {
      uploadPath = path.join(uploadPath, 'documents');
    } else {
      uploadPath = path.join(uploadPath, 'others');
    }
    
    console.log('Final upload path for', file.fieldname, ':', uploadPath);
    ensureUploadDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/\s+/g, '-');
    const filename = `${name}-${uniqueSuffix}${ext}`;
    console.log('Generated filename:', filename);
    cb(null, filename);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = {
    'image/jpeg': true,
    'image/jpg': true,
    'image/png': true,
    'image/gif': true,
    'image/webp': true,
    'video/mp4': true,
    'video/mpeg': true,
    'video/quicktime': true,
    'video/x-msvideo': true,
    'video/webm': true,
    'video/x-matroska': true,
    'application/pdf': true,
    'application/msword': true,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
    'application/vnd.ms-powerpoint': true,
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': true,
    'text/plain': true
  };

  if (allowedTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

// Upload middleware
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 * 1024, // Hardcode 5GB
    files: 5 // Maximum 5 files at once
  }
});

// Single file upload
const uploadSingle = (fieldName) => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: `File too large! (CL: ${req.headers['content-length']})`
          });
        } else if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            message: 'Too many files'
          });
        }
        return res.status(400).json({
          success: false,
          message: 'Upload error: ' + err.message
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: `Unknown error: ${err.message} (CL: ${req.headers['content-length']})`
        });
      }
      next();
    });
  };
};

// Multiple files upload
const uploadMultiple = (fieldName, maxCount = 5) => {
  return (req, res, next) => {
    upload.array(fieldName, maxCount)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File too large'
          });
        } else if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            message: 'Too many files'
          });
        }
        return res.status(400).json({
          success: false,
          message: 'Upload error: ' + err.message
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      next();
    });
  };
};

// Delete file utility
const deleteFile = (filePath) => {
  try {
    if (!filePath) return false;
    
    // Resolve relative paths (e.g., /uploads/...) to absolute paths
    let absolutePath = filePath;
    if (filePath.startsWith('/')) {
      absolutePath = path.join(__dirname, '..', filePath);
    } else if (!path.isAbsolute(filePath)) {
      absolutePath = path.join(__dirname, '..', 'uploads', filePath);
    }

    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
      console.log(`Successfully deleted file: ${absolutePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// Save base64 data to disk
const saveBase64ToDisk = (base64Data, type = 'thumbnails') => {
  try {
    if (!base64Data || !base64Data.includes(';base64,')) return base64Data;

    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return base64Data;

    const mimeType = matches[1];
    const data = Buffer.from(matches[2], 'base64');
    
    // Determine extension from mime type
    let extension = '.jpg';
    if (mimeType.includes('png')) extension = '.png';
    else if (mimeType.includes('webp')) extension = '.webp';
    else if (mimeType.includes('gif')) extension = '.gif';
    else if (mimeType.includes('mp4')) extension = '.mp4';
    else if (mimeType.includes('webm')) extension = '.webm';
    else if (mimeType.includes('pdf')) extension = '.pdf';

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `b64-${uniqueSuffix}${extension}`;
    
    const uploadPath = path.resolve(__dirname, '..', 'uploads', type);
    ensureUploadDir(uploadPath);
    
    const fullPath = path.join(uploadPath, filename);
    fs.writeFileSync(fullPath, data);
    
    console.log(`✅ Base64 saved to disk: /uploads/${type}/${filename}`);
    return `/uploads/${type}/${filename}`;
  } catch (error) {
    console.error('Error saving base64 to disk:', error);
    return base64Data;
  }
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  deleteFile,
  saveBase64ToDisk
};
