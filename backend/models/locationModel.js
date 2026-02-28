// Location Tracking Database Model
// Location: backend/models/locationModel.js

const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
      index: true
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      index: true
    },
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    },
    altitude: {
      type: Number,
      default: 0
    },
    accuracy: {
      type: Number,
      default: 10
    },
    speed: {
      type: Number,
      default: 0,
      min: 0
    },
    heading: {
      type: Number,
      default: 0,
      min: 0,
      max: 360
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String
    },
    geolocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        required: true
      }
    },
    isMoving: {
      type: Boolean,
      default: false
    },
    lastStop: Date,
    duration: {
      type: Number,
      default: 0
    },
    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route'
    },
    fuelLevel: Number,
    batteryLevel: Number,
    engineStatus: {
      type: String,
      enum: ['on', 'off', 'idle'],
      default: 'off'
    },
    temperature: Number,
    odometer: Number,
    tripDistance: {
      type: Number,
      default: 0
    },
    tripDuration: {
      type: Number,
      default: 0
    },
    averageSpeed: {
      type: Number,
      default: 0
    },
    maxSpeed: {
      type: Number,
      default: 0
    },
    deviceId: String,
    signalStrength: {
      type: Number,
      min: 0,
      max: 100
    },
    gpsQuality: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor'],
      default: 'good'
    },
    tags: [String],
    metadata: mongoose.Schema.Types.Mixed,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isArchived: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    indexes: [
      { vehicle: 1, createdAt: -1 },
      { 'geolocation.coordinates': '2dsphere' },
      { createdAt: -1 },
      { vehicle: 1, isMoving: 1 },
      { driver: 1, createdAt: -1 }
    ]
  }
);

// Geospatial index for proximity queries
locationSchema.index({ 'geolocation.coordinates': '2dsphere' });

// Compound indexes for common queries
locationSchema.index({ vehicle: 1, createdAt: -1 });
locationSchema.index({ vehicle: 1, isMoving: 1 });
locationSchema.index({ driver: 1, createdAt: -1 });

// TTL index - auto-delete old location data after 90 days
locationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('Location', locationSchema);
