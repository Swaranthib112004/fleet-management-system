const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  type: { type: String, required: true },
  data: { type: Object, required: true },
  meta: { type: Object },
  computedAt: { type: Date, default: Date.now }
}, { timestamps: true });

analyticsSchema.index({ type: 1, computedAt: -1 });

module.exports = mongoose.model('Analytics', analyticsSchema);
