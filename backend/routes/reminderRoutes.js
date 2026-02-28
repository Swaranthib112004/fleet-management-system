const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');
const validate = require('../middleware/validateMiddleware');
const { createReminderSchema } = require('../validators/reminderValidator');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.post('/', verifyToken, requireRole('admin','manager'), validate(createReminderSchema), reminderController.createReminder);
router.get('/', verifyToken, requireRole('admin','manager'), reminderController.getReminders);
router.get('/:id', verifyToken, reminderController.getReminder);
router.post('/:id/cancel', verifyToken, requireRole('admin','manager'), reminderController.cancelReminder);

module.exports = router;