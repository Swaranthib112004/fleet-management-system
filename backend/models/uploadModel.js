const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  url: { type: String },
  mimetype: { type: String },
  size: { type: mongoose.Schema.Types.Mixed },
  category: { type: String, enum: ["All", "Insurance", "License", "Report", "Registration", "Compliance", "Other"], default: 'Other' },
  isManual: { type: Boolean, default: false },
  relatedTo: {
    kind: { type: String, enum: ['Vehicle', 'Driver', 'Maintenance', 'User', 'Other'], default: 'Other' },
    item: { type: mongoose.Schema.Types.ObjectId }
  },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Upload', uploadSchema);
