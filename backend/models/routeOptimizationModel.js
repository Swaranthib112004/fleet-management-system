const mongoose = require('mongoose');

const optimizationMetricsSchema = new mongoose.Schema({
  originalDistance: { type: Number },
  optimizedDistance: { type: Number },
  distanceSaved: { type: Number },
  originalDuration: { type: Number }, // in minutes
  optimizedDuration: { type: Number }, // in minutes
  timeSaved: { type: Number },
  fuelEstimate: { type: Number }, // in liters
  estimatedCost: { type: Number }, // in currency units
  costSavings: { type: Number },
  efficiencyGain: { type: Number }, // percentage
  co2Reduction: { type: Number } // in kg
}, { _id: false });

const routeOptimizationSchema = new mongoose.Schema({
  optimizationCode: { type: String, required: true, unique: true },
  originalRoute: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
  optimizedRoute: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  
  // Optimization parameters
  parameters: {
    consideredFactors: [String], // ['traffic', 'fuel', 'time', 'driver-hours', 'vehicle-capacity']
    timeWindow: {
      start: { type: Date },
      end: { type: Date }
    },
    constraints: {
      maxDistance: { type: Number },
      maxStops: { type: Number },
      driverMaxHours: { type: Number },
      vehicleCapacity: { type: Number }
    }
  },

  // Metrics
  metrics: optimizationMetricsSchema,

  // Algorithm information
  algorithm: { type: String, enum: ['genetic', 'simulated-annealing', 'nearest-neighbor', 'or-tools', 'custom'], default: 'or-tools' },
  version: { type: String },
  executionTime: { type: Number }, // in milliseconds

  // Status
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  accepted: { type: Boolean, default: false },
  acceptedAt: { type: Date },
  acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Recommendations
  recommendations: [String],

  // Results
  waypointSequence: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Route.waypoints' }],
  alternativeRoutes: [{
    rank: Number,
    distance: Number,
    duration: Number,
    metrics: optimizationMetricsSchema
  }],

  // Analytics
  realizationMetrics: {
    actualDistance: { type: Number },
    actualDuration: { type: Number },
    deviationRate: { type: Number }, // percentage deviation from optimized
    completedAt: { type: Date }
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String }
}, { timestamps: true });

routeOptimizationSchema.index({ vehicle: 1, status: 1 });
routeOptimizationSchema.index({ driver: 1, createdAt: -1 });
routeOptimizationSchema.index({ status: 1, accepted: 1 });

module.exports = mongoose.model('RouteOptimization', routeOptimizationSchema);
