const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const uploadController = require('../controllers/uploadController');
const validate = require('../middleware/validateMiddleware');
const { uploadSchema } = require('../validators/uploadValidator');

// Upload document (multipart/form-data)
// Note: place `validate` after multer's `single()` so `req.body` is populated for validation
router.post('/', verifyToken, upload.single('file'), validate(uploadSchema), uploadController.uploadDocument);
// List documents (supports filters and pagination)
router.get('/', verifyToken, uploadController.listDocuments);
router.get('/:id', verifyToken, uploadController.getDocument);
router.delete('/:id', verifyToken, requireRole('admin','manager'), uploadController.deleteDocument);

module.exports = router;