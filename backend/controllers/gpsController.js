// GPS Tracking Controller
// Location: backend/controllers/gpsController.js

const gpsTrackingService = require('../services/gpsTrackingService');
const predictiveMaintenanceService = require('../services/predictiveMaintenanceService');
const Location = require('../models/locationModel');
const Vehicle = require('../models/vehicleModel');
const logger = require('../utils/logger');

/**
 * Update vehicle location (from GPS device)
 * POST /api/gps/update-location
 */
exports.updateLocation = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const locationData = req.body;

    // Validate required fields
    if (!locationData.latitude || !locationData.longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    // Update location
    const location = await gpsTrackingService.updateLocation(vehicleId, {
      ...locationData,
      speed: parseFloat(locationData.speed || 0),
      heading: parseFloat(locationData.heading || 0),
      latitude: parseFloat(locationData.latitude),
      longitude: parseFloat(locationData.longitude)
    });

    // Emit real-time update via WebSocket
    if (global.socketioManager) {
      global.socketioManager.emitToVehicle(vehicleId, 'location-updated', {
        vehicleId,
        location: {
          lat: location.latitude,
          lng: location.longitude,
          speed: location.speed,
          heading: location.heading,
          timestamp: location.createdAt
        }
      });
    }

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: location
    });
  } catch (error) {
    logger.error('Location update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location',
      error: error.message
    });
  }
};

/**
 * Get current vehicle location
 * GET /api/gps/vehicles/:vehicleId/location
 */
exports.getCurrentLocation = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const location = await gpsTrackingService.getCurrentLocation(vehicleId);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'No location data found for vehicle'
      });
    }

    res.json({
      success: true,
      data: location
    });
  } catch (error) {
    logger.error('Get location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get location',
      error: error.message
    });
  }
};

/**
 * Get location history
 * GET /api/gps/vehicles/:vehicleId/history
 */
exports.getLocationHistory = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { limit = 100, skip = 0, startDate, endDate, simplify = false } = req.query;

    const history = await gpsTrackingService.getLocationHistory(vehicleId, {
      limit: parseInt(limit),
      skip: parseInt(skip),
      startDate,
      endDate,
      simplify: simplify === 'true'
    });

    res.json({
      success: true,
      data: history.data,
      pagination: history.pagination
    });
  } catch (error) {
    logger.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get location history',
      error: error.message
    });
  }
};

/**
 * Get vehicles nearby
 * GET /api/gps/nearby?lng=-74.006&lat=40.7128&radius=5000
 */
exports.getNearbyVehicles = async (req, res) => {
  try {
    const { lng, lat, radius = 5000 } = req.query;

    if (!lng || !lat) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const vehicles = await gpsTrackingService.getVehiclesNearby(
      parseFloat(lng),
      parseFloat(lat),
      parseFloat(radius)
    );

    res.json({
      success: true,
      data: vehicles,
      count: vehicles.length
    });
  } catch (error) {
    logger.error('Nearby vehicles error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get nearby vehicles',
      error: error.message
    });
  }
};

/**
 * Get trip analytics
 * GET /api/gps/vehicles/:vehicleId/trip-analytics?startTime=&endTime=
 */
exports.getTripAnalytics = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { startTime, endTime } = req.query;

    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'startTime and endTime are required'
      });
    }

    const analytics = await gpsTrackingService.calculateTripAnalytics(
      vehicleId,
      new Date(startTime),
      new Date(endTime)
    );

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Trip analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate trip analytics',
      error: error.message
    });
  }
};

/**
 * Start GPS simulation
 * POST /api/gps/vehicles/:vehicleId/start-simulation
 */
exports.startSimulation = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { speed = 60, interval = 5000, routeId } = req.body;

    // Get route waypoints
    const Route = require('../models/routeModel');
    const route = routeId
      ? await Route.findById(routeId)
      : {
          waypoints: [
            { latitude: 40.7128, longitude: -74.006 },
            { latitude: 40.758, longitude: -73.9855 },
            { latitude: 40.7489, longitude: -73.968 }
          ]
        };

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    const result = await gpsTrackingService.startSimulation(vehicleId, route, {
      speed: parseFloat(speed),
      interval: parseInt(interval)
    });

    res.json({
      success: true,
      message: 'Simulation started',
      data: result
    });
  } catch (error) {
    logger.error('Start simulation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start simulation',
      error: error.message
    });
  }
};

/**
 * Stop GPS simulation
 * POST /api/gps/vehicles/:vehicleId/stop-simulation
 */
exports.stopSimulation = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const result = gpsTrackingService.stopSimulation(vehicleId);

    res.json({
      success: true,
      message: result ? 'Simulation stopped' : 'No active simulation',
      data: { stopped: result }
    });
  } catch (error) {
    logger.error('Stop simulation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop simulation',
      error: error.message
    });
  }
};

/**
 * Get active simulations
 * GET /api/gps/simulations
 */
exports.getActiveSimulations = async (req, res) => {
  try {
    const simulations = gpsTrackingService.getActiveSimulations();

    res.json({
      success: true,
      data: simulations,
      count: simulations.length
    });
  } catch (error) {
    logger.error('Get simulations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get simulations',
      error: error.message
    });
  }
};

/**
 * Get all vehicle locations (fleet view)
 * GET /api/gps/fleet-locations
 */
exports.getFleetLocations = async (req, res) => {
  try {
    const { limit = 100 } = req.query;

    const locations = await Location.find({})
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select(
        'vehicle latitude longitude speed heading createdAt isMoving engineStatus'
      )
      .populate('vehicle', 'licensePlate make model');

    res.json({
      success: true,
      data: locations,
      count: locations.length
    });
  } catch (error) {
    logger.error('Fleet locations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get fleet locations',
      error: error.message
    });
  }
};

/**
 * Get heat map data (popular routes/areas)
 * GET /api/gps/heatmap
 */
exports.getHeatmapData = async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const locations = await Location.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          locations: {
            $push: {
              lat: '$latitude',
              lng: '$longitude'
            }
          }
        }
      }
    ]);

    const heatmapPoints =
      locations.length > 0 ? locations[0].locations : [];

    res.json({
      success: true,
      data: heatmapPoints,
      count: heatmapPoints.length
    });
  } catch (error) {
    logger.error('Heatmap data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get heatmap data',
      error: error.message
    });
  }
};

/**
 * Get geofence alerts
 * GET /api/gps/geofence-alerts
 */
exports.getGeofenceAlerts = async (req, res) => {
  try {
    // This would work with a geofence collection in production
    // For now, return mock data structure

    res.json({
      success: true,
      data: [],
      message: 'Geofence alerts feature ready for implementation'
    });
  } catch (error) {
    logger.error('Geofence alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get geofence alerts',
      error: error.message
    });
  }
};
