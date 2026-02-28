// Simple MongoDB Test
const mongoose = require('mongoose');

(async () => {
  try {
    console.log('Testing MongoDB connection...');
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/fleet-management';
    console.log(`URI: ${mongoUri}`);
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Get database stats
    const db = mongoose.connection.db;
    const stats = await db.stats();
    console.log(`Database: ${stats.db}`);
    console.log(`Collections: ${stats.collections}`);
    console.log(`Data Size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log(`\nCollections (${collections.length}):`);
    collections.forEach(c => console.log(`  - ${c.name}`));
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected');
  }
})();
