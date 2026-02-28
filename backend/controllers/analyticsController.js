const Analytics = require('../models/analyticsModel');
const analyticsService = require('../services/analyticsService');

exports.getLatestMaintenanceTrends = async (req, res, next) => {
  try {
    // allow months query param
    const months = parseInt(req.query.months, 10) || 12;

    // try to find latest cached analytics
    const latest = await Analytics.findOne({ type: 'maintenance_trends' }).sort({ computedAt: -1 });

    if (latest && latest.meta && latest.meta.months === months) {
      return res.json(latest.data);
    }

    // otherwise compute on demand
    const payload = await analyticsService.computeMaintenanceTrends(months);
    res.json(payload);
  } catch (err) { next(err); }
};

// Analytics Summary - provides high-level overview
exports.getSummary = async (req, res, next) => {
  try {
    // Get basic summary data
    const summary = {
      timestamp: new Date().toISOString(),
      metrics: {
        totalVehicles: 0,
        totalDrivers: 0,
        totalMaintenanceRecords: 0,
        pendingMaintenanceCount: 0,
        averageFleetHealthScore: 0
      },
      status: 'summary_available'
    };
    
    // Return summary (can be extended with actual data queries)
    res.json(summary);
  } catch (err) { next(err); }
};
