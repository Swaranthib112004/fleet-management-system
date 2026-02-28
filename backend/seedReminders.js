const mongoose = require('mongoose');
const Reminder = require('./models/reminderModel');
const User = require('./models/userModel');
const Vehicle = require('./models/vehicleModel');

async function seedReminders() {
    const mongoUri = process.env.MONGO_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/fleet-management';
    await mongoose.connect(mongoUri);

    const users = await User.find();
    const vehicles = await Vehicle.find();

    if (users.length === 0 || vehicles.length === 0) {
        console.log('No users or vehicles found. Exiting.');
        process.exit(1);
    }

    const admin = users[0];

    await Reminder.create([
        { user: admin._id, vehicle: vehicles[0]?._id, type: 'maintenance', message: 'Next service due soon (Brakes)', scheduleAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), createdBy: admin._id, status: 'pending' },
        { user: admin._id, vehicle: vehicles[1]?._id || vehicles[0]?._id, type: 'urgent', message: 'Immediate engine inspection required', scheduleAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), createdBy: admin._id, status: 'pending' },
        { user: admin._id, vehicle: vehicles[2]?._id || vehicles[0]?._id, type: 'other', message: 'Insurance document renewal', scheduleAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), createdBy: admin._id, status: 'pending' }
    ]);

    console.log('Sample reminders seeded.');
    await mongoose.disconnect();
}

seedReminders();
