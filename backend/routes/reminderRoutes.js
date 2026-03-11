const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');
const validate = require('../middleware/validateMiddleware');
const { createReminderSchema } = require('../validators/reminderValidator');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.post('/', verifyToken, requireRole('admin'), validate(createReminderSchema), reminderController.createReminder);
router.get('/', verifyToken, requireRole('admin'), reminderController.getReminders);
router.get('/:id', verifyToken, reminderController.getReminder);
router.post('/:id/cancel', verifyToken, requireRole('admin'), reminderController.cancelReminder);
router.put('/:id', verifyToken, requireRole('admin'), reminderController.updateReminder);

module.exports = router;