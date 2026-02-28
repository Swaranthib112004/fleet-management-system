const fs = require('fs');
const multer = require('multer');
const path = require('path');

const MAX_SIZE = parseInt(process.env.UPLOAD_MAX_BYTES || (50 * 1024 * 1024), 10); // 50MB default
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

// ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.round(Math.random()*1e9)}${ext}`;
    cb(null, name);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
  const allowedExts = ['.jpg', '.jpeg', '.png', '.pdf'];
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!allowed.includes(file.mimetype) && !allowedExts.includes(ext) && file.mimetype !== 'application/octet-stream') {
    req.fileValidationError = 'Invalid file type';
    return cb(null, false);
  }
  cb(null, true);
};

const upload = multer({ storage, limits: { fileSize: MAX_SIZE }, fileFilter });

// wrapper to provide proper error handling for multer errors
const single = (fieldName) => (req, res, next) => {
  upload.single(fieldName)(req, res, (err) => {
    if (err) {
      // Normalize multer errors to 400
      err.statusCode = err.statusCode || 400;
      return next(err);
    }
    // handle validation set in fileFilter
    if (req.fileValidationError) {
      const e = new Error(req.fileValidationError);
      e.statusCode = 400;
      return next(e);
    }
    next();
  });
};

module.exports = { single, UPLOAD_DIR };