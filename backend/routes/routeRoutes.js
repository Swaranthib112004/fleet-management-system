const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');
const { verifyToken } = require('../middleware/authMiddleware');
const validateMiddleware = require('../middleware/validateMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const {
  createRouteValidator,
  updateRouteValidator,
  optimizeRouteValidator,
  createOptimizationValidator,
  acceptOptimizationValidator
} = require('../validators/routeValidator');

// Protect all routes with authentication
router.use(verifyToken);

// Route Management Endpoints
router.post('/', validateMiddleware(createRouteValidator), routeController.createRoute);
router.get('/', routeController.getAllRoutes);
router.get('/analytics', requireRole('admin', 'manager'), routeController.getRouteAnalytics);
router.get('/:routeId', routeController.getRouteById);
router.put('/:routeId', validateMiddleware(updateRouteValidator), routeController.updateRoute);
router.delete('/:routeId', requireRole('admin', 'manager'), routeController.deleteRoute);

// Route Optimization Endpoints
router.post('/optimize', validateMiddleware(optimizeRouteValidator), routeController.optimizeRoute);
router.post('/optimization/save', validateMiddleware(createOptimizationValidator), routeController.saveOptimization);
router.get('/optimization/history', routeController.getOptimizationHistory);
router.get('/optimization/:optimizationId', routeController.getOptimizationById);
router.put('/optimization/:optimizationId/accept', validateMiddleware(acceptOptimizationValidator), requireRole('manager', 'admin'), routeController.acceptOptimization);

module.exports = router;
