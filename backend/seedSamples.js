require('dotenv').config();
const mongoose = require('mongoose');

const Vehicle = require('./models/vehicleModel');
const Driver = require('./models/driverModel');
const Maintenance = require('./models/maintenanceModel');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/fleet-management';

async function seedSamples() {
    try {
        console.log('🌱 Connecting to MongoDB …');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected.\n');

        console.log('🗑️ Dropping existing vehicles, drivers, and maintenance collections to clear old indexes …');
        try { await mongoose.connection.db.dropCollection('vehicles'); } catch (e) { console.log('vehicles coll not found'); }
        try { await mongoose.connection.db.dropCollection('drivers'); } catch (e) { console.log('drivers coll not found'); }
        try { await mongoose.connection.db.dropCollection('maintenances'); } catch (e) { console.log('maintenances coll not found'); }
        console.log('   Done.\n');

        console.log('🚛 Seeding 3 sample vehicles …');
        const vehiclesData = [
            {
                registration: 'KA-01-AB-1234',
                make: 'Volvo',
                model: 'FH16',
                year: 2023,
                type: 'Heavy Truck',
                fuel: 'Diesel',
                mileage: 15400,
                status: 'Active',
                driver: 'Rajesh Kumar',
                lastService: '2023-10-15',
            },
            {
                registration: 'MH-04-CD-5678',
                make: 'Tata',
                model: 'Ace',
                year: 2022,
                type: 'Light Truck',
                fuel: 'CNG',
                mileage: 45000,
                status: 'Maintenance',
                driver: 'Amit Singh',
                lastService: '2023-11-01',
            },
            {
                registration: 'DL-01-EF-9012',
                make: 'Mahindra',
                model: 'Bolero Pik-Up',
                year: 2024,
                type: 'Van',
                fuel: 'Diesel',
                mileage: 3200,
                status: 'Active',
                driver: 'Vikram Patel',
                lastService: '2024-01-20',
            }
        ];

        const vehicles = await Vehicle.insertMany(vehiclesData);
        console.log(`   ✔ ${vehicles.length} vehicles added.\n`);

        console.log('🧑‍✈️ Seeding 3 sample drivers …');
        const driversData = [
            {
                name: 'Rajesh Kumar',
                licenseNumber: 'DL-0420110012345',
                licenseExpiry: new Date('2025-10-15'),
                contact: { phone: '+91 98100 12345', email: 'rajesh@fleet.com' },
                assignedVehicle: vehicles[0]._id
            },
            {
                name: 'Amit Singh',
                licenseNumber: 'DL-0520120067890',
                licenseExpiry: new Date('2024-11-20'),
                contact: { phone: '+91 98200 23456', email: 'amit@fleet.com' },
                assignedVehicle: vehicles[1]._id
            },
            {
                name: 'Vikram Patel',
                licenseNumber: 'GJ-0120130054321',
                licenseExpiry: new Date('2026-05-10'),
                contact: { phone: '+91 98300 34567', email: 'vikram@fleet.com' },
                assignedVehicle: vehicles[2]._id
            }
        ];

        const drivers = await Driver.insertMany(driversData);
        console.log(`   ✔ ${drivers.length} drivers added.\n`);

        console.log('🔧 Seeding 3 sample maintenance logs …');
        const logsData = [
            {
                vehicle: vehicles[0]._id,
                type: 'service',
                notes: 'Oil change and brake pad check',
                cost: 4500,
                performedAt: new Date('2023-10-15')
            },
            {
                vehicle: vehicles[1]._id,
                type: 'repair',
                notes: 'Fixed Engine Overheating',
                cost: 12500,
                performedAt: new Date('2023-11-01')
            },
            {
                vehicle: vehicles[2]._id,
                type: 'inspection',
                notes: 'Initial vehicle inspection',
                cost: 1500,
                performedAt: new Date('2024-01-20')
            }
        ];

        const logs = await Maintenance.insertMany(logsData);
        console.log(`   ✔ ${logs.length} maintenance logs added.\n`);

        console.log('🎉 DB Seeding successful for the missing objects!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error.message);
        process.exit(1);
    }
}

seedSamples();
