const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  target: { type: String },
  // "time" is effectively createdAt; we rely on timestamps
}, { timestamps: true });

module.exports = mongoose.model('Audit', auditSchema);
