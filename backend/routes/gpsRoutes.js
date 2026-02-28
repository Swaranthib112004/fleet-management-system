// GPS Tracking Routes
// Location: backend/routes/gpsRoutes.js

const express = require('express');
const router = express.Router();
const gpsController = require('../controllers/gpsController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// All routes require authentication
router.use(verifyToken);

// Location update (from GPS device or client)
router.post('/update-location/:vehicleId', gpsController.updateLocation);

// Get current vehicle location
router.get('/vehicles/:vehicleId/location', gpsController.getCurrentLocation);

// Get location history
router.get('/vehicles/:vehicleId/history', gpsController.getLocationHistory);

// Get vehicles nearby (geospatial)
router.get('/nearby', gpsController.getNearbyVehicles);

// Get trip analytics
router.get(
  '/vehicles/:vehicleId/trip-analytics',
  gpsController.getTripAnalytics
);

// GPS Simulation endpoints (admin & manager only)
router.post(
  '/vehicles/:vehicleId/start-simulation',
  requireRole('admin', 'manager'),
  gpsController.startSimulation
);

router.post(
  '/vehicles/:vehicleId/stop-simulation',
  requireRole('admin', 'manager'),
  gpsController.stopSimulation
);

router.get(
  '/simulations',
  requireRole('admin', 'manager'),
  gpsController.getActiveSimulations
);

// Fleet-wide GPS endpoints
router.get(
  '/fleet-locations',
  requireRole('admin', 'manager'),
  gpsController.getFleetLocations
);

router.get(
  '/heatmap',
  requireRole('admin', 'manager'),
  gpsController.getHeatmapData
);

// Geofence alerts
router.get(
  '/geofence-alerts',
  requireRole('admin', 'manager'),
  gpsController.getGeofenceAlerts
);

module.exports = router;
