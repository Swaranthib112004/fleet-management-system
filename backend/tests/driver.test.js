process.env.NODE_ENV = 'test';
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
let app;

jest.setTimeout(60000);

describe('Driver CRUD', () => {
  let mongo;
  let token;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongo.getUri();
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
    app = require('../server');

    const user = { name: 'Mgr', email: 'mgr-driver@example.com', password: 'Password123!', role: 'manager' };
    await request(app).post('/api/auth/register').send(user);
    const login = await request(app).post('/api/auth/login').send({ email: user.email, password: user.password });
    token = login.body.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  test('create -> list -> get -> update -> delete', async () => {
    const driver = { name: 'John Doe', licenseNumber: 'D1234567', licenseExpiry: new Date(Date.now() + 1000*60*60*24*365) };

    const createRes = await request(app).post('/api/drivers').set('Authorization', `Bearer ${token}`).send(driver);
    expect(createRes.statusCode).toBe(201);
    expect(createRes.body.driver.licenseNumber).toBe(driver.licenseNumber);

    const listRes = await request(app).get('/api/drivers').set('Authorization', `Bearer ${token}`);
    expect(listRes.statusCode).toBe(200);
    expect(listRes.body.total).toBe(1);

    const id = createRes.body.driver._id;
    const getRes = await request(app).get(`/api/drivers/${id}`).set('Authorization', `Bearer ${token}`);
    expect(getRes.statusCode).toBe(200);

    const updateRes = await request(app).put(`/api/drivers/${id}`).set('Authorization', `Bearer ${token}`).send({ name: 'Jane' });
    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.driver.name).toBe('Jane');

    const deleteRes = await request(app).delete(`/api/drivers/${id}`).set('Authorization', `Bearer ${token}`);
    expect(deleteRes.statusCode).toBe(200);

    const listAfter = await request(app).get('/api/drivers').set('Authorization', `Bearer ${token}`);
    expect(listAfter.body.total).toBe(0);
  });

  test('assign driver to vehicle', async () => {
    // create driver
    const driverRes = await request(app).post('/api/drivers').set('Authorization', `Bearer ${token}`).send({ name: 'Assign', licenseNumber: 'X999', licenseExpiry: new Date(Date.now() + 1000*60*60*24*365) });
    const driverId = driverRes.body.driver._id;

    // create vehicle
    const vehicle = { vin: '1HGCM82633A000000', licensePlate: 'ASSIGN1' };
    const createVeh = await request(app).post('/api/vehicles').set('Authorization', `Bearer ${token}`).send(vehicle);
    expect(createVeh.statusCode).toBe(201);
    const vehicleId = createVeh.body.vehicle._id;

    // assign driver (update driver assignedVehicle)
    const assignRes = await request(app).put(`/api/drivers/${driverId}`).set('Authorization', `Bearer ${token}`).send({ assignedVehicle: vehicleId });
    expect(assignRes.statusCode).toBe(200);
    expect(assignRes.body.driver.assignedVehicle).toBe(vehicleId);

    // verify vehicle can also reflect currentDriver if needed (optional)
    const updateVeh = await request(app).put(`/api/vehicles/${vehicleId}`).set('Authorization', `Bearer ${token}`).send({ currentDriver: driverId });
    expect(updateVeh.statusCode).toBe(200);
    expect(updateVeh.body.vehicle.currentDriver).toBe(driverId);
  });
});