const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');
const { createDriverSchema, updateDriverSchema } = require('../validators/driverValidator');

router.get('/', verifyToken, driverController.getDrivers);
router.get('/:id', verifyToken, driverController.getDriver);
router.post('/', verifyToken, requireRole('admin', 'manager'), validate(createDriverSchema), driverController.createDriver);
router.put('/:id', verifyToken, requireRole('admin', 'manager'), validate(updateDriverSchema), driverController.updateDriver);
router.delete('/:id', verifyToken, requireRole('admin', 'manager'), driverController.deleteDriver);

module.exports = router;