const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  name: { type: String },
  licenseNumber: { type: String },
  licenseExpiry: { type: Date },
  contact: {
    phone: { type: String },
    email: { type: String }
  },
  assignedVehicle: { type: mongoose.Schema.Types.Mixed, default: null },
  status: { type: String, enum: ['Active', 'Inactive', 'active', 'inactive'], default: 'Active' },
  license: { type: String }, // support both license and licenseNumber for flexibility
  vehicle: { type: String }, // support both for display robustness
  documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Upload' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Driver', driverSchema);
