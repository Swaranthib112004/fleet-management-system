const express = require('express');
const router = express.Router();
const {
  getOverview,
  getChartData,
  getActivities,
  getPieData,
  getAnalytics,
  getDriverDashboard,
} = require('../controllers/dashboardController');
const { verifyToken } = require('../middleware/authMiddleware');

// Common dashboard routes (admin & manager)
router.get('/overview', verifyToken, getOverview);
router.get('/chart', verifyToken, getChartData);
router.get('/pie', verifyToken, getPieData);
router.get('/activities', verifyToken, getActivities);
router.get('/analytics', verifyToken, getAnalytics);

// Role-specific dashboards
router.get('/driver', verifyToken, getDriverDashboard);


module.exports = router;
