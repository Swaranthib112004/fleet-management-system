const express = require('express');
const http = require('http');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./config/db');
const cors = require('cors');
const session = require('express-session');
const passport = require('./config/passport');
const SocketIOManager = require('./config/socketio');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorMiddleware');

connectDB().then(() => {
  if (process.env.NODE_ENV !== 'production') {
    const { ensureTestData } = require('./utils/seedUsers');
    ensureTestData().catch(err => logger.error('Seed error:', err));
  }
});

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: function (origin, callback) {
    // allow development frontends on localhost regardless of port
    if (!origin || /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3000'
    ].filter(Boolean);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve uploaded files from the backend-level uploads folder
const uploadsPath = path.join(__dirname, 'uploads');
// If PROTECT_UPLOADS=true, require an Authorization Bearer token to access files.
// Otherwise serve uploads publicly (legacy behavior).
if (process.env.PROTECT_UPLOADS === 'true') {
  const { verifyToken } = require('./middleware/authMiddleware');
  app.get('/uploads/:filename', verifyToken, (req, res) => {
    const options = { root: uploadsPath };
    res.sendFile(req.params.filename, options, (err) => {
      if (err) {
        logger.warn(`Upload file not found: ${req.params.filename}`);
        return res.status(404).json({ message: 'File not found' });
      }
    });
  });
} else {
  app.use('/uploads', express.static(uploadsPath));
}

// Session & Passport setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'fleet-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax'
  }
}));
app.use(passport.initialize());
app.use(passport.session());

// Basic API status endpoint (must be before other /api routes)
app.get('/api', (req, res) => {
  res.json({
    status: 'running',
    message: 'Fleet Management API is running',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/ai', require('./routes/aiAssistantRoutes'));

app.use('/api/vehicles', require('./routes/vehicleRoutes'));
app.use('/api/uploads', require('./routes/uploadRoutes'));
app.use('/api/reminders', require('./routes/reminderRoutes'));
app.use('/api/drivers', require('./routes/driverRoutes'));
app.use('/api/maintenance', require('./routes/maintenanceRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/routes', require('./routes/routeRoutes'));
app.use('/api/gps', require('./routes/gpsRoutes'));
app.use('/api/predictive', require('./routes/predictiveRoutes'));
app.use('/api/roles', require('./routes/roleRoutes'));
app.use('/api/audit', require('./routes/auditRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
console.log('registering dashboardRoutes');
const dashboardRouter = require('./routes/dashboardRoutes');
console.log('dashboardRoutes module loaded', typeof dashboardRouter);
app.use('/api/dashboard', dashboardRouter);

// Health check endpoint for monitoring/docker
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// If running in production mode, serve the built frontend from the backend
if (process.env.NODE_ENV === 'production') {
  // make sure the path matches the actual frontend folder name; earlier a stray
  // "(1)" had crept in which meant the server never found the built assets,
  // causing every request to return an empty response (blank page).
  const frontendDist = path.join(__dirname, '..', 'Frontend Module Breakdown', 'dist');

  // warn if the directory doesn't exist so it's easier to spot misconfiguration
  try {
    const stat = require('fs').statSync(frontendDist);
    if (!stat.isDirectory()) {
      logger.warn('Frontend dist path exists but is not a directory', { path: frontendDist });
    }
  } catch (err) {
    logger.warn('Frontend dist directory not found, static files will 404', { path: frontendDist, error: err.message });
  }

  app.use(express.static(frontendDist));
  // All non‑API routes should serve index.html so that client‑side routing works
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).send('API route not found');
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Security
app.use(helmet());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT || '100', 10),
    standardHeaders: true,
    legacyHeaders: false
  })
);

// Logging
app.use(morgan('combined', { stream: logger.stream }));

// Global error handler (should be last middleware)
app.use(errorHandler);

// Initialize Socket.IO with SocketIOManager
const socketIOManager = new SocketIOManager(server);

const PORT = process.env.PORT || 5000;

// export the express app as default for tests; attach others as properties
module.exports = app;
module.exports.server = server;

if (require.main === module) {
  // Attempt to start once; exit on fatal errors (e.g. port in use).
  server.listen(PORT, () => logger.info(`🚀 Server running on port ${PORT}`))
    .on('error', (err) => {
      if (err && err.code === 'EADDRINUSE') {
        logger.error(`❌ Port ${PORT} is already in use. Exiting.`);
        process.exit(1);
      }
      logger.error(`❌ Server error: ${err && err.message ? err.message : err}`);
      process.exit(1);
    });
}

// trigger restart
// Trigger nodemon restart
