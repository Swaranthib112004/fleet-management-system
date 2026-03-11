/**
 * ============================================================
 *  Fleet Management System – Comprehensive Database Seeder
 * ============================================================
 *  Run:  node seedDatabase.js
 *
 *  This script populates ALL MongoDB collections with realistic
 *  Indian fleet-management sample data so every page in the
 *  frontend is data-rich out of the box.
 *
 *  Collections seeded:
 *    Users, Roles, Vehicles, Drivers, Maintenance, Routes,
 *    Uploads (documents), Reminders, Audit logs, Locations
 * ============================================================
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Models
const User = require('./models/userModel');
const Role = require('./models/roleModel');
const Vehicle = require('./models/vehicleModel');
const Driver = require('./models/driverModel');
const Maintenance = require('./models/maintenanceModel');
const Route = require('./models/routeModel');
const Upload = require('./models/uploadModel');
const Reminder = require('./models/reminderModel');
const Audit = require('./models/auditModel');
const Location = require('./models/locationModel');

// ──────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/fleet-management';

// Helpers
const d = (daysAgo) => new Date(Date.now() - daysAgo * 86400000);
const future = (daysAhead) => new Date(Date.now() + daysAhead * 86400000);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function seed() {
    console.log('🌱 Connecting to MongoDB …');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected.\n');

    // ──────────── CLEAR OLD DATA ────────────
    console.log('🗑️  Clearing existing data …');
    await Promise.all([
        User.deleteMany({}),
        Role.deleteMany({}),
        Vehicle.deleteMany({}),
        Driver.deleteMany({}),
        Maintenance.deleteMany({}),
        Route.deleteMany({}),
        Upload.deleteMany({}),
        Reminder.deleteMany({}),
        Audit.deleteMany({}),
        Location.deleteMany({}),
    ]);
    console.log('   Done.\n');

    // ──────────── 1. ROLES ────────────
    console.log('👥 Seeding roles …');
    const roles = await Role.insertMany([
        { name: 'admin', count: 2, perms: 'all' },
        { name: 'driver', count: 8, perms: 'routes,vehicles' },
    ]);
    console.log(`   ✔ ${roles.length} roles.\n`);

    // ──────────── 2. USERS ────────────
    console.log('🧑 Seeding users …');
    const hash = await bcrypt.hash('Admin@123', 10);
    const users = await User.insertMany([
        // Admins
        { name: 'Admin', email: 'admin@fleet.com', password: hash, role: 'admin' },
        { name: 'Sanjay Gupta', email: 'sanjay@fleet.com', password: hash, role: 'admin' },
        // Drivers
        { name: 'Rajesh Kumar', email: 'rajesh@fleet.com', password: hash, role: 'driver' },
        { name: 'Amit Singh', email: 'amit@fleet.com', password: hash, role: 'driver' },
        { name: 'Vikram Patel', email: 'vikram@fleet.com', password: hash, role: 'driver' },
        { name: 'Suresh Reddy', email: 'suresh@fleet.com', password: hash, role: 'driver' },
        { name: 'Deepak Yadav', email: 'deepak@fleet.com', password: hash, role: 'driver' },
        { name: 'Arun Joshi', email: 'arun@fleet.com', password: hash, role: 'driver' },
        { name: 'Manoj Tiwari', email: 'manoj@fleet.com', password: hash, role: 'driver' },
        { name: 'Kiran Bhat', email: 'kiran@fleet.com', password: hash, role: 'driver' },
    ]);
    console.log(`   ✔ ${users.length} users (password: Admin@123).\n`);

    const adminUser = users[0];
    const managerUser = users[2];
    const driverUsers = users.filter(u => u.role === 'driver');

    // ──────────── 3. VEHICLES ────────────
    console.log('🚛 Seeding vehicles …');
    const vehicleData = [
        { vin: 'IN1TATA00001AAA01', licensePlate: 'DL-01-AB-1234', make: 'Tata', model: 'Ace Gold', year: 2023, status: 'active' },
        { vin: 'IN2TATA00002BBB02', licensePlate: 'DL-02-CD-5678', make: 'Tata', model: 'Ultra T.16', year: 2022, status: 'active' },
        { vin: 'IN3MAHD00003CCC03', licensePlate: 'DL-03-EF-9012', make: 'Mahindra', model: 'Blazo X 28', year: 2023, status: 'active' },
        { vin: 'IN4ASHO00004DDD04', licensePlate: 'DL-04-GH-3456', make: 'Ashok Leyland', model: 'Boss 1616', year: 2021, status: 'active' },
        { vin: 'IN5EICH00005EEE05', licensePlate: 'DL-05-IJ-7890', make: 'Eicher', model: 'Pro 3019', year: 2022, status: 'maintenance' },
        { vin: 'IN6BHEL00006FFF06', licensePlate: 'MH-01-KL-2345', make: 'BharatBenz', model: '1617R', year: 2023, status: 'active' },
        { vin: 'IN7TATA00007GGG07', licensePlate: 'MH-02-MN-6789', make: 'Tata', model: 'Signa 4825.TK', year: 2024, status: 'active' },
        { vin: 'IN8MAHD00008HHH08', licensePlate: 'KA-01-OP-1234', make: 'Mahindra', model: 'Furio 7', year: 2023, status: 'active' },
        { vin: 'IN9FORC00009III09', licensePlate: 'KA-02-QR-5678', make: 'Force', model: 'Traveller 26', year: 2022, status: 'inactive' },
        { vin: 'IN0ASHO00010JJJ10', licensePlate: 'TN-01-ST-9012', make: 'Ashok Leyland', model: 'Dost+', year: 2024, status: 'active' },
        { vin: 'IN1TATA00011KKK11', licensePlate: 'TN-02-UV-3456', make: 'Tata', model: 'Intra V30', year: 2023, status: 'active' },
        { vin: 'IN2MAHD00012LLL12', licensePlate: 'RJ-01-WX-7890', make: 'Mahindra', model: 'Jayo', year: 2022, status: 'maintenance' },
    ];
    const vehicles = await Vehicle.insertMany(
        vehicleData.map(v => ({ ...v, createdBy: adminUser._id }))
    );
    console.log(`   ✔ ${vehicles.length} vehicles.\n`);

    // ──────────── 4. DRIVERS ────────────
    console.log('🧑‍✈️  Seeding drivers …');
    const driverData = [
        { name: 'Rajesh Kumar', licenseNumber: 'DL-0420110012345', licenseExpiry: future(365), contact: { phone: '+91 98100 12345', email: 'rajesh@fleet.com' } },
        { name: 'Amit Singh', licenseNumber: 'DL-0520120067890', licenseExpiry: future(200), contact: { phone: '+91 98200 23456', email: 'amit@fleet.com' } },
        { name: 'Vikram Patel', licenseNumber: 'GJ-0120130054321', licenseExpiry: future(450), contact: { phone: '+91 98300 34567', email: 'vikram@fleet.com' } },
        { name: 'Suresh Reddy', licenseNumber: 'AP-0920140098765', licenseExpiry: future(120), contact: { phone: '+91 98400 45678', email: 'suresh@fleet.com' } },
        { name: 'Deepak Yadav', licenseNumber: 'UP-1520150011111', licenseExpiry: future(290), contact: { phone: '+91 98500 56789', email: 'deepak@fleet.com' } },
        { name: 'Arun Joshi', licenseNumber: 'MH-0120160022222', licenseExpiry: future(500), contact: { phone: '+91 98600 67890', email: 'arun@fleet.com' } },
        { name: 'Manoj Tiwari', licenseNumber: 'RJ-0220170033333', licenseExpiry: d(-30), contact: { phone: '+91 98700 78901', email: 'manoj@fleet.com' } }, // expired
        { name: 'Kiran Bhat', licenseNumber: 'KA-0120180044444', licenseExpiry: future(600), contact: { phone: '+91 98800 89012', email: 'kiran@fleet.com' } },
    ];
    const drivers = await Driver.insertMany(
        driverData.map((dr, i) => ({
            ...dr,
            assignedVehicle: vehicles[i] ? vehicles[i]._id : null,
            createdBy: adminUser._id,
        }))
    );
    // Link vehicles to drivers
    for (let i = 0; i < Math.min(drivers.length, vehicles.length); i++) {
        await Vehicle.findByIdAndUpdate(vehicles[i]._id, { currentDriver: drivers[i]._id });
    }
    console.log(`   ✔ ${drivers.length} drivers.\n`);

    // ──────────── 5. UPLOADS (Documents) ────────────
    console.log('📄 Seeding documents …');
    const uploadData = [
        // Vehicle documents
        { filename: 'Vehicle_Registration_DL01AB1234.pdf', url: '/uploads/Vehicle_Registration_DL01AB1234.pdf', mimetype: 'application/pdf', size: 245000, relatedTo: { kind: 'Vehicle', item: vehicles[0]._id } },
        { filename: 'Insurance_Policy_DL01AB1234.pdf', url: '/uploads/Insurance_Policy_DL01AB1234.pdf', mimetype: 'application/pdf', size: 380000, relatedTo: { kind: 'Vehicle', item: vehicles[0]._id } },
        { filename: 'PUC_Certificate_DL01AB1234.pdf', url: '/uploads/PUC_Certificate_DL01AB1234.pdf', mimetype: 'application/pdf', size: 120000, relatedTo: { kind: 'Vehicle', item: vehicles[0]._id } },
        { filename: 'Vehicle_Registration_DL02CD5678.pdf', url: '/uploads/Vehicle_Registration_DL02CD5678.pdf', mimetype: 'application/pdf', size: 256000, relatedTo: { kind: 'Vehicle', item: vehicles[1]._id } },
        { filename: 'Insurance_Policy_DL02CD5678.pdf', url: '/uploads/Insurance_Policy_DL02CD5678.pdf', mimetype: 'application/pdf', size: 390000, relatedTo: { kind: 'Vehicle', item: vehicles[1]._id } },
        { filename: 'Road_Tax_Receipt_MH01KL2345.pdf', url: '/uploads/Road_Tax_Receipt_MH01KL2345.pdf', mimetype: 'application/pdf', size: 95000, relatedTo: { kind: 'Vehicle', item: vehicles[5]._id } },
        { filename: 'Fitness_Certificate_MH02MN6789.pdf', url: '/uploads/Fitness_Certificate_MH02MN6789.pdf', mimetype: 'application/pdf', size: 180000, relatedTo: { kind: 'Vehicle', item: vehicles[6]._id } },
        // Driver documents
        { filename: 'Driving_License_RajeshKumar.pdf', url: '/uploads/Driving_License_RajeshKumar.pdf', mimetype: 'application/pdf', size: 150000, relatedTo: { kind: 'Driver', item: drivers[0]._id } },
        { filename: 'Aadhar_Card_RajeshKumar.pdf', url: '/uploads/Aadhar_Card_RajeshKumar.pdf', mimetype: 'application/pdf', size: 200000, relatedTo: { kind: 'Driver', item: drivers[0]._id } },
        { filename: 'Driving_License_AmitSingh.pdf', url: '/uploads/Driving_License_AmitSingh.pdf', mimetype: 'application/pdf', size: 145000, relatedTo: { kind: 'Driver', item: drivers[1]._id } },
        { filename: 'Medical_Certificate_VikramPatel.pdf', url: '/uploads/Medical_Certificate_VikramPatel.pdf', mimetype: 'application/pdf', size: 110000, relatedTo: { kind: 'Driver', item: drivers[2]._id } },
        { filename: 'Driving_License_SureshReddy.pdf', url: '/uploads/Driving_License_SureshReddy.pdf', mimetype: 'application/pdf', size: 160000, relatedTo: { kind: 'Driver', item: drivers[3]._id } },
        // Maintenance reports
        { filename: 'Inspection_Report_Jan2026.pdf', url: '/uploads/Inspection_Report_Jan2026.pdf', mimetype: 'application/pdf', size: 520000, relatedTo: { kind: 'Maintenance' } },
        { filename: 'Service_Receipt_Feb2026.pdf', url: '/uploads/Service_Receipt_Feb2026.pdf', mimetype: 'application/pdf', size: 340000, relatedTo: { kind: 'Maintenance' } },
        // General reports
        { filename: 'Fleet_Monthly_Report_Jan2026.xlsx', url: '/uploads/Fleet_Monthly_Report_Jan2026.xlsx', mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 890000, relatedTo: { kind: 'Other' } },
        { filename: 'Fuel_Consumption_Report_Q4_2025.pdf', url: '/uploads/Fuel_Consumption_Report_Q4_2025.pdf', mimetype: 'application/pdf', size: 670000, relatedTo: { kind: 'Other' } },
        { filename: 'Driver_Performance_2025.pdf', url: '/uploads/Driver_Performance_2025.pdf', mimetype: 'application/pdf', size: 450000, relatedTo: { kind: 'Other' } },
        { filename: 'Compliance_Audit_2025.pdf', url: '/uploads/Compliance_Audit_2025.pdf', mimetype: 'application/pdf', size: 780000, relatedTo: { kind: 'Other' } },
    ];
    const uploads = await Upload.insertMany(
        uploadData.map(u => ({ ...u, uploadedBy: adminUser._id }))
    );
    console.log(`   ✔ ${uploads.length} documents.\n`);

    // ──────────── 6. MAINTENANCE RECORDS ────────────
    console.log('🔧 Seeding maintenance records …');
    const maintenanceRecords = await Maintenance.insertMany([
        { vehicle: vehicles[0]._id, type: 'service', notes: 'Regular 10,000 km service – oil change, filter replacement, brake inspection', cost: 4500, performedAt: d(5), nextDueAt: future(90), createdBy: adminUser._id },
        { vehicle: vehicles[0]._id, type: 'inspection', notes: 'Pre-trip safety inspection – all systems OK', cost: 800, performedAt: d(1), nextDueAt: future(30), createdBy: managerUser._id },
        { vehicle: vehicles[1]._id, type: 'repair', notes: 'Replaced front left tyre (Bridgestone 295/80 R22.5) – puncture damage', cost: 12500, performedAt: d(12), nextDueAt: future(180), createdBy: adminUser._id },
        { vehicle: vehicles[1]._id, type: 'service', notes: '20,000 km major service – transmission fluid, coolant flush, alignment', cost: 8200, performedAt: d(30), nextDueAt: future(60), createdBy: managerUser._id },
        { vehicle: vehicles[2]._id, type: 'service', notes: 'AC repair and cabin air filter replacement', cost: 3500, performedAt: d(8), nextDueAt: future(120), createdBy: adminUser._id },
        { vehicle: vehicles[2]._id, type: 'repair', notes: 'Alternator belt replaced – wear detected during inspection', cost: 2800, performedAt: d(20), nextDueAt: future(200), createdBy: managerUser._id },
        { vehicle: vehicles[3]._id, type: 'inspection', notes: 'Annual RTO fitness certificate inspection passed', cost: 1500, performedAt: d(15), nextDueAt: future(365), createdBy: adminUser._id },
        { vehicle: vehicles[3]._id, type: 'service', notes: 'Brake pad replacement (all wheels) and brake fluid top-up', cost: 6800, performedAt: d(25), nextDueAt: future(90), createdBy: managerUser._id },
        { vehicle: vehicles[4]._id, type: 'repair', notes: 'Engine overheating issue – radiator hose replaced, thermostat checked', cost: 15000, performedAt: d(3), nextDueAt: future(45), createdBy: adminUser._id },
        { vehicle: vehicles[5]._id, type: 'service', notes: 'Regular 15,000 km service – comprehensive check', cost: 5200, performedAt: d(10), nextDueAt: future(75), createdBy: adminUser._id },
        { vehicle: vehicles[6]._id, type: 'service', notes: 'Clutch plate replacement – heavy usage wear', cost: 9500, performedAt: d(18), nextDueAt: future(150), createdBy: managerUser._id },
        { vehicle: vehicles[7]._id, type: 'inspection', notes: 'Monthly safety check – tyres, lights, brakes all OK', cost: 500, performedAt: d(2), nextDueAt: future(28), createdBy: adminUser._id },
        { vehicle: vehicles[8]._id, type: 'other', notes: 'GPS tracker unit replaced (Bharat IoT TK-103)', cost: 3200, performedAt: d(7), nextDueAt: null, createdBy: managerUser._id },
        { vehicle: vehicles[9]._id, type: 'service', notes: '5,000 km first service – oil, filter, general check', cost: 2200, performedAt: d(14), nextDueAt: future(90), createdBy: adminUser._id },
        { vehicle: vehicles[10]._id, type: 'repair', notes: 'Windshield replacement – stone chip damage on NH-48', cost: 7800, performedAt: d(22), nextDueAt: null, createdBy: adminUser._id },
        { vehicle: vehicles[11]._id, type: 'service', notes: 'Battery replacement (Exide 150AH) and electrical system check', cost: 11000, performedAt: d(9), nextDueAt: future(365), createdBy: managerUser._id },
    ]);
    console.log(`   ✔ ${maintenanceRecords.length} maintenance records.\n`);

    // ──────────── 7. ROUTES ────────────
    console.log('🗺️  Seeding routes …');
    const routeRecords = await Route.insertMany([
        {
            routeCode: 'RT-DEL-JAI-001', vehicle: vehicles[0]._id, driver: drivers[0]._id,
            startLocation: { name: 'Karol Bagh, Delhi', latitude: 28.6519, longitude: 77.1905 },
            endLocation: { name: 'MI Road, Jaipur', latitude: 26.9124, longitude: 75.7873 },
            waypoints: [
                { latitude: 28.4595, longitude: 77.0266, address: 'Gurugram Toll Plaza', stopType: 'pickup', status: 'completed' },
                { latitude: 27.8974, longitude: 76.6200, address: 'Neemrana Fort', stopType: 'delivery', status: 'completed' },
                { latitude: 27.1767, longitude: 75.7885, address: 'Shahpura, Jaipur', stopType: 'delivery', status: 'completed' },
            ],
            status: 'completed', startTime: d(5), estimatedEndTime: d(4.5), actualEndTime: d(4.7),
            totalDistance: 281, totalDuration: 320, totalStops: 3, optimizationScore: 87,
            routeType: 'optimized', isOptimized: true, createdBy: adminUser._id,
        },
        {
            routeCode: 'RT-DEL-AGR-002', vehicle: vehicles[1]._id, driver: drivers[1]._id,
            startLocation: { name: 'Connaught Place, Delhi', latitude: 28.6315, longitude: 77.2167 },
            endLocation: { name: 'Taj Mahal, Agra', latitude: 27.1751, longitude: 78.0421 },
            waypoints: [
                { latitude: 28.4089, longitude: 77.3178, address: 'Noida Sec 62 Warehouse', stopType: 'pickup', status: 'completed' },
                { latitude: 27.8800, longitude: 78.0200, address: 'Mathura Depot', stopType: 'delivery', status: 'pending' },
            ],
            status: 'active', startTime: d(0.5), estimatedEndTime: future(0.2),
            totalDistance: 233, totalDuration: 240, totalStops: 2, optimizationScore: 91,
            routeType: 'optimized', isOptimized: true, createdBy: managerUser._id,
        },
        {
            routeCode: 'RT-MUM-PUN-003', vehicle: vehicles[5]._id, driver: drivers[5]._id,
            startLocation: { name: 'Andheri, Mumbai', latitude: 19.1136, longitude: 72.8697 },
            endLocation: { name: 'Hinjewadi, Pune', latitude: 18.5912, longitude: 73.7389 },
            waypoints: [
                { latitude: 19.0330, longitude: 73.0297, address: 'Navi Mumbai Hub', stopType: 'pickup', status: 'completed' },
                { latitude: 18.7557, longitude: 73.4091, address: 'Lonavala Checkpoint', stopType: 'delivery', status: 'pending' },
            ],
            status: 'active', startTime: d(0.3), estimatedEndTime: future(0.1),
            totalDistance: 152, totalDuration: 180, totalStops: 2, optimizationScore: 78,
            routeType: 'standard', isOptimized: false, createdBy: managerUser._id,
        },
        {
            routeCode: 'RT-BLR-MYS-004', vehicle: vehicles[7]._id, driver: drivers[7]._id,
            startLocation: { name: 'Whitefield, Bangalore', latitude: 12.9698, longitude: 77.7500 },
            endLocation: { name: 'Mysore Palace', latitude: 12.3052, longitude: 76.6552 },
            waypoints: [
                { latitude: 12.8009, longitude: 77.5747, address: 'Electronic City', stopType: 'pickup', status: 'completed' },
                { latitude: 12.4996, longitude: 76.9625, address: 'Mandya Warehouse', stopType: 'delivery', status: 'completed' },
            ],
            status: 'completed', startTime: d(3), estimatedEndTime: d(2.5), actualEndTime: d(2.6),
            totalDistance: 145, totalDuration: 190, totalStops: 2, optimizationScore: 92,
            routeType: 'optimized', isOptimized: true, createdBy: adminUser._id,
        },
        {
            routeCode: 'RT-DEL-LKO-005', vehicle: vehicles[2]._id, driver: drivers[2]._id,
            startLocation: { name: 'Noida Sec 18', latitude: 28.5706, longitude: 77.3212 },
            endLocation: { name: 'Hazratganj, Lucknow', latitude: 26.8505, longitude: 80.9462 },
            waypoints: [
                { latitude: 28.2096, longitude: 79.0000, address: 'Aligarh Distribution Centre', stopType: 'pickup', status: 'pending' },
                { latitude: 27.1767, longitude: 79.9414, address: 'Kanpur Depot', stopType: 'delivery', status: 'pending' },
            ],
            status: 'planned', startTime: future(1), estimatedEndTime: future(1.4),
            totalDistance: 550, totalDuration: 480, totalStops: 2, optimizationScore: 85,
            routeType: 'optimized', isOptimized: true, createdBy: managerUser._id,
        },
        {
            routeCode: 'RT-CHN-CBE-006', vehicle: vehicles[9]._id, driver: drivers[3]._id,
            startLocation: { name: 'T. Nagar, Chennai', latitude: 13.0418, longitude: 80.2341 },
            endLocation: { name: 'RS Puram, Coimbatore', latitude: 11.0168, longitude: 76.9558 },
            waypoints: [
                { latitude: 12.2253, longitude: 79.6522, address: 'Vellore Stop', stopType: 'delivery', status: 'completed' },
                { latitude: 11.6643, longitude: 78.1460, address: 'Salem Distribution', stopType: 'delivery', status: 'completed' },
                { latitude: 11.3410, longitude: 77.7172, address: 'Erode Hub', stopType: 'pickup', status: 'completed' },
            ],
            status: 'completed', startTime: d(7), estimatedEndTime: d(6.5), actualEndTime: d(6.4),
            totalDistance: 506, totalDuration: 540, totalStops: 3, optimizationScore: 95,
            routeType: 'optimized', isOptimized: true, createdBy: adminUser._id,
        },
    ]);
    console.log(`   ✔ ${routeRecords.length} routes.\n`);

    // ──────────── 8. REMINDERS ────────────
    console.log('⏰ Seeding reminders …');
    const reminders = await Reminder.insertMany([
        { user: adminUser._id, vehicle: vehicles[0]._id, type: 'service', message: 'Tata Ace Gold (DL-01-AB-1234) – Next oil change due at 20,000 km', scheduleAt: future(15), status: 'pending', createdBy: adminUser._id },
        { user: adminUser._id, vehicle: vehicles[1]._id, type: 'maintenance', message: 'Tata Ultra (DL-02-CD-5678) – Brake pad inspection scheduled', scheduleAt: future(7), status: 'pending', createdBy: adminUser._id },
        { user: managerUser._id, vehicle: vehicles[4]._id, type: 'service', message: 'Eicher Pro 3019 (DL-05-IJ-7890) – Engine coolant check after repair', scheduleAt: future(3), status: 'pending', createdBy: managerUser._id },
        { user: adminUser._id, vehicle: vehicles[5]._id, type: 'maintenance', message: 'BharatBenz 1617R (MH-01-KL-2345) – Annual insurance renewal due', scheduleAt: future(30), status: 'pending', createdBy: adminUser._id },
        { user: managerUser._id, vehicle: vehicles[2]._id, type: 'service', message: 'Mahindra Blazo (DL-03-EF-9012) – Tyre rotation scheduled', scheduleAt: future(10), status: 'pending', createdBy: managerUser._id },
        { user: adminUser._id, vehicle: vehicles[8]._id, type: 'other', message: 'Force Traveller (KA-02-QR-5678) – Vehicle fitness certificate renewal', scheduleAt: future(45), status: 'pending', createdBy: adminUser._id },
        { user: adminUser._id, vehicle: vehicles[0]._id, type: 'service', message: 'Tata Ace Gold (DL-01-AB-1234) – PUC certificate expired – renew immediately', scheduleAt: d(-2), sentAt: d(-2), status: 'sent', createdBy: adminUser._id },
        { user: managerUser._id, vehicle: vehicles[3]._id, type: 'maintenance', message: 'Ashok Leyland (DL-04-GH-3456) – Battery load test due next week', scheduleAt: future(5), status: 'pending', createdBy: managerUser._id },
    ]);
    console.log(`   ✔ ${reminders.length} reminders.\n`);

    // ──────────── 9. AUDIT LOGS ────────────
    console.log('📋 Seeding audit logs …');
    const auditLogs = await Audit.insertMany([
        { user: adminUser._id, action: 'Created vehicle DL-01-AB-1234', target: 'Vehicle', createdAt: d(30) },
        { user: adminUser._id, action: 'Created vehicle DL-02-CD-5678', target: 'Vehicle', createdAt: d(30) },
        { user: adminUser._id, action: 'Added driver Rajesh Kumar', target: 'Driver', createdAt: d(28) },
        { user: adminUser._id, action: 'Added driver Amit Singh', target: 'Driver', createdAt: d(28) },
        { user: managerUser._id, action: 'Assigned Rajesh Kumar to DL-01-AB-1234', target: 'Driver', createdAt: d(27) },
        { user: managerUser._id, action: 'Created route RT-DEL-JAI-001', target: 'Route', createdAt: d(7) },
        { user: adminUser._id, action: 'Scheduled maintenance for DL-05-IJ-7890', target: 'Maintenance', createdAt: d(5) },
        { user: managerUser._id, action: 'Updated route RT-DEL-AGR-002 status to active', target: 'Route', createdAt: d(1) },
        { user: adminUser._id, action: 'Uploaded Insurance Policy for DL-01-AB-1234', target: 'Document', createdAt: d(15) },
        { user: adminUser._id, action: 'Added new vehicle MH-01-KL-2345', target: 'Vehicle', createdAt: d(20) },
        { user: managerUser._id, action: 'Optimized route RT-DEL-JAI-001 using AI engine', target: 'Route', createdAt: d(6) },
        { user: adminUser._id, action: 'Completed maintenance for DL-04-GH-3456', target: 'Maintenance', createdAt: d(3) },
        { user: managerUser._id, action: 'Driver Manoj Tiwari license expired – flagged', target: 'Driver', createdAt: d(2) },
        { user: adminUser._id, action: 'Generated monthly fleet report – January 2026', target: 'Report', createdAt: d(10) },
        { user: users[1]._id, action: 'System backup completed successfully', target: 'System', createdAt: d(1) },
    ]);
    console.log(`   ✔ ${auditLogs.length} audit logs.\n`);

    // ──────────── 10. GPS LOCATIONS ────────────
    console.log('📍 Seeding GPS location history …');
    // Simulate location history along the Delhi–Jaipur route for vehicle 0
    const delhiJaipurPoints = [
        { lat: 28.6519, lng: 77.1905 }, { lat: 28.5500, lng: 77.0500 },
        { lat: 28.4595, lng: 77.0266 }, { lat: 28.2000, lng: 76.7500 },
        { lat: 27.9500, lng: 76.6500 }, { lat: 27.8974, lng: 76.6200 },
        { lat: 27.5000, lng: 76.3000 }, { lat: 27.1767, lng: 75.7885 },
        { lat: 26.9500, lng: 75.8000 }, { lat: 26.9124, lng: 75.7873 },
    ];
    const locationDocs = [];
    for (let vi = 0; vi < Math.min(4, vehicles.length); vi++) {
        const points = vi === 0 ? delhiJaipurPoints : delhiJaipurPoints.map(p => ({
            lat: p.lat + (Math.random() - 0.5) * 2,
            lng: p.lng + (Math.random() - 0.5) * 2,
        }));
        for (let i = 0; i < points.length; i++) {
            locationDocs.push({
                vehicle: vehicles[vi]._id,
                driver: drivers[vi] ? drivers[vi]._id : null,
                latitude: points[i].lat,
                longitude: points[i].lng,
                geolocation: { type: 'Point', coordinates: [points[i].lng, points[i].lat] },
                speed: 40 + Math.random() * 40,
                heading: Math.random() * 360,
                isMoving: i < points.length - 1,
                engineStatus: i < points.length - 1 ? 'on' : 'off',
                odometer: 15000 + vi * 5000 + i * 28,
                tripDistance: i * 28,
                averageSpeed: 50 + Math.random() * 15,
                maxSpeed: 80 + Math.random() * 20,
                gpsQuality: 'good',
                signalStrength: 75 + Math.floor(Math.random() * 25),
                createdAt: new Date(Date.now() - (points.length - i) * 1800000), // every 30 min
                createdBy: adminUser._id,
            });
        }
    }
    const locations = await Location.insertMany(locationDocs);
    console.log(`   ✔ ${locations.length} GPS location points.\n`);

    // ──────────── DONE ────────────
    console.log('═══════════════════════════════════════════════');
    console.log('  🎉  DATABASE SEEDED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════');
    console.log(`
  Summary:
    • ${roles.length} Roles
    • ${users.length} Users (all passwords: Admin@123)
    • ${vehicles.length} Vehicles (Indian truck fleet)
    • ${drivers.length} Drivers
    • ${uploads.length} Documents / Uploads
    • ${maintenanceRecords.length} Maintenance Records
    • ${routeRecords.length} Routes (Delhi–Jaipur, Mumbai–Pune, etc.)
    • ${reminders.length} Reminders
    • ${auditLogs.length} Audit Logs
    • ${locations.length} GPS Location Points

  Login credentials:
    Admin:    admin@fleet.com / Admin@123
    Manager:  priya@fleet.com / Admin@123
    Driver:   rajesh@fleet.com / Admin@123
    Customer: neha@customer.com / Admin@123
  `);

    await mongoose.disconnect();
    process.exit(0);
}

seed().catch(err => {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
});
