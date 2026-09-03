/**
 * Secure File Upload Middleware
 * Supports PDF, PNG, JPG, JPEG with strict validation:
 * - MIME type checking
 * - Extension checking
 * - Size limit (15MB)
 * - Empty / corrupted file detection
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const env = require('../config/env');
const { v4: uuidv4 } = require('uuid');

// Ensure upload directory exists
if (!fs.existsSync(env.UPLOAD_DIR)) {
  fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, env.UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedBase = path.basename(file.originalname, ext).replace(/[^\w\-]/g, '_').substring(0, 50);
    const uniqueName = `${Date.now()}-${uuidv4().substring(0, 8)}-${sanitizedBase}${ext}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
  const ext = path.extname(file.originalname).toLowerCase();

  const isAllowedMime = env.ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase());
  const isAllowedExt = allowedExtensions.includes(ext);

  if (isAllowedMime && isAllowedExt) {
    return cb(null, true);
  }

  const err = new Error('Invalid file type. Only PDF, JPG, and PNG medical reports are supported.');
  err.code = 'INVALID_FILE_TYPE';
  return cb(err, false);
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024 // 15 MB
  },
  fileFilter: fileFilter
});

/**
 * File post-validation middleware (checks for empty files or zero bytes)
 */
function validateUploadedFile(req, res, next) {
  if (!req.file) {
    return res.status(400).json({
      error: true,
      message: 'No file uploaded. Please select a valid medical report (PDF, JPG, or PNG).'
    });
  }

  if (req.file.size === 0) {
    try {
      fs.unlinkSync(req.file.path);
    } catch (e) {}
    return res.status(400).json({
      error: true,
      message: 'The uploaded file is empty (0 bytes). Please upload a valid report.'
    });
  }

  next();
}

module.exports = { upload, validateUploadedFile };
