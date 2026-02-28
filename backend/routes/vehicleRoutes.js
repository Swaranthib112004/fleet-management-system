const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { createVehicleSchema, updateVehicleSchema } = require('../validators/vehicleValidator');
const validate = require('../middleware/validateMiddleware');

// Public list and get require auth
router.get('/', verifyToken, vehicleController.getVehicles);
router.get('/:id', verifyToken, vehicleController.getVehicle);

// Restricted
router.post('/', verifyToken, requireRole('admin', 'manager'), validate(createVehicleSchema), vehicleController.createVehicle);
router.put('/:id', verifyToken, requireRole('admin', 'manager'), validate(updateVehicleSchema), vehicleController.updateVehicle);
router.delete('/:id', verifyToken, requireRole('admin', 'manager'), vehicleController.deleteVehicle);

module.exports = router;
