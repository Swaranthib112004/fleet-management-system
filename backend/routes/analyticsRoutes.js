const express = require('express');
const router = express.Router();
const { getLatestMaintenanceTrends, getSummary } = require('../controllers/analyticsController');

// GET /api/analytics/maintenance/trends?months=12
router.get('/maintenance/trends', getLatestMaintenanceTrends);

// GET /api/analytics/summary - High-level analytics overview
router.get('/summary', getSummary);

module.exports = router;
