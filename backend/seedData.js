require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');

const Vehicle = require('./models/vehicleModel');
const Driver = require('./models/driverModel');
const Maintenance = require('./models/maintenanceModel');
const Route = require('./models/routeModel');

const seedData = async () => {
    try {
        await connectDB();
        console.log('Seeding mock data...');

        // 1. Create fake vehicles (matching strict schema expectations)
        console.log('Creating vehicles...');
        const vehicleA = await Vehicle.create({
            registration: 'MEGA-TRK-001',
            vin: 'MEGA-VIN-001',
            licensePlate: 'MEGA-TRK-001',
            make: 'Volvo',
            model: 'FH16 Semi',
            year: 2024,
            type: 'Heavy Truck',
            fuel: 'Diesel',
            mileage: 15200,
            status: 'active' // Must be lowercase per schema
        });

        const vehicleB = await Vehicle.create({
            registration: 'CITY-VAN-002',
            vin: 'CITY-VIN-002',
            licensePlate: 'CITY-VAN-002',
            make: 'Ford',
            model: 'Transit Cargo',
            year: 2023,
            type: 'Van',
            fuel: 'Electric',
            mileage: 8500,
            status: 'active'
        });

        // 2. Create fake drivers
        console.log('Creating drivers...');
        const driverA = await Driver.create({
            name: 'Alex Thompson',
            email: 'alex@fleetpro.io',
            phone: '555-0101',
            licenseNumber: 'CDL-X9001',
            licenseExpiry: new Date('2028-12-31'),
            status: 'active',
            rating: 4.8
        });

        const driverB = await Driver.create({
            name: 'Sarah Connor',
            email: 'sarah@fleetpro.io',
            phone: '555-0202',
            licenseNumber: 'CDL-V8800',
            licenseExpiry: new Date('2029-06-15'),
            status: 'active',
            rating: 4.9
        });

        // 3. Assign Driver A to Vehicle B (as per request)
        console.log('Assigning driver A to vehicle B...');
        vehicleB.currentDriver = driverA._id;
        await vehicleB.save();

        driverA.assignedVehicle = vehicleB._id;
        await driverA.save();

        // 4. Log a fake ₹500 repair for Vehicle B
        console.log('Logging maintenance...');
        await Maintenance.create({
            vehicle: vehicleB._id,
            type: 'repair',
            notes: 'Replaced side mirror and buffed scratch',
            cost: 500,
            status: 'Completed',
            mechanic: 'Joe Automotive',
            date: new Date()
        });

        // Log another scheduled maintenance for Vehicle A
        await Maintenance.create({
            vehicle: vehicleA._id,
            type: 'service',
            notes: 'Scheduled 15k mile heavy truck service',
            cost: 1200,
            status: 'Scheduled',
            mechanic: 'Volvo Certified Tech',
            date: new Date(Date.now() + 7 * 86400000) // Next week
        });

        // 5. Add routes & stops (AI optimized route simulation)
        console.log('Creating routing data...');
        const randomRouteCode = `RT-${Math.floor(Math.random() * 10000)}`;
        const mockRoute = await Route.create({
            routeCode: randomRouteCode,
            vehicle: vehicleB._id,
            driver: driverA._id,
            startLocation: { name: 'Central Depot', latitude: 34.0522, longitude: -118.2437 },
            endLocation: { name: 'Downtown Hub', latitude: 34.0407, longitude: -118.2468 },
            status: 'active',
            startTime: new Date(),
            totalDistance: 45.2,
            totalDuration: 120, // 2 hours
            totalStops: 3,
            optimizationScore: 98, // Mock AI metric
            routeType: 'optimized',
            isOptimized: true,
            waypoints: [
                { address: '100 Main St (Pickup)', latitude: 34.0522, longitude: -118.2437, stopType: 'pickup', status: 'completed' },
                { address: '200 Market St (Delivery)', latitude: 34.0450, longitude: -118.2450, stopType: 'delivery', status: 'in-progress' },
                { address: 'Downtown Hub (Dropoff)', latitude: 34.0407, longitude: -118.2468, stopType: 'depot', status: 'pending' },
            ]
        });

        console.log('Mock Data Seeding Complete!');
        console.log(`Vehicles: ${vehicleA.licensePlate}, ${vehicleB.licensePlate}`);
        console.log(`Drivers: ${driverA.name}, ${driverB.name}`);
        console.log('You can now check the Dashboard, Vehicles, Drivers, Maintenance, and Routing pages.');

        process.exit(0);
    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
};

seedData();
