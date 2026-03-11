let Agenda;
try {
  Agenda = require('agenda');
} catch (err) {
  Agenda = null; // will use shim if needed
}
const Reminder = require('../models/reminderModel');
const emailService = require('../services/emailService');

let agenda;
let shimInterval;

async function initAgenda(mongoConnectionString) {
  if (agenda) return agenda;

  if (Agenda) {
    agenda = new Agenda({ db: { address: mongoConnectionString, collection: 'agendaJobs' } });

    agenda.define('process-reminders', async (job) => {
      await processDueReminders();
    });

    await agenda.start();
    // run every minute
    await agenda.every('1 minute', 'process-reminders');

    // schedule maintenance check (uses same loop)
    agenda.define('maintenance-check', async (job) => {
      await processMaintenanceChecks();
    });
    await agenda.every('1 minute', 'maintenance-check');

    // define analytics job to compute maintenance trends (daily)
    agenda.define('compute-analytics', async () => {
      try { const analyticsService = require('../services/analyticsService'); await analyticsService.computeMaintenanceTrends(); } catch (e) { const logger = require('../utils/logger'); logger.error('Analytics job failed', { error: e.message }); }
    });
    await agenda.every('1 day', 'compute-analytics');

    return agenda;
  }

  // Fallback shim when Agenda is not installed (useful for tests or lightweight environments)
  agenda = {
    _fns: {},
    _intervals: [],
    define: (name, fn) => { agenda._fns[name] = fn; },
    start: async () => {},
    every: async (interval, name) => {
      // use short interval during tests
      const ms = process.env.NODE_ENV === 'test' ? 1000 : 60 * 1000;
      const mongoose = require('mongoose');
      const id = setInterval(() => {
        // only run when mongoose is connected to prevent 'Client must be connected' errors
        if (mongoose.connection && mongoose.connection.readyState === 1) {
          try {
            const fn = agenda._fns[name];
            if (typeof fn === 'function') fn();
          } catch (err) { const logger = require('../utils/logger'); logger.error('Shim job failed', { error: err.message }); }
        }
      }, ms);
      agenda._intervals.push(id);
    }
  };

  agenda.define('process-reminders', async () => {
    await processDueReminders();
  });

  await agenda.start();
  await agenda.every('1 minute', 'process-reminders');

  // Fallback maintenance check for shim or agenda
  agenda.define('maintenance-check', async () => { await processMaintenanceChecks(); });
  await agenda.every('1 minute', 'maintenance-check');

  return agenda;
}

async function processDueReminders() {
  const now = new Date();
  const due = await Reminder.find({ status: 'pending', scheduleAt: { $lte: now } });
  for (const r of due) {
    try {
      let to = null;
      if (r.user) {
        const User = require('../models/userModel');
        const u = await User.findById(r.user);
        if (u && u.email) to = u.email;
      }

      if (!to) {
        r.status = 'failed';
        await r.save();
        continue;
      }

      await emailService.sendEmail(to, `Reminder: ${r.type}`, r.message || 'You have a scheduled reminder');
      r.status = 'sent';
      r.sentAt = new Date();
      await r.save();
    } catch (err) {
      r.status = 'failed';
      await r.save();
    }
  }
}

async function processMaintenanceChecks() {
  let Maintenance;
  try { Maintenance = require('../models/maintenanceModel'); } catch (e) { Maintenance = null; }
  // fallback to mongoose.model if module system returned unexpected value
  if (!Maintenance || typeof Maintenance.find !== 'function') {
    try { const mongoose = require('mongoose'); Maintenance = mongoose.model('Maintenance'); } catch (e) { Maintenance = null; }
  }

  if (!Maintenance || typeof Maintenance.find !== 'function') {
    const logger = require('../utils/logger');
    logger.error('Maintenance model unavailable, skipping maintenance checks');
    return;
  }

  const now = new Date();

  // find maintenance records with nextDueAt and no reminder present
  const dueMaint = await Maintenance.find({ nextDueAt: { $exists: true } });
  let createdAny = false;
  for (const m of dueMaint) {
    try {
      // check if a reminder already exists for this maintenance (vehicle + nextDueAt)
      const existing = await Reminder.findOne({ vehicle: m.vehicle, scheduleAt: m.nextDueAt, type: 'maintenance' });
      if (existing) continue;

      // determine recipient: prefer vehicle's currentDriver, otherwise maintenance.createdBy
      let user = m.createdBy || null;
      const Vehicle = require('../models/vehicleModel');
      const v = await Vehicle.findById(m.vehicle);
      if (v && v.currentDriver) user = v.currentDriver;

      await Reminder.create({ user, vehicle: m.vehicle, type: 'maintenance', message: `Maintenance due for vehicle ${m.vehicle}`, scheduleAt: m.nextDueAt, createdBy: m.createdBy, status: 'pending' });
      createdAny = true;
    } catch (err) {
      // swallow errors to avoid crash; consider logging
      const logger = require('../utils/logger');
      logger.error('Maintenance check failed', { error: err.message });
    }
  }

  // If we created any reminders, process due reminders immediately to trigger sends (avoid timing races in short-lived test envs)
  if (createdAny) {
    try {
      await processDueReminders();
    } catch (err) {
      const logger = require('../utils/logger');
      logger.error('Processing reminders failed', { error: err.message });
    }
  }
}

module.exports = { initAgenda, agendaGetter: () => agenda, _teardown: () => { if (agenda && Array.isArray(agenda._intervals)) { agenda._intervals.forEach(id => clearInterval(id)); agenda._intervals = []; } } };
