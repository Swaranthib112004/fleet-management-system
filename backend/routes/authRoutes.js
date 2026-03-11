const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { registerUser, loginUser, refreshToken, logout } = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const router = express.Router();

// Traditional routes
router.post('/register', registerUser);
// Add GET /login for browser access or health check
router.get('/login', (req, res) => {
  res.status(200).json({ message: 'Login endpoint. Use POST for authentication.' });
});
router.post('/login', loginUser);
// refresh token endpoint does not require an access token; callers provide
// the refresh token itself
router.post('/refresh', refreshToken);
router.post('/logout', verifyToken, logout);

// Google OAuth routes (only register if real credentials are provided)
const googleEnabled =
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CLIENT_ID !== 'test-client-id';

if (googleEnabled) {
  // Accept a `role` query parameter from the frontend and encode it into
  // the OAuth state value.  The passport strategy will later decode it and
  // use it when creating a new user.
  router.get('/google', (req, res, next) => {
    const { role } = req.query;
    console.log('Google OAuth role:', role);
    // JSON state must be URL-encoded so it survives the OAuth redirect safely
    const rawState = JSON.stringify({ role });
    const encodedState = encodeURIComponent(rawState);
    console.log('Google OAuth state:', rawState);
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      state: encodedState
    })(req, res, next);
  });

  router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login?error=true', session: false }),
    (req, res) => {
      try {
        // Generate JWT token
        const accessToken = jwt.sign(
          { id: req.user._id, role: req.user.role },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
        );

        // Redirect to frontend with token
        const roleRoutes = {
          admin: '/app',
          manager: '/app/manager-dashboard',
          driver: '/app',
          customer: '/app/customer-dashboard' // Updated to match frontend
        };

        const redirectUrl = `${process.env.FRONTEND_URL}${roleRoutes[req.user.role] || '/dashboard'}?token=${accessToken}`;
        res.redirect(redirectUrl);
      } catch (error) {
        res.redirect(`${process.env.FRONTEND_URL}/login?error=authentication_failed`);
      }
    }
  );
} else {
  console.warn('⚠️ Google OAuth routes disabled (missing credentials)');
}

// Get current user
router.get('/me', verifyToken, async (req, res, next) => {
  try {
    // Try to get user from DB if available
    const User = require('../models/userModel');
    const user = await User.findById(req.user.id).select('-password');
    
    if (user) {
      return res.json({ user: { id: user._id, email: user.email, name: user.name, role: user.role } });
    }
    
    // Fall back to JWT payload if user not in DB (e.g., on fresh login before DB sync)
    res.json({ user: req.user });
  } catch (err) {
    // Fall back to JWT payload on any error
    res.json({ user: req.user });
  }
});

module.exports = router;
