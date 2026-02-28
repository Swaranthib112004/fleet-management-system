// Utility script to remove all data from the fleet_management database.
// Run with: node clearDatabase.js

const mongoose = require('mongoose');
const Vehicle = require('./models/vehicleModel');
const Driver = require('./models/driverModel');
const Maintenance = require('./models/maintenanceModel');
const Route = require('./models/routeModel');
const Analytics = require('./models/analyticsModel');
const Reminder = require('./models/reminderModel');
const Upload = require('./models/uploadModel');
const User = require('./models/userModel');
const Location = require('./models/locationModel');
const AuditLog = require('./models/auditModel');
const Role = require('./models/roleModel');

async function clear() {
  const mongoUri = process.env.MONGO_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/fleet-management';
  await mongoose.connect(mongoUri);
  console.log('Connected to mongodb, clearing collections...');

  const models = [
    User,
    Driver,
    Vehicle,
    Maintenance,
    Route,
    Analytics,
    Reminder,
    Upload,
    Location,
    AuditLog,
    Role,
  ];

  for (const M of models) {
    try {
      await M.deleteMany({});
      console.log(`  • cleared ${M.modelName}`);
    } catch (err) {
      console.error(`failed to clear ${M.modelName}:`, err.message);
    }
  }

  console.log('All collections emptied.');
  await mongoose.disconnect();
  process.exit(0);
}

clear().catch(err => {
  console.error(err);
  process.exit(1);
});