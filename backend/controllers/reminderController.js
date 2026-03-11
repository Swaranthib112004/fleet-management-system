const Reminder = require('../models/reminderModel');

exports.createReminder = async (req, res, next) => {
  try {
    const { user, vehicle, type, message, scheduleAt } = req.body;
    const r = await Reminder.create({ user, vehicle, type, message, scheduleAt, createdBy: req.user ? req.user.id : undefined });
    res.status(201).json({ message: 'Reminder created', reminder: r });
  } catch (err) { next(err); }
};

exports.getReminders = async (req, res, next) => {
  try {
    const reminders = await Reminder.find().sort({ scheduleAt: 1 });
    res.json(reminders);
  } catch (err) { next(err); }
};

exports.getReminder = async (req, res, next) => {
  try { const r = await Reminder.findById(req.params.id); if (!r) return res.status(404).json({ message: 'Not found' }); res.json(r); } catch (err) { next(err); }
};

exports.cancelReminder = async (req, res, next) => { try { const r = await Reminder.findById(req.params.id); if (!r) return res.status(404).json({ message: 'Not found' }); r.status = 'cancelled'; await r.save(); res.json({ message: 'Cancelled', reminder: r }); } catch (err) { next(err); } };

exports.updateReminder = async (req, res, next) => {
  try {
    const r = await Reminder.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Not found' });
    const { status, scheduleAt, message } = req.body;
    if (status != null) r.status = status;
    if (scheduleAt != null) r.scheduleAt = new Date(scheduleAt);
    if (message != null) r.message = message;
    await r.save();
    res.json({ message: 'Reminder updated', reminder: r });
  } catch (err) { next(err); }
};
