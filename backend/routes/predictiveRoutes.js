// Predictive Maintenance Routes
// Location: backend/routes/predictiveRoutes.js

const express = require('express');
const router = express.Router();
const predictiveController = require('../controllers/predictiveController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// All routes require authentication
router.use(verifyToken);

// Train model for specific vehicle
router.post(
  '/vehicles/:vehicleId/train',
  requireRole('admin', 'manager'),
  predictiveController.trainModel
);

// Get predictions for vehicle
router.get('/vehicles/:vehicleId/predictions', predictiveController.getVehiclePredictions);

// Get all predictions with filtering
router.get('/predictions', predictiveController.getAllPredictions);

// Get predictions summary (dashboard)
router.get('/summary', predictiveController.getPredictionsSummary);

// Get high-risk vehicles
router.get(
  '/high-risk-vehicles',
  requireRole('admin', 'manager'),
  predictiveController.getHighRiskVehicles
);

// Get component failure risks
router.get(
  '/vehicles/:vehicleId/component-risks',
  predictiveController.getComponentRisks
);

// Get cost savings projection
router.get(
  '/vehicles/:vehicleId/cost-savings',
  predictiveController.getCostSavingsProjection
);

// Acknowledge prediction
router.put(
  '/predictions/:predictionId/acknowledge',
  requireRole('admin', 'manager'),
  predictiveController.acknowledgePrediction
);

// Retrain all models (admin only)
router.post(
  '/retrain-all',
  requireRole('admin'),
  predictiveController.retrainAllModels
);

module.exports = router;
