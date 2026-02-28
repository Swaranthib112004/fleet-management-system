const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  registration: { type: String },
  make: { type: String },
  model: { type: String },
  year: { type: Number },
  type: { type: String, default: "Van" },
  fuel: { type: String, default: "Diesel" },
  mileage: { type: Number, default: 0 },
  status: { type: String, default: 'Active' },
  driver: { type: String, default: 'Unassigned' },
  lastService: { type: String },
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

module.exports = mongoose.model('Vehicle', vehicleSchema);
