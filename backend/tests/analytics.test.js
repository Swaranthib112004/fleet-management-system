process.env.NODE_ENV = 'test';
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Maintenance = require('../models/maintenanceModel');
const Analytics = require('../models/analyticsModel');
let app;

jest.setTimeout(60000);

describe('Analytics -> maintenance trends', () => {
  let mongo;
  let token;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongo.getUri();
    process.env.JWT_SECRET = 'testsecret';
    app = require('../server');

    const user = { name: 'Manager', email: 'mgr-analytics@example.com', password: 'Password123!', role: 'manager' };
    await request(app).post('/api/auth/register').send(user);
    const login = await request(app).post('/api/auth/login').send({ email: user.email, password: user.password });
    token = login.body.accessToken;
  });

  afterAll(async () => {
    const { _teardown } = require('../jobs/scheduler');
    if (_teardown) _teardown();

    await mongoose.disconnect();
    await mongo.stop();
  });

  test('compute trends and return chart.js payload', async () => {
    // create maintenance records across 3 months
    const now = new Date();
    const month0 = new Date(now.getFullYear(), now.getMonth(), 5);
    const month1 = new Date(now.getFullYear(), now.getMonth()-1, 10);
    const month2 = new Date(now.getFullYear(), now.getMonth()-2, 15);

    await Maintenance.create({ vehicle: new mongoose.Types.ObjectId(), type: 'service', performedAt: month0, nextDueAt: month0, createdBy: new mongoose.Types.ObjectId() });
    await Maintenance.create({ vehicle: new mongoose.Types.ObjectId(), type: 'repair', performedAt: month1, nextDueAt: month1, createdBy: new mongoose.Types.ObjectId() });
    await Maintenance.create({ vehicle: new mongoose.Types.ObjectId(), type: 'inspection', performedAt: month2, nextDueAt: month2, createdBy: new mongoose.Types.ObjectId() });

    // trigger analytics job directly
    const analyticsService = require('../services/analyticsService');
    const payload = await analyticsService.computeMaintenanceTrends(3);

    // validate payload shape for Chart.js
    expect(payload).toHaveProperty('labels');
    expect(Array.isArray(payload.labels)).toBe(true);
    expect(payload).toHaveProperty('datasets');
    expect(Array.isArray(payload.datasets)).toBe(true);
    expect(payload.datasets[0]).toHaveProperty('data');
    expect(payload.datasets[0].data.length).toBe(3);

    // API endpoint should return same structure
    const res = await request(app).get('/api/analytics/maintenance/trends?months=3').set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('labels');
    expect(Array.isArray(res.body.labels)).toBe(true);
    expect(res.body.datasets[0].data.length).toBe(3);
  });
});
