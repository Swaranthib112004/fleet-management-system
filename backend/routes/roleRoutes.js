const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// only admin can manage roles
router.get('/', verifyToken, requireRole('admin'), roleController.getRoles);
router.post('/', verifyToken, requireRole('admin'), roleController.createRole);
router.delete('/:id', verifyToken, requireRole('admin'), roleController.deleteRole);

module.exports = router;
