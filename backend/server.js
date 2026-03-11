const express = require('express');
const http = require('http');
const path = require('path');
const dotenv = require('dotenv');
// Load .env from backend directory so it works when started from project root
dotenv.config({ path: path.join(__dirname, '.env') });

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

// Log starting environment
logger.info(`Starting server in ${process.env.NODE_ENV || 'development'} mode`);

const app = express();
const server = http.createServer(app);

// ─── MIDDLEWARE ORDER ────────────────────────────────────────────────────────
// Logging and security should be first
app.use(morgan('combined', { stream: logger.stream }));
app.use(helmet({
  contentSecurityPolicy: false, 
}));

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    const allowedOrigins = [process.env.FRONTEND_URL].filter(Boolean);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Fallback for production testing
    }
  },
  credentials: true
}));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000, 
    standardHeaders: true,
    legacyHeaders: false
  })
);

// Initialize session
app.use(session({
  secret: process.env.SESSION_SECRET || 'fleet-management-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

// Basic API status
app.get('/api', (req, res) => {
  res.json({ status: 'running', env: process.env.NODE_ENV });
});

// Root route (always present) to avoid "Cannot GET /" errors in deployed environments.
// If you're serving the frontend from a separate static service (recommended on Render),
// this will simply return a small JSON payload.
app.get('/', (req, res) => {
  res.json({ message: "Fleet Management API is running. Serve the frontend separately or enable static build serving." });
});

// Global error handler
app.use(errorHandler);

// Initialize Socket.IO with SocketIOManager
const socketIOManager = new SocketIOManager(server);

const PORT = process.env.PORT || 8000;

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

// Trigger nodemon restart again and again - Sync check 1
