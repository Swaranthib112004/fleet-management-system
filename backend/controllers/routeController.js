const Route = require('../models/routeModel');
const RouteOptimization = require('../models/routeOptimizationModel');
const routeOptimizationService = require('../services/routeOptimizationService');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class RouteController {
  /**
   * Create a new route
   */
  async createRoute(req, res) {
    try {
      // Read fields from request body (was missing, causing ReferenceError)
      const {
        routeCode,
        vehicle,
        driver,
        startLocation,
        endLocation,
        waypoints,
        startTime,
        routeType,
        status,
        totalStops,
        totalDistance,
        totalDuration,
      } = req.body || {};

      // Use provided coordinates when available. Do NOT silently default to Delhi coordinates
      // because that makes user-entered city names appear in the wrong place on the map.
      const defaultStart = {
        name: startLocation?.name || 'Start',
        latitude: typeof startLocation?.latitude === 'number' ? startLocation.latitude : null,
        longitude: typeof startLocation?.longitude === 'number' ? startLocation.longitude : null,
      };
      const defaultEnd = {
        name: endLocation?.name || 'End',
        latitude: typeof endLocation?.latitude === 'number' ? endLocation.latitude : null,
        longitude: typeof endLocation?.longitude === 'number' ? endLocation.longitude : null,
      };

      const route = new Route({
        routeCode: routeCode || `ROUTE-${uuidv4().slice(0, 8)}`,
        vehicle,
        driver,
        startLocation: defaultStart,
        endLocation: defaultEnd,
        waypoints: waypoints || [],
        startTime: startTime || new Date(),
        estimatedEndTime: new Date(Date.now() + 8 * 3600000), // 8 hours default
        routeType: routeType || 'standard',
        status: status || 'planned',
        totalStops: totalStops || (waypoints ? waypoints.length : 0),
        totalDistance: totalDistance || 0,
        totalDuration: totalDuration || 0,
        createdBy: req.user?._id,
      });

      await route.save();
      await route.populate(['vehicle', 'driver']);

      logger.info('Route created successfully', { routeId: route._id, routeCode: route.routeCode });

      res.status(201).json({
        success: true,
        message: 'Route created successfully',
        data: route,
      });
    } catch (error) {
      logger.error('Error creating route', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        message: 'Error creating route',
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Get all routes with optional filtering
   */
  async getAllRoutes(req, res) {
    try {
      const { status, vehicle, driver, search, page = 1, limit = 10 } = req.query;

      const filter = {};
      if (status) filter.status = status;
      if (vehicle) filter.vehicle = vehicle;
      if (driver) filter.driver = driver;
      if (search) {
        filter.routeCode = { $regex: search, $options: 'i' };
      }

      const skip = (page - 1) * limit;

      const routes = await Route.find(filter)
        .populate(['vehicle', 'driver', 'createdBy'])
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

      const total = await Route.countDocuments(filter);

      res.status(200).json({
        success: true,
        data: routes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Error fetching routes', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Error fetching routes',
        error: error.message,
      });
    }
  }

  /**
   * Get single route by ID
   */
  async getRouteById(req, res) {
    try {
      const route = await Route.findById(req.params.routeId)
        .populate(['vehicle', 'driver', 'createdBy', 'updatedBy']);

      if (!route) {
        return res.status(404).json({
          success: false,
          message: 'Route not found',
        });
      }

      res.status(200).json({
        success: true,
        data: route,
      });
    } catch (error) {
      logger.error('Error fetching route', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Error fetching route',
        error: error.message,
      });
    }
  }

  /**
   * Update route
   */
  async updateRoute(req, res) {
    try {
      const route = await Route.findById(req.params.routeId);

      if (!route) {
        return res.status(404).json({
          success: false,
          message: 'Route not found',
        });
      }

      const { status, waypoints, actualEndTime } = req.body;

      if (status) route.status = status;
      if (waypoints) route.waypoints = waypoints;
      if (actualEndTime) {
        route.actualEndTime = actualEndTime;
        if (route.startTime) {
          route.totalDuration = (new Date(actualEndTime) - route.startTime) / 60000; // minutes
        }
      }

      route.updatedBy = req.user._id;
      await route.save();
      await route.populate(['vehicle', 'driver']);

      logger.info('Route updated successfully', { routeId: route._id });

      res.status(200).json({
        success: true,
        message: 'Route updated successfully',
        data: route,
      });
    } catch (error) {
      logger.error('Error updating route', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Error updating route',
        error: error.message,
      });
    }
  }

  /**
   * Optimize route using AI
   */
  async optimizeRoute(req, res) {
    try {
      const { waypoints, algorithm, considerFactors, fuelConsumption, fuelPrice, driverHourlyRate, numAlternatives, constraints } = req.body;

      const routeData = {
        routeCode: `OPT-${uuidv4().slice(0, 8)}`,
        waypoints,
      };

      const parameters = {
        algorithm: algorithm || 'nearest-neighbor',
        considerFactors,
        fuelConsumption: fuelConsumption || 8,
        fuelPrice: fuelPrice || 1.5,
        driverHourlyRate: driverHourlyRate || 15,
        numAlternatives: numAlternatives || 2,
        constraints,
      };

      // Block optimization if route is completed
      if (routeData.status === 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Cannot optimize a completed route.',
        });
      }

      // Perform optimization
      const optimization = await routeOptimizationService.optimizeRoute(routeData, parameters);

      // if we have coordinates available, build a lat/lng path array in the
      // order determined by the optimized sequence; the frontend can render
      // this directly on the map.
      const path = [];
      if (Array.isArray(optimization.optimizedSequence) && Array.isArray(routeData.waypoints)) {
        optimization.optimizedSequence.forEach((idx) => {
          const wp = routeData.waypoints[idx];
          if (wp && typeof wp.latitude === 'number' && typeof wp.longitude === 'number') {
            path.push({ lat: wp.latitude, lng: wp.longitude });
          }
        });
      }

      logger.info('Route optimized successfully', { routeCode: routeData.routeCode });
      // Debug log for routePolyline
      if (optimization.metrics?.routePolyline) {
        logger.info('routePolyline length:', optimization.metrics.routePolyline.length);
        logger.info('routePolyline sample:', {
          first: optimization.metrics.routePolyline[0],
          last: optimization.metrics.routePolyline[optimization.metrics.routePolyline.length - 1],
        });
      } else {
        logger.warn('No routePolyline returned from optimization');
      }

      res.status(200).json({
        success: true,
        message: 'Route optimized successfully',
        data: {
          ...optimization,
          path,
          routePolyline: optimization.metrics?.routePolyline || null,
          polylineValid: Array.isArray(optimization.metrics?.routePolyline) && optimization.metrics.routePolyline.length > 1,
        },
      });
    } catch (error) {
      logger.error('Error optimizing route', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Error optimizing route',
        error: error.message,
      });
    }
  }

  /**
   * Create and save optimization result
   */
  async saveOptimization(req, res) {
    try {
      const { vehicle, driver, parameters, optimizedSequence, metrics, alternatives, algorithm, recommendations, originalRoute } = req.body;

      const optimization = new RouteOptimization({
        optimizationCode: `OPT-${uuidv4().slice(0, 8)}`,
        originalRoute,
        vehicle,
        driver,
        parameters,
        metrics,
        algorithm: algorithm || 'nearest-neighbor',
        waypointSequence: optimizedSequence,
        alternativeRoutes: alternatives || [],
        recommendations: recommendations || [],
        status: 'completed',
        createdBy: req.user._id,
      });

      await optimization.save();
      await optimization.populate(['vehicle', 'driver', 'originalRoute']);

      logger.info('Optimization saved successfully', { optimizationCode: optimization.optimizationCode });

      res.status(201).json({
        success: true,
        message: 'Optimization saved successfully',
        data: optimization,
      });
    } catch (error) {
      logger.error('Error saving optimization', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Error saving optimization',
        error: error.message,
      });
    }
  }

  /**
   * Accept optimization and create optimized route
   */
  async acceptOptimization(req, res) {
    try {
      const { optimizationId } = req.params;
      const { acceptedRoute } = req.body;

      const optimization = await RouteOptimization.findById(optimizationId);

      if (!optimization) {
        return res.status(404).json({
          success: false,
          message: 'Optimization not found',
        });
      }

      optimization.accepted = true;
      optimization.acceptedAt = new Date();
      optimization.acceptedBy = req.user._id;
      optimization.optimizedRoute = acceptedRoute;

      await optimization.save();

      logger.info('Optimization accepted', { optimizationCode: optimization.optimizationCode });

      res.status(200).json({
        success: true,
        message: 'Optimization accepted successfully',
        data: optimization,
      });
    } catch (error) {
      logger.error('Error accepting optimization', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Error accepting optimization',
        error: error.message,
      });
    }
  }

  /**
   * Get optimization history
   */
  async getOptimizationHistory(req, res) {
    try {
      const { vehicle, driver, status, page = 1, limit = 10 } = req.query;

      const filter = {};
      if (vehicle) filter.vehicle = vehicle;
      if (driver) filter.driver = driver;
      if (status) filter.status = status;

      const skip = (page - 1) * limit;

      const optimizations = await RouteOptimization.find(filter)
        .populate(['vehicle', 'driver', 'originalRoute', 'optimizedRoute'])
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

      const total = await RouteOptimization.countDocuments(filter);

      res.status(200).json({
        success: true,
        data: optimizations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Error fetching optimization history', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Error fetching optimization history',
        error: error.message,
      });
    }
  }

  /**
   * Get optimization details
   */
  async getOptimizationById(req, res) {
    try {
      const optimization = await RouteOptimization.findById(req.params.optimizationId)
        .populate(['vehicle', 'driver', 'originalRoute', 'optimizedRoute', 'acceptedBy']);

      if (!optimization) {
        return res.status(404).json({
          success: false,
          message: 'Optimization not found',
        });
      }

      res.status(200).json({
        success: true,
        data: optimization,
      });
    } catch (error) {
      logger.error('Error fetching optimization', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Error fetching optimization',
        error: error.message,
      });
    }
  }

  /**
   * Delete route
   */
  async deleteRoute(req, res) {
    try {
      const route = await Route.findByIdAndDelete(req.params.routeId);

      if (!route) {
        return res.status(404).json({
          success: false,
          message: 'Route not found',
        });
      }

      logger.info('Route deleted successfully', { routeId: route._id });

      res.status(200).json({
        success: true,
        message: 'Route deleted successfully()',
      });
    } catch (error) {
      logger.error('Error deleting route', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Error deleting route',
        error: error.message,
      });
    }
  }

  /**
   * Get route analytics and statistics
   */
  async getRouteAnalytics(req, res) {
    try {
      const { startDate, endDate, vehicle, driver } = req.query;

      const filter = {};
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
      }
      if (vehicle) filter.vehicle = vehicle;
      if (driver) filter.driver = driver;

      const routes = await Route.find(filter);
      const optimizations = await RouteOptimization.find(filter);

      const analytics = {
        totalRoutes: routes.length,
        completedRoutes: routes.filter(r => r.status === 'completed').length,
        activeRoutes: routes.filter(r => r.status === 'active').length,
        totalOptimizations: optimizations.length,
        acceptedOptimizations: optimizations.filter(o => o.accepted).length,

        totalDistance: routes.reduce((sum, r) => sum + (r.totalDistance || 0), 0),
        averageDistance: routes.length ? routes.reduce((sum, r) => sum + (r.totalDistance || 0), 0) / routes.length : 0,

        totalDuration: routes.reduce((sum, r) => sum + (r.totalDuration || 0), 0),
        averageDuration: routes.length ? routes.reduce((sum, r) => sum + (r.totalDuration || 0), 0) / routes.length : 0,

        totalCostSavings: optimizations.reduce((sum, o) => sum + (o.metrics?.costSavings || 0), 0),
        totalCO2Reduced: optimizations.reduce((sum, o) => sum + (o.metrics?.co2Reduction || 0), 0),
        averageEfficiency: optimizations.length ? optimizations.reduce((sum, o) => sum + (o.metrics?.efficiencyGain || 0), 0) / optimizations.length : 0
      };

      res.status(200).json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Error fetching route analytics', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Error fetching route analytics',
        error: error.message
      });
    }
  }
}

module.exports = new RouteController();
