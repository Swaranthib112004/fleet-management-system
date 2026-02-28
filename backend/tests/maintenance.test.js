const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Maintenance = require('../models/maintenanceModel');
const Reminder = require('../models/reminderModel');
const emailService = require('../services/emailService');
let app;

jest.setTimeout(60000);
jest.mock('../services/emailService');

describe('Maintenance -> reminder job', () => {
  let mongo;
  let token;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongo.getUri();
    process.env.JWT_SECRET = 'testsecret';
    app = require('../server');

    const user = { name: 'Manager', email: 'mgr4@example.com', password: 'Password123!', role: 'manager' };
    await request(app).post('/api/auth/register').send(user);
    const login = await request(app).post('/api/auth/login').send({ email: user.email, password: user.password });
    token = login.body.accessToken;

    emailService.sendEmail.mockResolvedValue({});
  });

  afterAll(async () => {
    const { _teardown } = require('../jobs/scheduler');
    if (_teardown) _teardown();

    await mongoose.disconnect();
    await mongo.stop();
  });

  test('pagination and search filters for maintenance', async () => {
    // create multiple maintenance records
    const vehicle = { vin: '1HGCM82633A008888', licensePlate: 'MAINT2' };
    const vRes = await request(app).post('/api/vehicles').set('Authorization', `Bearer ${token}`).send(vehicle);
    const vehicleId = vRes.body.vehicle._id;
    for (let i = 0; i < 12; i++) {
      await request(app).post('/api/maintenance').set('Authorization', `Bearer ${token}`).send({
        vehicle: vehicleId,
        type: i % 2 === 0 ? 'oil change' : 'tire rotation',
        notes: `note${i}`,
        status: i % 3 === 0 ? 'Completed' : 'Scheduled',
      });
    }
    const page1 = await request(app).get('/api/maintenance?page=1&limit=5').set('Authorization', `Bearer ${token}`);
    expect(page1.body.page).toBe(1);
    expect(page1.body.items.length).toBe(5);
    expect(page1.body.total).toBe(12);

    const search = await request(app).get('/api/maintenance?search=oil').set('Authorization', `Bearer ${token}`);
    expect(search.body.total).toBeGreaterThan(0);
    search.body.items.forEach((m) => expect(m.type).toMatch(/oil/i));

    const statusFilter = await request(app).get('/api/maintenance?status=Completed').set('Authorization', `Bearer ${token}`);
    statusFilter.body.items.forEach((m) => expect(m.status).toBe('Completed'));
  });

  test('maintenance due creates reminder and triggers send', async () => {
    // create vehicle
    const vehicle = { vin: '1HGCM82633A009999', licensePlate: 'MAINT1' };
    const vRes = await request(app).post('/api/vehicles').set('Authorization', `Bearer ${token}`).send(vehicle);
    const vehicleId = vRes.body.vehicle._id;

    // create maintenance with nextDueAt = now
    const now = new Date();
    const mRes = await request(app).post('/api/maintenance').set('Authorization', `Bearer ${token}`).send({ vehicle: vehicleId, type: 'service', notes: 'Check', nextDueAt: now });
    expect(mRes.statusCode).toBe(201);

    // start scheduler
    const { initAgenda } = require('../jobs/scheduler');
    await initAgenda(process.env.MONGO_URI);

    // wait for the shim to run
    await new Promise(r => setTimeout(r, 2000));

    const reminders = await Reminder.find({ vehicle: vehicleId });
    expect(reminders.length).toBeGreaterThanOrEqual(1);

    // scheduler should also attempt to send reminders (emailService mocked)
    expect(emailService.sendEmail).toHaveBeenCalled();
  });
});