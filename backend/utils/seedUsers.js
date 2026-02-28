const bcrypt = require('bcrypt');
const User = require('../models/userModel');
const Vehicle = require('../models/vehicleModel');
const Driver = require('../models/driverModel');

/**
 * Ensure that development/test data exists: users, drivers, and vehicles.
 * Skips entirely in production.
 */
async function ensureTestData() {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  // users
  const existing = await User.find({
    email: { $in: ['driver@test.com', 'manager@test.com', 'admin@test.com'] }
  });

  if (!existing || existing.length < 3) {
    console.log('🛠️  Seeding test users (development mode)');
    await User.deleteMany({
      email: { $in: ['driver@test.com', 'manager@test.com', 'admin@test.com'] }
    });
    const pwd = await bcrypt.hash('oauth-user', 10);
    const users = [
      { name: 'Driver Test User', email: 'driver@test.com', password: pwd, role: 'driver' },
      { name: 'Manager Test User', email: 'manager@test.com', password: pwd, role: 'manager' },
      { name: 'Admin Test User', email: 'admin@test.com', password: pwd, role: 'admin' }
    ];
    for (const u of users) {
      const created = await User.create(u);
      console.log(`   • ${created.role} user created: ${created.email}`);
    }
    console.log('✅ Test users seeded successfully.');
  }

  // drivers
  const driverCount = await Driver.countDocuments();
  if (driverCount === 0) {
    console.log('🛠️  Seeding sample drivers');
    const drivers = await Driver.create([
      { name: 'Alice Driver', licenseNumber: 'D123456', licenseExpiry: new Date(2026, 5, 1), status: 'Active' },
      { name: 'Bob Driver', licenseNumber: 'D234567', licenseExpiry: new Date(2025, 3, 15), status: 'Active' },
      { name: 'Charlie Driver', licenseNumber: 'D345678', licenseExpiry: new Date(2027, 11, 20), status: 'Active' }
    ]);
    console.log(`   • ${drivers.length} drivers created`);
  }

  // vehicles
  const vehicleCount = await Vehicle.countDocuments();
  if (vehicleCount === 0) {
    console.log('🛠️  Seeding sample vehicles');
    const vehicles = await Vehicle.create([
      { vin: 'VIN0001', licensePlate: 'ABC-1234', make: 'Ford', model: 'Transit', year: 2020, status: 'Active' },
      { vin: 'VIN0002', licensePlate: 'XYZ-5678', make: 'Tesla', model: 'Semi', year: 2023, status: 'Active' },
      { vin: 'VIN0003', licensePlate: 'JKL-9012', make: 'Toyota', model: 'HiAce', year: 2018, status: 'Active' }
    ]);
    console.log(`   • ${vehicles.length} vehicles created`);
  }

  // linking logic
  if (driverCount === 0 || vehicleCount === 0) {
    const drivers = await Driver.find({});
    const vehicles = await Vehicle.find({});
    if (vehicles.length > 0 && drivers.length > 0) {
      vehicles[0].currentDriver = drivers[0]._id;
      await vehicles[0].save();
      drivers[0].assignedVehicle = vehicles[0]._id;
      await drivers[0].save();
    }
    console.log('✅ Sample fleet data seeded.');
  }
}

module.exports = { ensureTestData };
