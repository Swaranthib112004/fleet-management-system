const mongoose = require('mongoose');

// user can be ObjectId (ref User) or string (e.g. "current", or display name from frontend)
const auditSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.Mixed },
  action: { type: String, required: true },
  target: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Audit', auditSchema);
