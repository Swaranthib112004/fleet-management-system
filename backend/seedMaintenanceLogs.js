require('dotenv').config();
const mongoose = require('mongoose');
const Maintenance = require('./models/maintenanceModel');
const Vehicle = require('./models/vehicleModel');

async function main() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/fleet-management');
    console.log('Connected to MongoDB');

    // Get first 3 vehicle registrations
    const vehicles = await Vehicle.find().limit(3).select('registration');
    console.log('Vehicles:', vehicles.map(v => v.registration));

    const regs = vehicles.map(v => v.registration);
    const v0 = regs[0] || 'VEH-001';
    const v1 = regs[1] || 'VEH-002';
    const v2 = regs[2] || 'VEH-003';

    const existing = await Maintenance.countDocuments();
    if (existing >= 3) {
        console.log(`Already have ${existing} maintenance logs. Skipping seed.`);
        await mongoose.disconnect();
        return;
    }

    const logs = [
        {
            vehicle: v0,
            type: 'Oil Change',
            date: '2026-01-20',
            cost: 2500,
            mechanic: 'City Auto Service',
            status: 'Completed',
            notes: 'Replaced engine oil and oil filter. Brake pads checked — within tolerance.'
        },
        {
            vehicle: v1,
            type: 'Tyre Rotation & Alignment',
            date: '2026-02-05',
            cost: 1800,
            mechanic: 'SpeedFit Garage',
            status: 'Completed',
            notes: 'All 4 tyres rotated. Front-end wheel alignment calibrated to manufacturer spec.'
        },
        {
            vehicle: v2,
            type: 'AC Servicing',
            date: '2026-02-25',
            cost: 3200,
            mechanic: 'Coolzone Auto Works',
            status: 'In Progress',
            notes: 'Refrigerant refill and condenser cleaning in progress. Expected completion: 28-Feb-2026.'
        }
    ];

    const result = await Maintenance.insertMany(logs);
    console.log(`Inserted ${result.length} maintenance logs:`);
    result.forEach(r => console.log(`  - ${r.type} | ${r.vehicle} | ${r.status}`));

    await mongoose.disconnect();
    console.log('Done!');
}

main().catch(err => { console.error(err); process.exit(1); });
