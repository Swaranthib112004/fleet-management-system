const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  perms: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Role', roleSchema);
