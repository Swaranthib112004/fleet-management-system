const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');
const { createMaintenanceSchema, updateMaintenanceSchema } = require('../validators/maintenanceValidator');

router.get('/', verifyToken, maintenanceController.getMaintenances);
router.get('/:id', verifyToken, maintenanceController.getMaintenance);
router.post('/', verifyToken, requireRole('admin','manager'), validate(createMaintenanceSchema), maintenanceController.createMaintenance);
router.put('/:id', verifyToken, requireRole('admin','manager'), validate(updateMaintenanceSchema), maintenanceController.updateMaintenance);
router.delete('/:id', verifyToken, requireRole('admin','manager'), maintenanceController.deleteMaintenance);

module.exports = router;