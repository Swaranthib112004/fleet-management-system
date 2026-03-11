// GPS Tracking & Location Service
// Location: backend/services/gpsTrackingService.js

const Location = require('../models/locationModel');
const Vehicle = require('../models/vehicleModel');
const Route = require('../models/routeModel');
const logger = require('../utils/logger');

class GPSTrackingService {
  constructor() {
    this.simulations = new Map();
    this.locationCache = new Map();
  }

  /**
   * Create or update location record
   * Real-time location from GPS device or simulation
   */
  async updateLocation(vehicleId, locationData) {
    try {
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) {
        throw new Error(`Vehicle ${vehicleId} not found`);
      }

      // Calculate geolocation coordinates
      const geolocation = {
        type: 'Point',
        coordinates: [locationData.longitude, locationData.latitude]
      };

      // Create or update location document
      const location = await Location.findOneAndUpdate(
        { vehicle: vehicleId },
        {
          vehicle: vehicleId,
          driver: locationData.driver,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          altitude: locationData.altitude || 0,
          speed: locationData.speed || 0,
          heading: locationData.heading || 0,
          accuracy: locationData.accuracy || 10,
          address: locationData.address,
          geolocation,
          isMoving: locationData.speed > 1,
          engineStatus: locationData.engineStatus || 'off',
          fuelLevel: locationData.fuelLevel,
          batteryLevel: locationData.batteryLevel,
          temperature: locationData.temperature,
          odometer: locationData.odometer,
          tripDistance: locationData.tripDistance,
          tripDuration: locationData.tripDuration,
          averageSpeed: locationData.averageSpeed,
          maxSpeed: locationData.maxSpeed,
          deviceId: locationData.deviceId,
          signalStrength: locationData.signalStrength,
          gpsQuality: this.calculateGPSQuality(locationData.accuracy),
          metadata: locationData.metadata || {}
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // Cache location for quick access
      this.locationCache.set(vehicleId, {
        ...location.toObject(),
        cachedAt: new Date()
      });

      // Update vehicle status based on movement
      if (locationData.speed > 1) {
        await Vehicle.findByIdAndUpdate(vehicleId, { status: 'active' });
      }

      return location;
    } catch (error) {
      logger.error('Error updating location:', error, { vehicleId });
      throw error;
    }
  }

  /**
   * Get current location of vehicle
   */
  async getCurrentLocation(vehicleId) {
    try {
      // Check cache first
      const cached = this.locationCache.get(vehicleId);
      if (cached && new Date() - cached.cachedAt < 5000) {
        return cached;
      }

      const location = await Location.findOne({ vehicle: vehicleId })
        .populate('vehicle', 'licensePlate make model')
        .populate('driver', 'name contact');

      if (location) {
        this.locationCache.set(vehicleId, {
          ...location.toObject(),
          cachedAt: new Date()
        });
      }

      return location;
    } catch (error) {
      logger.error('Error getting current location:', error, { vehicleId });
      throw error;
    }
  }

  /**
   * Get location history for vehicle
   */
  async getLocationHistory(vehicleId, options = {}) {
    try {
      const {
        limit = 100,
        skip = 0,
        startDate,
        endDate,
        simplify = false
      } = options;

      const query = { vehicle: vehicleId };

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const locations = await Location.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .select(
          simplify
            ? 'latitude longitude createdAt speed'
            : '-metadata -__v'
        );

      const total = await Location.countDocuments(query);

      return {
        data: locations,
        pagination: {
          total,
          limit,
          skip,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting location history:', error, { vehicleId });
      throw error;
    }
  }

  /**
   * Find vehicles within radius
   * Geospatial query
   */
  async getVehiclesNearby(longitude, latitude, radiusMeters = 5000) {
    try {
      const locations = await Location.aggregate([
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [longitude, latitude]
            },
            distanceField: 'distance',
            maxDistance: radiusMeters,
            spherical: true
          }
        },
        {
          $lookup: {
            from: 'vehicles',
            localField: 'vehicle',
            foreignField: '_id',
            as: 'vehicleInfo'
          }
        },
        {
          $limit: 50
        }
      ]);

      return locations;
    } catch (error) {
      logger.error('Error finding nearby vehicles:', error);
      throw error;
    }
  }

  /**
   * Calculate trip analytics
   */
  async calculateTripAnalytics(vehicleId, startTime, endTime) {
    try {
      const locations = await Location.find({
        vehicle: vehicleId,
        createdAt: { $gte: startTime, $lte: endTime }
      }).sort({ createdAt: 1 });

      if (locations.length === 0) {
        return null;
      }

      let totalDistance = 0;
      let totalDuration = 0;
      let maxSpeed = 0;
      let avgSpeed = 0;
      let fuelConsumed = 0;
      let emissions = 0;
      let idleTime = 0;

      for (let i = 1; i < locations.length; i++) {
        const prev = locations[i - 1];
        const current = locations[i];

        // Distance calculation (haversine)
        const distance = this.haversineDistance(
          prev.latitude,
          prev.longitude,
          current.latitude,
          current.longitude
        );
        totalDistance += distance;

        // Duration
        const duration = (current.createdAt - prev.createdAt) / 1000 / 60; // minutes
        totalDuration += duration;

        // Speed statistics
        if (current.speed > maxSpeed) maxSpeed = current.speed;

        // Idle time
        if (current.speed < 1) {
          idleTime += duration;
        }

        // Fuel consumption (estimate: 8 liters/100km)
        fuelConsumed += (distance / 1000) * 0.08;

        // CO2 emissions (2.3 kg per liter)
        emissions += fuelConsumed * 2.3;
      }

      avgSpeed = totalDistance > 0 ? (totalDistance / totalDuration) * 60 : 0; // km/h

      return {
        totalDistance: parseFloat(totalDistance.toFixed(2)),
        totalDuration: parseFloat(totalDuration.toFixed(2)),
        avgSpeed: parseFloat(avgSpeed.toFixed(2)),
        maxSpeed: parseFloat(maxSpeed.toFixed(2)),
        fuelConsumed: parseFloat(fuelConsumed.toFixed(2)),
        emissions: parseFloat(emissions.toFixed(2)),
        idleTime: parseFloat(idleTime.toFixed(2)),
        stops: locations.filter(l => l.speed < 1).length,
        dataPoints: locations.length,
        startPoint: {
          lat: locations[0].latitude,
          lng: locations[0].longitude,
          time: locations[0].createdAt
        },
        endPoint: {
          lat: locations[locations.length - 1].latitude,
          lng: locations[locations.length - 1].longitude,
          time: locations[locations.length - 1].createdAt
        }
      };
    } catch (error) {
      logger.error('Error calculating trip analytics:', error, { vehicleId });
      throw error;
    }
  }

