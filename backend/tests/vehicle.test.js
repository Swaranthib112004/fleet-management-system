process.env.NODE_ENV =  'test';
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
let app;

jest.setTimeout(60000);

describe('Vehicle CRUD', () => {
  let mongo;
  let token;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongo.getUri();
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
    app = require('../server');

    // register and login a manager user
    const user = { name: 'Manager', email: 'mgr@example.com', password: 'Password123!', role: 'manager' };
    await request(app).post('/api/auth/register').send(user);
    const login = await request(app).post('/api/auth/login').send({ email: user.email, password: user.password });
    token = login.body.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  test('create -> list -> get -> update -> delete', async () => {
    const vehicle = { vin: '1HGCM82633A004352', licensePlate: 'ABC123', make: 'Toyota', model: 'Corolla', year: 2020 };

    const createRes = await request(app).post('/api/vehicles').set('Authorization', `Bearer ${token}`).send(vehicle);
    expect(createRes.statusCode).toBe(201);
    expect(createRes.body.vehicle.vin).toBe(vehicle.vin);

    const listRes = await request(app).get('/api/vehicles').set('Authorization', `Bearer ${token}`);
    expect(listRes.statusCode).toBe(200);
    expect(listRes.body.total).toBe(1);

    const id = createRes.body.vehicle._id;
    const getRes = await request(app).get(`/api/vehicles/${id}`).set('Authorization', `Bearer ${token}`);
    expect(getRes.statusCode).toBe(200);
    expect(getRes.body._id).toBe(id);

    const updateRes = await request(app).put(`/api/vehicles/${id}`).set('Authorization', `Bearer ${token}`).send({ status: 'maintenance' });
    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.vehicle.status).toBe('maintenance');

    const deleteRes = await request(app).delete(`/api/vehicles/${id}`).set('Authorization', `Bearer ${token}`);
    expect(deleteRes.statusCode).toBe(200);

    const listAfter = await request(app).get('/api/vehicles').set('Authorization', `Bearer ${token}`);
    expect(listAfter.body.total).toBe(0);
  });

  test('validation failure on create', async () => {
    const bad = { licensePlate: 'NOVIN' };
    const res = await request(app).post('/api/vehicles').set('Authorization', `Bearer ${token}`).send(bad);
    expect(res.statusCode).toBe(400);
  });

  test('pagination and search filters', async () => {
    // create several vehicles
    const vans = [];
    for (let i = 0; i < 15; i++) {
      const v = { vin: `VIN${i}`, licensePlate: `PLATE${i}`, make: 'Ford', model: 'Transit', year: 2019, status: i % 2 === 0 ? 'Active' : 'Maintenance' };
      const r = await request(app).post('/api/vehicles').set('Authorization', `Bearer ${token}`).send(v);
      vans.push(r.body.vehicle);
    }

    // page 1 limit 5
    const page1 = await request(app).get('/api/vehicles?page=1&limit=5').set('Authorization', `Bearer ${token}`);
    expect(page1.body.page).toBe(1);
    expect(page1.body.vehicles.length).toBe(5);
    expect(page1.body.total).toBe(15);

    // search by VIN
    const search = await request(app).get('/api/vehicles?search=VIN1').set('Authorization', `Bearer ${token}`);
    expect(search.body.total).toBeGreaterThan(0);
    expect(search.body.vehicles[0].vin).toContain('VIN1');

    // filter status
    const statusFilter = await request(app).get('/api/vehicles?status=Active').set('Authorization', `Bearer ${token}`);
    statusFilter.body.vehicles.forEach((v) => expect(v.status).toBe('Active'));
  });
});