const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
  vehicle: { type: mongoose.Schema.Types.Mixed },
  mechanic: { type: String },
  type: { type: String, default: 'service' },
  notes: { type: String },
  cost: { type: Number },
  date: { type: String },
  performedAt: { type: Date },
  nextDueAt: { type: Date }, // Added field for next service due date
  status: { type: String, enum: ['Scheduled', 'In Progress', 'Completed'], default: 'Scheduled' },
  createdBy: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

maintenanceSchema.index({ vehicle: 1 });
maintenanceSchema.index({ nextDueAt: 1 });

module.exports = mongoose.model('Maintenance', maintenanceSchema);
