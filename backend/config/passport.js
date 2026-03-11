const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userModel');

// Configure Google strategy with credentials or mock for testing
// When requesting Google auth we send a `state` parameter containing the
// role selected on the frontend.  The callback below will parse the state
// and prefer that role when creating a new user.  Existing users keep their
// stored role.
// build callbackURL from env so it is easy to change between dev/prod
const googleConfig = {
  clientID: process.env.GOOGLE_CLIENT_ID || 'test-client-id',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'test-client-secret',
  callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
  passReqToCallback: true // needed so we can read req.query.state
};

// helpful when debugging redirect_uri_mismatch errors
if (process.env.NODE_ENV !== 'production') {
  console.log(`Google OAuth callbackURL set to: ${googleConfig.callbackURL}`);
}

passport.use(new GoogleStrategy(googleConfig, async (req, accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;

    // try to extract requested role from state parameter (URL decoded)
    let requestedRole;
    if (req.query && req.query.state) {
      try {
        const decoded = decodeURIComponent(req.query.state);
        const stateObj = JSON.parse(decoded);
        if (stateObj.role && ['admin', 'driver'].includes(stateObj.role)) {
          requestedRole = stateObj.role;
        }
      } catch (e) {
        // ignore malformed state
      }
    }

    console.log('Requested role:', requestedRole);
    console.log('User email:', email);

    // Check if user already exists
    let user = await User.findOne({ email });

    if (user) {
      // Update the user's role to the one selected on the login page,
      // consistent with how manual login works.
      if (requestedRole && user.role !== requestedRole) {
        user.role = requestedRole;
        await user.save();
      }
      return done(null, user);
    }

    // determine role for new user
    let role = requestedRole || 'driver'; // default driver
    // legacy domain-mapping fallback if no explicit role requested
    if (!requestedRole) {
      if (email.includes('@admin.')) {
        role = 'admin';
      }
    }

    // Create new user with Google data;
    // omit the password field entirely so schema pre-save validation is happy
    const newUserData = {
      name: profile.displayName,
      email: email,
      role: role,
      googleId: profile.id,
      profilePicture: profile.photos[0]?.value || null,
      createdBy: 'system'
    };
    const newUser = await User.create(newUserData);

    return done(null, newUser);
  } catch (error) {
    return done(error, null);
  }
}));

// Serialize user
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Check if using real credentials
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'test-client-id') {
  console.log('✅ Google OAuth configured with real credentials');
} else {
  console.warn('⚠️  Google OAuth using test credentials - testing mode enabled');
  console.warn('   To enable production OAuth, add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env');
}

module.exports = passport;
