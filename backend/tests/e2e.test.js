process.env.NODE_ENV = 'test';
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
let app;

jest.setTimeout(60000);

describe('End-to-end flow', () => {
  let mongo;
  let adminToken;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongo.getUri();
    process.env.JWT_SECRET = 'testsecret';
    app = require('../server');

    // create admin user
    const admin = { name: 'AdminUser', email: 'admin@example.com', password: 'Password123!', role: 'admin' };
    await request(app).post('/api/auth/register').send(admin);
    const login = await request(app).post('/api/auth/login').send({ email: admin.email, password: admin.password });
    adminToken = login.body.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  test('workflow: vehicles, drivers, maintenance, dashboard', async () => {
    // create a vehicle
    const veh = { vin: 'E2EVIN123', licensePlate: 'E2E1' };
    const vehRes = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(veh);
    expect(vehRes.statusCode).toBe(201);
    const vehicleId = vehRes.body.vehicle._id;

    // create a driver and assign vehicle
    const drv = { name: 'E2E Driver', licenseNumber: 'L123', licenseExpiry: new Date(Date.now() + 1000*60*60*24*365) };
    const drvRes = await request(app)
      .post('/api/drivers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(drv);
    expect(drvRes.statusCode).toBe(201);
    const driverId = drvRes.body.driver._id;

    await request(app)
      .put(`/api/drivers/${driverId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedVehicle: vehicleId });

    // log a maintenance entry
    const mRes = await request(app)
      .post('/api/maintenance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ vehicle: vehicleId, type: 'inspection', notes: 'e2e test' });
    expect(mRes.statusCode).toBe(201);

    // hit dashboard overview
    const dash = await request(app)
      .get('/api/dashboard/overview')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(dash.statusCode).toBe(200);
    expect(dash.body.stats).toBeDefined();
    expect(dash.body.stats.find(s => s.label === 'Total Vehicles').value).toBe('1');

    // ensure analytics endpoint works
    const ana = await request(app)
      .get('/api/analytics/maintenance/trends?months=1')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(ana.statusCode).toBe(200);
    expect(ana.body.labels).toBeDefined();

    // create a reminder and verify it appears
    const rem = await request(app)
      .post('/api/reminders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Check', date: new Date(), vehicle: vehicleId, critical: false });
    expect(rem.statusCode).toBe(201);

    const listRem = await request(app)
      .get('/api/reminders')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listRem.statusCode).toBe(200);
    expect(listRem.body.length).toBeGreaterThan(0);
  });

  test('roles, audit logs, routes & uploads', async () => {
    // fetch roles
    const rolesRes = await request(app)
      .get('/api/roles')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(rolesRes.statusCode).toBe(200);
    expect(Array.isArray(rolesRes.body)).toBe(true);

    // after earlier actions there should be audit records
    const auditRes = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(auditRes.statusCode).toBe(200);
    expect(auditRes.body.length).toBeGreaterThanOrEqual(1);

    // create a simple route
    const routePayload = {
      vehicle: vehicleId,
      driver: driverId,
      startLocation: { lat: 0, lon: 0 },
      endLocation: { lat: 1, lon: 1 },
      waypoints: [],
    };
    const routeRes = await request(app)
      .post('/api/routes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(routePayload);
    expect(routeRes.statusCode).toBe(201);
    const routeId = routeRes.body.data._id;

    // test optimize route endpoint
    const optRes = await request(app)
      .post('/api/routes/optimize')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ waypoints: [{ lat: 0, lon: 0 }, { lat: 1, lon: 1 }] });
    expect(optRes.statusCode).toBe(200);
    expect(optRes.body.data).toBeDefined();

    // upload a dummy file
    const uploadRes = await request(app)
      .post('/api/uploads')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('test'), 'test.txt');
    expect(uploadRes.statusCode).toBe(201);
    expect(uploadRes.body.file).toBeDefined();

    // toggle a notification setting (create dummy first)
    const createNot = await request(app)
      .post('/api/settings/notifications')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ label: 'Test', desc: 'desc', enabled: true });
    expect(createNot.statusCode).toBe(201);
    const noteId = createNot.body.setting._id;
    const toggleRes = await request(app)
      .post(`/api/settings/notifications/${noteId}/toggle`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(toggleRes.statusCode).toBe(200);
    expect(toggleRes.body.enabled).toBeDefined();
  });
});
