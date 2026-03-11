const mongoose = require('mongoose');
// optional helper that seeds test users if none exist
let seeder;
try {
  seeder = require('../utils/seedUsers'); // now exports ensureTestData
} catch (e) {
  // file may not exist during tests/tools, ignore
}

const connectDB = async () => {
  // Accept either MONGO_URI or DATABASE_URL and fallback to a sensible default for local dev
  const mongoUri = process.env.MONGO_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/fleet-management';

  if (!mongoUri) {
    console.error('❌ MongoDB connection string is not defined. Set MONGO_URI in .env');
    process.exit(1);
  }

  try {
    // mongoose 6+ uses new URL parser and unified topology by default; options removed
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB Connected');

    // optionally seed development data when explicitly enabled
    // Set AUTO_SEED=true to allow the seeder to create dev/test records.
    // Default behaviour is to NOT seed so a freshly cleared DB stays empty.
    if (process.env.AUTO_SEED === 'true') {
      if (seeder && typeof seeder.ensureTestData === 'function') {
        await seeder.ensureTestData();
      }
    }
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err && err.message ? err.message : err);

    // Fallback: if MongoDB is not available, optionally start an in-memory MongoDB.
    // Use USE_IN_MEMORY_MONGO=true to enable this in any environment.
    // Set NO_IN_MEMORY_MONGO=true to disable this fallback.
    if (process.env.NO_IN_MEMORY_MONGO !== 'true') {
      console.warn('⚠️ Falling back to in-memory MongoDB (mongodb-memory-server).');
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        await mongoose.connect(uri);
        console.log('✅ Connected to in-memory MongoDB');
        return;
      } catch (memErr) {
        console.error('❌ Failed to start in-memory MongoDB:', memErr && memErr.message ? memErr.message : memErr);
      }
    }

    process.exit(1);
  }
};

module.exports = connectDB;
