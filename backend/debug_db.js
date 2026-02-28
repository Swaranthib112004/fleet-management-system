const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const driverSchema = new mongoose.Schema({
    name: { type: String },
    licenseNumber: { type: String },
    status: { type: String },
    assignedVehicle: { type: mongoose.Schema.Types.Mixed, default: null }
}, { timestamps: true });

const Driver = mongoose.model('Driver', driverSchema);

async function debug() {
    try {
        console.log('Connecting to:', process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected!');

        const count = await Driver.countDocuments();
        console.log('Total drivers found:', count);

        if (count === 0) {
            console.log('Inserting sample drivers...');
            await Driver.create([
                { name: 'John Doe', licenseNumber: 'L123', status: 'Active' },
                { name: 'Jane Smith', licenseNumber: 'L456', status: 'Active' },
                { name: 'Mike Ross', licenseNumber: 'L789', status: 'Active' }
            ]);
            console.log('Insertion done!');
        } else {
            console.log('Updating all drivers to Active...');
            const res = await Driver.updateMany({}, { $set: { status: 'Active' } });
            console.log('Update result:', res);
        }

        const finalCount = await Driver.countDocuments({ status: 'Active' });
        console.log('Final Active count:', finalCount);

        const all = await Driver.find({});
        console.log('Sample data:', JSON.stringify(all, null, 2));

        process.exit(0);
    } catch (err) {
        console.error('DB ERROR:', err);
        process.exit(1);
    }
}

debug();
