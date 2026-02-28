const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const driverSchema = new mongoose.Schema({
    name: String,
    status: String
}, { strict: false });

const Driver = mongoose.model('Driver', driverSchema);

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/fleet-management');
    console.log('Connected');

    const all = await Driver.find({});
    console.log('Found', all.length, 'drivers');

    if (all.length === 0) {
        console.log('Creating drivers...');
        await Driver.create([
            { name: 'Alice Driver', status: 'Active' },
            { name: 'Bob Driver', status: 'Active' },
            { name: 'Charlie Driver', status: 'Active' }
        ]);
    } else {
        console.log('Force updating statuses...');
        await Driver.updateMany({}, { $set: { status: 'Active' } });
    }

    const activeCount = await Driver.countDocuments({ status: 'Active' });
    console.log('Active drivers now:', activeCount);
    process.exit(0);
}

run();
