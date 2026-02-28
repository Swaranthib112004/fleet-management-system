// FULL SYSTEM TEST SCRIPT
// Tests all backend functionality and database connectivity

require('dotenv').config();
const mongoose = require('mongoose');

const testResults = {
  passed: [],
  failed: [],
  warnings: []
};

async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 FLEET MANAGEMENT SYSTEM - FULL TEST SUITE');
  console.log('='.repeat(70) + '\n');

  // TEST 1: MongoDB Connection
  console.log('📝 TEST 1: MongoDB Connection');
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/fleet-management';
    console.log(`   Connecting to: ${mongoUri}`);
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    
    console.log('   ✅ Connected to MongoDB');
    testResults.passed.push('MongoDB Connection');
  } catch (err) {
    console.log('   ❌ FAILED:', err.message);
    testResults.failed.push('MongoDB Connection: ' + err.message);
  }

  // TEST 2: Check Collections
  console.log('\n📝 TEST 2: Database Collections');
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log('   Collections found:', collectionNames.length);
    
    if (collectionNames.length > 0) {
      console.log('   ✅ Collections exist:');
      collectionNames.forEach(name => console.log(`      - ${name}`));
      testResults.passed.push('Collections Found');
    } else {
      console.log('   ⚠️  Database is empty (expected after clearing)');
      testResults.warnings.push('Database is empty');
    }
  } catch (err) {
    console.log('   ❌ FAILED:', err.message);
    testResults.failed.push('Check Collections: ' + err.message);
  }

  // TEST 3: Check Models
  console.log('\n📝 TEST 3: Database Models');
  try {
    const User = require('./models/userModel');
    const Vehicle = require('./models/vehicleModel');
    const Driver = require('./models/driverModel');
    const Maintenance = require('./models/maintenanceModel');
    
    console.log('   ✅ All models loaded successfully');
    testResults.passed.push('Models Loaded');
  } catch (err) {
    console.log('   ❌ FAILED:', err.message);
    testResults.failed.push('Models Load: ' + err.message);
  }

  // TEST 4: Create Test Data (User)
  console.log('\n📝 TEST 4: Create Test User');
  let testUserId = null;
  try {
    const User = require('./models/userModel');
    
    // Clear test users first
    await User.deleteMany({ email: 'test@example.com' });
    
    const testUser = new User({
      name: 'Test Admin',
      email: 'test@example.com',
      password: 'hashed_password_123',
      role: 'admin'
    });
    
    const savedUser = await testUser.save();
    testUserId = savedUser._id;
    
    console.log('   ✅ User created successfully');
    console.log(`      ID: ${testUserId}`);
    testResults.passed.push('Create User');
  } catch (err) {
    console.log('   ❌ FAILED:', err.message);
    testResults.failed.push('Create User: ' + err.message);
  }

  // TEST 5: Read Test User
  console.log('\n📝 TEST 5: Read Test User');
  try {
    const User = require('./models/userModel');
    const user = await User.findOne({ email: 'test@example.com' });
    
    if (user) {
      console.log('   ✅ User retrieved successfully');
      console.log(`      Name: ${user.name}`);
      console.log(`      Email: ${user.email}`);
      console.log(`      Role: ${user.role}`);
      testResults.passed.push('Read User');
    } else {
      throw new Error('User not found');
    }
  } catch (err) {
    console.log('   ❌ FAILED:', err.message);
    testResults.failed.push('Read User: ' + err.message);
  }

  // TEST 6: Create Test Vehicle
  console.log('\n📝 TEST 6: Create Test Vehicle');
  let testVehicleId = null;
  try {
    const Vehicle = require('./models/vehicleModel');
    
    // Clear test vehicles first
    await Vehicle.deleteMany({ registration: 'TEST-VH-001' });
    
    const testVehicle = new Vehicle({
      registration: 'TEST-VH-001',
      make: 'Toyota',
      model: 'Hiace',
      year: 2023,
      type: 'Van',
      fuel: 'Diesel',
      mileage: 0,
      status: 'Active',
      driver: 'Unassigned',
      createdBy: testUserId
    });
    
    const savedVehicle = await testVehicle.save();
    testVehicleId = savedVehicle._id;
    
    console.log('   ✅ Vehicle created successfully');
    console.log(`      ID: ${testVehicleId}`);
    console.log(`      Registration: ${savedVehicle.registration}`);
    testResults.passed.push('Create Vehicle');
  } catch (err) {
    console.log('   ❌ FAILED:', err.message);
    testResults.failed.push('Create Vehicle: ' + err.message);
  }

  // TEST 7: Update Vehicle
  console.log('\n📝 TEST 7: Update Vehicle');
  try {
    const Vehicle = require('./models/vehicleModel');
    
    const updated = await Vehicle.findByIdAndUpdate(
      testVehicleId,
      { mileage: 5000, status: 'Maintenance' },
      { new: true }
    );
    
    if (updated && updated.mileage === 5000) {
      console.log('   ✅ Vehicle updated successfully');
      console.log(`      Mileage: ${updated.mileage}`);
      console.log(`      Status: ${updated.status}`);
      testResults.passed.push('Update Vehicle');
    } else {
      throw new Error('Update verification failed');
    }
  } catch (err) {
    console.log('   ❌ FAILED:', err.message);
    testResults.failed.push('Update Vehicle: ' + err.message);
  }

  // TEST 8: Create Driver
  console.log('\n📝 TEST 8: Create Test Driver');
  let testDriverId = null;
  try {
    const Driver = require('./models/driverModel');
    
    // Clear test drivers
    await Driver.deleteMany({ licenseNumber: 'TEST-DRV-001' });
    
    const testDriver = new Driver({
      name: 'John Doe',
      licenseNumber: 'TEST-DRV-001',
      licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      contact: {
        phone: '+1234567890',
        email: 'john@example.com'
      },
      createdBy: testUserId
    });
    
    const savedDriver = await testDriver.save();
    testDriverId = savedDriver._id;
    
    console.log('   ✅ Driver created successfully');
    console.log(`      ID: ${testDriverId}`);
    console.log(`      Name: ${savedDriver.name}`);
    console.log(`      License: ${savedDriver.licenseNumber}`);
    testResults.passed.push('Create Driver');
  } catch (err) {
    console.log('   ❌ FAILED:', err.message);
    testResults.failed.push('Create Driver: ' + err.message);
  }

  // TEST 9: Create Maintenance Log
  console.log('\n📝 TEST 9: Create Maintenance Log');
  try {
    const Maintenance = require('./models/maintenanceModel');
    
    // Clear test maintenance
    await Maintenance.deleteMany({ type: 'Test Maintenance' });
    
    const testMaintenance = new Maintenance({
      vehicleId: testVehicleId,
      type: 'Test Maintenance',
      cost: 150,
      date: new Date(),
      notes: 'Test maintenance entry',
      status: 'Scheduled',
      createdBy: testUserId
    });
    
    const savedMaintenance = await testMaintenance.save();
    
    console.log('   ✅ Maintenance log created successfully');
    console.log(`      Type: ${savedMaintenance.type}`);
    console.log(`      Cost: $${savedMaintenance.cost}`);
    console.log(`      Status: ${savedMaintenance.status}`);
    testResults.passed.push('Create Maintenance');
  } catch (err) {
    console.log('   ❌ FAILED:', err.message);
    testResults.failed.push('Create Maintenance: ' + err.message);
  }

  // TEST 10: Count Records
  console.log('\n📝 TEST 10: Count Database Records');
  try {
    const User = require('./models/userModel');
    const Vehicle = require('./models/vehicleModel');
    const Driver = require('./models/driverModel');
    const Maintenance = require('./models/maintenanceModel');
    
    const userCount = await User.countDocuments();
    const vehicleCount = await Vehicle.countDocuments();
    const driverCount = await Driver.countDocuments();
    const maintenanceCount = await Maintenance.countDocuments();
    
    console.log('   ✅ Records counted:');
    console.log(`      Users: ${userCount}`);
    console.log(`      Vehicles: ${vehicleCount}`);
    console.log(`      Drivers: ${driverCount}`);
    console.log(`      Maintenance Logs: ${maintenanceCount}`);
    testResults.passed.push('Count Records');
  } catch (err) {
    console.log('   ❌ FAILED:', err.message);
    testResults.failed.push('Count Records: ' + err.message);
  }

  // TEST 11: Validate Models
  console.log('\n📝 TEST 11: Validate Schema Validation');
  try {
    const Vehicle = require('./models/vehicleModel');
    
    // Try to create invalid vehicle (should fail)
    const invalidVehicle = new Vehicle({
      // Missing required registration field
      make: 'Toyota'
    });
    
    try {
      await invalidVehicle.validate();
      console.log('   ⚠️  Validation did not catch missing required field');
      testResults.warnings.push('Validation might be weak');
    } catch (validationErr) {
      console.log('   ✅ Schema validation working');
      console.log(`      Caught error: ${Object.keys(validationErr.errors)[0]}`);
      testResults.passed.push('Schema Validation');
    }
  } catch (err) {
    console.log('   ⚠️  Validation test error:', err.message);
  }

  // TEST 12: Check Indexes
  console.log('\n📝 TEST 12: Database Indexes');
  try {
    const Vehicle = require('./models/vehicleModel');
    const indexes = await Vehicle.collection.getIndexes();
    
    console.log('   ✅ Indexes found:');
    Object.keys(indexes).forEach(idx => console.log(`      - ${idx}`));
    testResults.passed.push('Database Indexes');
  } catch (err) {
    console.log('   ❌ FAILED:', err.message);
    testResults.failed.push('Database Indexes: ' + err.message);
  }

  // CLEANUP: Delete test data
  console.log('\n📝 CLEANUP: Removing Test Data');
  try {
    const User = require('./models/userModel');
    const Vehicle = require('./models/vehicleModel');
    const Driver = require('./models/driverModel');
    const Maintenance = require('./models/maintenanceModel');
    
    await User.deleteMany({ email: 'test@example.com' });
    await Vehicle.deleteMany({ registration: 'TEST-VH-001' });
    await Driver.deleteMany({ licenseNumber: 'TEST-DRV-001' });
    await Maintenance.deleteMany({ type: 'Test Maintenance' });
    
    console.log('   ✅ Test data cleaned up');
  } catch (err) {
    console.log('   ⚠️  Cleanup warning:', err.message);
  }

  // SUMMARY
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));
  
  console.log(`\n✅ PASSED: ${testResults.passed.length}`);
  testResults.passed.forEach(test => console.log(`   ✓ ${test}`));
  
  if (testResults.warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS: ${testResults.warnings.length}`);
    testResults.warnings.forEach(warning => console.log(`   ⚠ ${warning}`));
  }
  
  if (testResults.failed.length > 0) {
    console.log(`\n❌ FAILED: ${testResults.failed.length}`);
    testResults.failed.forEach(failure => console.log(`   ✗ ${failure}`));
  }

  console.log('\n' + '='.repeat(70));
  const totalTests = testResults.passed.length + testResults.failed.length;
  const passRate = (testResults.passed.length / totalTests * 100).toFixed(1);
  console.log(`📈 OVERALL: ${testResults.passed.length}/${totalTests} tests passed (${passRate}%)`);
  
  if (testResults.failed.length === 0) {
    console.log('🎉 ALL TESTS PASSED - SYSTEM IS FUNCTIONAL');
  } else {
    console.log('⚠️  SOME TESTS FAILED - REVIEW ABOVE FOR DETAILS');
  }
  console.log('='.repeat(70) + '\n');

  // Disconnect
  await mongoose.disconnect();
  process.exit(testResults.failed.length > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
