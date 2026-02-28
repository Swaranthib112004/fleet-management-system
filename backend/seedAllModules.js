// This script will add sample data to all main MongoDB collections for your Fleet Management System.
// Run with: node seedAllModules.js (after installing mongoose and connecting to your DB)

const mongoose = require('mongoose');
const Vehicle = require('./models/vehicleModel');
const Driver = require('./models/driverModel');
const Maintenance = require('./models/maintenanceModel');
const Route = require('./models/routeModel');
const Analytics = require('./models/analyticsModel');
const Reminder = require('./models/reminderModel');
const Upload = require('./models/uploadModel');
const User = require('./models/userModel');

async function seed() {
  const mongoUri = process.env.MONGO_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/fleet-management';
  await mongoose.connect(mongoUri);

  // Clear all collections before seeding
  await User.deleteMany({});
  await Driver.deleteMany({});
  await Vehicle.deleteMany({});
  await Maintenance.deleteMany({});
  await Route.deleteMany({});
  await Analytics.deleteMany({});
  await Reminder.deleteMany({});
  await Upload.deleteMany({});

  // Create users
  const users = await User.create([
    { name: 'Admin User', email: 'admin@example.com', password: 'securepassword', role: 'admin' },
    { name: 'Manager User', email: 'manager@example.com', password: 'securepassword', role: 'manager' },
    { name: 'Driver User', email: 'driver@example.com', password: 'securepassword', role: 'driver' }
  ]);
  const [admin, manager, driverUser] = users;

  // Create drivers
  const drivers = await Driver.create([
    { name: 'Rajesh Kumar', licenseNumber: 'DL1234567890', licenseExpiry: new Date('2027-12-31'), contact: { phone: '9876543210', email: 'rajesh@example.com' }, createdBy: admin._id },
    { name: 'Sunita Sharma', licenseNumber: 'DL9876543210', licenseExpiry: new Date('2028-06-30'), contact: { phone: '9123456789', email: 'sunita@example.com' }, createdBy: manager._id },
    { name: 'Amit Singh', licenseNumber: 'DL1928374650', licenseExpiry: new Date('2026-11-15'), contact: { phone: '9988776655', email: 'amit@example.com' }, createdBy: admin._id }
  ]);

  // Create vehicles
  const vehicles = await Vehicle.create([
    { vin: '1HGCM82633A004352', licensePlate: 'DL8CAF1234', make: 'Toyota', model: 'Innova', year: 2022, status: 'active', currentDriver: drivers[0]._id, createdBy: admin._id },
    { vin: '2HGCM82633A004353', licensePlate: 'DL8CAF5678', make: 'Honda', model: 'City', year: 2021, status: 'maintenance', currentDriver: drivers[1]._id, createdBy: manager._id },
    { vin: '3HGCM82633A004354', licensePlate: 'DL8CAF9101', make: 'Hyundai', model: 'Creta', year: 2020, status: 'inactive', currentDriver: drivers[2]._id, createdBy: admin._id }
  ]);

  // Create maintenance records
  await Maintenance.create([
    { vehicle: vehicles[0]._id, performedBy: admin._id, type: 'service', notes: 'Oil change and filter replacement', cost: 1200, performedAt: new Date('2026-02-01'), createdBy: admin._id },
    { vehicle: vehicles[1]._id, performedBy: manager._id, type: 'inspection', notes: 'Brake check', cost: 800, performedAt: new Date('2026-01-15'), createdBy: manager._id },
    { vehicle: vehicles[2]._id, performedBy: admin._id, type: 'repair', notes: 'Engine repair', cost: 5000, performedAt: new Date('2025-12-10'), createdBy: admin._id }
  ]);

  // Create routes
  await Route.create([
    { routeCode: 'DEL-NOI-001', vehicle: vehicles[0]._id, driver: drivers[0]._id, startLocation: { name: 'New Delhi', latitude: 28.6139, longitude: 77.2090 }, endLocation: { name: 'Noida City Centre', latitude: 28.5355, longitude: 77.3910 }, status: 'planned', createdBy: admin._id },
    { routeCode: 'DEL-GUR-002', vehicle: vehicles[1]._id, driver: drivers[1]._id, startLocation: { name: 'New Delhi', latitude: 28.6139, longitude: 77.2090 }, endLocation: { name: 'Gurgaon', latitude: 28.4595, longitude: 77.0266 }, status: 'active', createdBy: manager._id },
    { routeCode: 'NOI-FAR-003', vehicle: vehicles[2]._id, driver: drivers[2]._id, startLocation: { name: 'Noida', latitude: 28.5355, longitude: 77.3910 }, endLocation: { name: 'Faridabad', latitude: 28.4089, longitude: 77.3178 }, status: 'completed', createdBy: admin._id }
  ]);

  // Create analytics
  await Analytics.create([
    { type: 'vehicle_usage', data: { distance: 120, duration: 180 }, createdBy: admin._id },
    { type: 'route_optimization', data: { score: 85, stops: 5 }, createdBy: manager._id },
    { type: 'maintenance_cost', data: { total: 7000, count: 3 }, createdBy: admin._id }
  ]);

  // Create reminders
  await Reminder.create([
    { user: admin._id, vehicle: vehicles[0]._id, type: 'maintenance', message: 'Next service due soon', scheduleAt: new Date('2026-03-01'), createdBy: admin._id },
    { user: manager._id, vehicle: vehicles[1]._id, type: 'service', message: 'Annual service reminder', scheduleAt: new Date('2026-04-15'), createdBy: manager._id },
    { user: admin._id, vehicle: vehicles[2]._id, type: 'other', message: 'Insurance renewal', scheduleAt: new Date('2026-05-10'), createdBy: admin._id }
  ]);

  // Create uploads
  await Upload.create([
    { filename: 'insurance.pdf', url: 'https://example.com/insurance.pdf', mimetype: 'application/pdf', size: 102400, relatedTo: { kind: 'Vehicle', item: vehicles[0]._id }, uploadedBy: admin._id },
    { filename: 'license.jpg', url: 'https://example.com/license.jpg', mimetype: 'image/jpeg', size: 20480, relatedTo: { kind: 'Driver', item: drivers[1]._id }, uploadedBy: manager._id },
    { filename: 'maintenance_report.docx', url: 'https://example.com/maintenance_report.docx', mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 51200, relatedTo: { kind: 'Maintenance', item: vehicles[2]._id }, uploadedBy: admin._id }
  ]);

  console.log('Multiple sample records seeded for all modules.');
  await mongoose.disconnect();
}

seed();
