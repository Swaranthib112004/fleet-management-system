const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// allow admin and manager to view audit logs
router.get('/', verifyToken, requireRole('admin','manager'), auditController.getAudit);
// allow any authenticated user to add audit log (backend code may call this internally)
router.post('/', verifyToken, auditController.addAudit);

module.exports = router;