  /**
   * Start GPS simulation for vehicle
   * For testing and demo purposes
   */
  async startSimulation(vehicleId, route, options = {}) {
    try {
      const {
        speed = 60, // km/h
        interval = 5000, // ms
        randomness = 0.1
      } = options;

      if (this.simulations.has(vehicleId)) {
        this.stopSimulation(vehicleId);
      }

      // Use real route polyline if available
      let waypoints = route.routePolyline || route.waypoints || [
        { latitude: 40.7128, longitude: -74.006 },
        { latitude: 40.758, longitude: -73.9855 },
        { latitude: 40.7489, longitude: -73.968 }
      ];
      // Convert polyline to waypoints if needed
      if (Array.isArray(waypoints) && waypoints.length && waypoints[0].lat !== undefined) {
        waypoints = waypoints.map(p => ({ latitude: p.lat, longitude: p.lng }));
      }

      let currentPoint = 0;
      let progress = 0;

      const maxSpeed = options.maxSpeed || 40; // km/h default
      const simulationInterval = setInterval(async () => {
        try {
          // Get current and next waypoint
          const start = waypoints[currentPoint];
          const end = waypoints[(currentPoint + 1) % waypoints.length];

          // Interpolate position
          const distance = this.haversineDistance(
            start.latitude,
            start.longitude,
            end.latitude,
            end.longitude
          );
          // Enforce speed limit
          const enforcedSpeed = Math.min(speed, maxSpeed);
          const stepDistance = (enforcedSpeed / 3.6) * (interval / 1000); // Convert km/h to m/s
          progress += stepDistance / distance;

          if (progress >= 1) {
            progress = 0;
            currentPoint = (currentPoint + 1) % waypoints.length;
          }

          // Linear interpolation
          const lat =
            start.latitude +
            (end.latitude - start.latitude) * progress +
            (Math.random() - 0.5) * randomness;
          const lng =
            start.longitude +
            (end.longitude - start.longitude) * progress +
            (Math.random() - 0.5) * randomness;

          // Update location
          await this.updateLocation(vehicleId, {
            latitude: lat,
            longitude: lng,
            speed: enforcedSpeed,
            heading: this.calculateHeading(
              start.latitude,
              start.longitude,
              end.latitude,
              end.longitude
            ),
            engineStatus: 'on',
            fuelLevel: 100 - (Math.random() * 0.1),
            batteryLevel: 100,
            temperature: 85 + Math.random() * 10,
            metadata: {
              simulated: true,
              simulationTime: new Date(),
              routePolyline: route.routePolyline || null
            }
          });
        } catch (error) {
          logger.error('Simulation interval error:', error, { vehicleId });
        }
      }, interval);

      this.simulations.set(vehicleId, {
        interval: simulationInterval,
        startTime: new Date(),
        routeId: route._id,
        speed,
        active: true
      });

      logger.info(`GPS simulation started for vehicle ${vehicleId}`, {
        speed,
        interval,
        waypoints: waypoints.length
      });

      return {
        status: 'started',
        vehicleId,
        speed,
        interval
      };
    } catch (error) {
      logger.error('Error starting simulation:', error, { vehicleId });
      throw error;
    }
  }

  /**
   * Stop GPS simulation
   */
  stopSimulation(vehicleId) {
    const sim = this.simulations.get(vehicleId);
    if (sim) {
      clearInterval(sim.interval);
      this.simulations.delete(vehicleId);
      logger.info(`GPS simulation stopped for vehicle ${vehicleId}`);
      return true;
    }
    return false;
  }

  /**
   * Get active simulations
   */
  getActiveSimulations() {
    return Array.from(this.simulations.entries()).map(([vehicleId, sim]) => ({
      vehicleId,
      ...sim,
      uptime: new Date() - sim.startTime
    }));
  }

  // Helper methods

  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  }

  calculateHeading(lat1, lon1, lat2, lon2) {
    const dLon = lon2 - lon1;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const heading = Math.atan2(y, x) * (180 / Math.PI);
    return (heading + 360) % 360;
  }

  calculateGPSQuality(accuracy) {
    if (accuracy < 5) return 'excellent';
    if (accuracy < 10) return 'good';
    if (accuracy < 25) return 'fair';
    return 'poor';
  }

  /**
   * Clean location cache periodically
   */
  cleanCache() {
    const now = new Date();
    for (const [vehicleId, cached] of this.locationCache.entries()) {
      if (now - cached.cachedAt > 60000) {
        this.locationCache.delete(vehicleId);
      }
    }
  }
}

module.exports = new GPSTrackingService();
