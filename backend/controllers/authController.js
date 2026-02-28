const User = require('../models/userModel');
const Token = require('../models/tokenModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const REFRESH_TOKEN_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '30', 10);

// Register
exports.registerUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // require password for manual registration
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({ name, email, password: hashedPassword, role });

    res.status(201).json({ message: 'User registered successfully', user });
  } catch (error) {
    next(error);
  }
};

// Login
exports.loginUser = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;
    // Validate the requested role (fall back to 'driver' if invalid/missing)
    const validRoles = ['admin', 'manager', 'driver', 'customer'];
    const selectedRole = validRoles.includes(role) ? role : 'driver';

    let user = await User.findOne({ email });

    // if user doesn't exist, create a new one with the selected role
    if (!user) {
      const hashed = password ? await bcrypt.hash(password, 10) : undefined;
      user = await User.create({
        name: email.split('@')[0] || email,
        email,
        password: hashed,
        role: selectedRole
      });
    } else {
      // existing user: if there's no password stored, hash the provided one
      if (!user.password && password) {
        user.password = await bcrypt.hash(password, 10);
      }
      // Update the user's role to the one selected on the login page
      user.role = selectedRole;
      await user.save();
      // we intentionally skip password comparison to allow "any" password
    }

    const accessToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });

    // create refresh token
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

    await Token.create({ token: refreshToken, user: user._id, expiresAt });

    res.status(200).json({
      message: 'Login successful',
      token: accessToken,
      refreshToken,
      user: { id: user._id, email: user.email, name: user.name, role: user.role }
    });
  } catch (error) {
    next(error);
  }
};

// Refresh token
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });

    const stored = await Token.findOne({ token: refreshToken });
    if (!stored || stored.revoked) return res.status(401).json({ message: 'Invalid refresh token' });
    if (stored.expiresAt < new Date()) return res.status(401).json({ message: 'Refresh token expired' });

    // rotate
    stored.revoked = true;
    await stored.save();

    const user = await User.findById(stored.user);
    if (!user) return res.status(401).json({ message: 'Invalid user' });

    const accessToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });

    const newRefresh = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
    await Token.create({ token: newRefresh, user: user._id, expiresAt });

    res.status(200).json({ accessToken, refreshToken: newRefresh });
  } catch (error) {
    next(error);
  }
};

// Logout (revoke)
exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });

    const stored = await Token.findOne({ token: refreshToken });
    if (stored) {
      stored.revoked = true;
      await stored.save();
    }

    res.status(200).json({ message: 'Logged out' });
  } catch (error) {
    next(error);
  }
};
