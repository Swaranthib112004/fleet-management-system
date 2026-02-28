const Maintenance = require('../models/maintenanceModel');
const Analytics = require('../models/analyticsModel');
const mongoose = require('mongoose');

/**
 * Compute maintenance counts per month for the past `months` months (default 12).
 * Stores result as analytics document of type 'maintenance_trends'.
 */
exports.computeMaintenanceTrends = async (months = 12) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  // aggregation: group by year-month of nextDueAt or performedAt
  const pipeline = [
    { $match: { $or: [{ nextDueAt: { $exists: true } }, { performedAt: { $exists: true } }] } },
    { $addFields: { refDate: { $ifNull: ['$nextDueAt', '$performedAt'] } } },
    { $match: { refDate: { $gte: start, $lte: now } } },
    { $group: {
      _id: { year: { $year: '$refDate' }, month: { $month: '$refDate' } },
      count: { $sum: 1 },
      avgCost: { $avg: { $ifNull: ['$cost', 0] } }
    } },
    { $project: { year: '$_id.year', month: '$_id.month', count: 1, avgCost: 1, _id: 0 } },
    { $sort: { year: 1, month: 1 } }
  ];

  const results = await Maintenance.aggregate(pipeline);

  // Map results into arrays for Chart.js (labels + datasets)
  // Build labels for each month in range
  const labels = [];
  const dataMap = {};

  for (let i = 0; i < months; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const label = d.toLocaleString('default', { month: 'short', year: 'numeric' });
    labels.push(label);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    dataMap[key] = 0;
  }

  for (const r of results) {
    const key = `${r.year}-${r.month}`;
    if (key in dataMap) dataMap[key] = r.count;
  }

  const dataset = Object.keys(dataMap).map(k => dataMap[k]);

  const payload = { labels, datasets: [{ label: 'Maintenance Count', data: dataset }] };

  await Analytics.create({ type: 'maintenance_trends', data: payload, meta: { months }, computedAt: new Date() });

  return payload;
};
