const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  // password is required only for manual registration; OAuth users may omit it
  password: { type: String },
  // Google OAuth identifier (unique, sparse index so null values are allowed)
  googleId: { type: String, unique: true, sparse: true },
  // Only Admin role allowed
  role: { type: String, enum: ['admin'], default: 'admin' }
}, { timestamps: true });

// ensure user has either password or googleId before saving
// synchronous throw avoids confusion with callback signature
userSchema.pre('save', function() {
  if (!this.password && !this.googleId) {
    throw new Error('User must have either a password or a googleId');
  }
});

module.exports = mongoose.model('User', userSchema);
