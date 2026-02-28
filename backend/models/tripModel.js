const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  tripCode: { type: String, unique: true },
  vehicle: { type: mongoose.Schema.Types.Mixed },
  driver: { type: mongoose.Schema.Types.Mixed },
  route: { type: mongoose.Schema.Types.Mixed },
  startLocation: {
    name: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    timestamp: { type: Date }
  },
  endLocation: {
    name: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    timestamp: { type: Date }
  },
  status: { type: String, default: 'pending', enum: ['pending', 'in-progress', 'completed', 'cancelled'] },
  startTime: { type: Date },
  estimatedEndTime: { type: Date },
  actualEndTime: { type: Date },
  totalDistance: { type: Number, default: 0 },
  totalDuration: { type: Number, default: 0 },
  fuelUsed: { type: Number, default: 0 },
  cost: { type: Number, default: 0 },
  stops: { type: Number, default: 0 },
  notes: { type: String },
  documents: [{ type: mongoose.Schema.Types.Mixed }],
  createdBy: { type: mongoose.Schema.Types.Mixed },
  updatedBy: { type: mongoose.Schema.Types.Mixed }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function (doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
    }
  }
});

tripSchema.index({ vehicle: 1, createdAt: -1 });
tripSchema.index({ driver: 1, status: 1 });
tripSchema.index({ startTime: 1, endTime: 1 });

module.exports = mongoose.model('Trip', tripSchema);
