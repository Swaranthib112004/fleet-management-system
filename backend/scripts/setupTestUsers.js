const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcrypt');

// load backend environment variables explicitly because script is executed from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import seeding helper (now includes vehicles & drivers)
const { ensureTestData } = require('../utils/seedUsers');

async function setupTestUsers() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    console.log(`📍 Database: Fleet`);

    // run combined seeder
    await ensureTestData();

    console.log('\n🎉 Test data setup completed successfully!');
    console.log('\n📝 USE THESE CREDENTIALS TO LOGIN:\n');
    console.log('┌─ DRIVER ─────────────────────────────────┐');
    console.log('│ Email: driver@test.com                    │');
    console.log('│ Role: driver                              │');
    console.log('│ Access: /driver-dashboard                 │');
    console.log('└───────────────────────────────────────────┘\n');
    console.log('┌─ MANAGER ────────────────────────────────┐');
    console.log('│ Email: manager@test.com                   │');
    console.log('│ Role: manager                             │');
    console.log('│ Access: /manager-dashboard                │');
    console.log('└───────────────────────────────────────────┘\n');
    console.log('┌─ ADMIN ──────────────────────────────────┐');
    console.log('│ Email: admin@test.com                     │');
    console.log('│ Role: admin                               │');
    console.log('│ Access: /admin-dashboard                  │');
    console.log('└───────────────────────────────────────────┘\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure MongoDB is running');
    console.error('2. Check MONGO_URI in .env is correct');
    console.error('3. Run: npm install dotenv mongoose');
    process.exit(1);
  }
}

// Run the setup
setupTestUsers();
