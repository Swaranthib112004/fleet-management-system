require('dotenv').config();
const connectDB = require('./config/db');
const { initAgenda } = require('./jobs/scheduler');

async function startWorker() {
  await connectDB();
  await initAgenda(process.env.MONGO_URI);
  console.log('Worker started and agenda initialized');
}

startWorker().catch(err => {
  console.error('Worker failed', err);
  process.exit(1);
});