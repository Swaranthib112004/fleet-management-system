const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.Mixed },
  vehicle: { type: mongoose.Schema.Types.Mixed },
  type: { type: String, default: 'other' },
  message: { type: String },
  scheduleAt: { type: Date },
  sentAt: { type: Date },
  status: { type: String, default: 'pending' },
  createdBy: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

reminderSchema.index({ scheduleAt: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);
