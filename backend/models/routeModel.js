const mongoose = require('mongoose');

const waypointSchema = new mongoose.Schema({
  latitude: { type: Number },
  longitude: { type: Number },
  address: { type: String },
  stopType: { type: String, default: 'delivery' },
  estimatedTime: { type: Date },
  actualTime: { type: Date },
  status: { type: String, default: 'pending' },
  notes: { type: String }
}, { timestamps: true });

const routeSchema = new mongoose.Schema({
  routeCode: { type: String },
  vehicle: { type: mongoose.Schema.Types.Mixed },
  driver: { type: mongoose.Schema.Types.Mixed },
  startLocation: {
    name: { type: String },
    latitude: { type: Number },
    longitude: { type: Number }
  },
  endLocation: {
    name: { type: String },
    latitude: { type: Number },
    longitude: { type: Number }
  },
  waypoints: [waypointSchema],
  status: { type: String, enum: ['pending', 'planned', 'in-progress', 'completed', 'active'], default: 'pending' },
  polylineValid: { type: Boolean, default: true }, // Indicates if the polyline is valid
  startTime: { type: Date },
  estimatedEndTime: { type: Date },
  actualEndTime: { type: Date },
  totalDistance: { type: Number },
  totalDuration: { type: Number },
  totalStops: { type: Number },
  optimizationScore: { type: Number },
  distanceSaved: { type: Number, default: 0 },
  timeSaved: { type: Number, default: 0 },
  costSavings: { type: Number, default: 0 },
  co2Reduction: { type: Number, default: 0 },
  efficiencyGain: { type: Number, default: 0 },
  routeType: { type: String, default: 'standard' },
  isOptimized: { type: Boolean, default: false },
  routePolyline: [{
    lat: { type: Number },
    lng: { type: Number }
  }],
  lastPosition: {
    lat: { type: Number },
    lng: { type: Number },
    waypointIndex: { type: Number, default: 0 }
  },
  createdBy: { type: mongoose.Schema.Types.Mixed },
  updatedBy: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

routeSchema.index({ vehicle: 1, createdAt: -1 });
routeSchema.index({ driver: 1, status: 1 });

module.exports = mongoose.model('Route', routeSchema);
