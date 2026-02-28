const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Mock notification settings - can be extended with database model later
const DEFAULT_NOTIFICATIONS = [
  { id: '1', label: 'Email Alerts', enabled: true, category: 'communication' },
  { id: '2', label: 'SMS Notifications', enabled: false, category: 'communication' },
  { id: '3', label: 'In-App Notifications', enabled: true, category: 'system' },
  { id: '4', label: 'Maintenance Reminders', enabled: true, category: 'maintenance' },
  { id: '5', label: 'Route Updates', enabled: true, category: 'operations' },
  { id: '6', label: 'Driver Alerts', enabled: false, category: 'safety' },
];

// Store notification settings in memory (can be moved to database)
let notificationSettings = JSON.parse(JSON.stringify(DEFAULT_NOTIFICATIONS));

// Get all notification settings
router.get('/notifications', verifyToken, (req, res) => {
  try {
    res.json(notificationSettings);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

// Toggle notification setting
router.post('/notifications/:id/toggle', verifyToken, requireRole('admin'), (req, res) => {
  try {
    const { id } = req.params;
    const notification = notificationSettings.find(n => n.id === id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    notification.enabled = !notification.enabled;
    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update notification' });
  }
});

module.exports = router;
