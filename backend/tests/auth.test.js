// ensure tests run with test environment and open register route
process.env.NODE_ENV = 'test';
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
let app;

jest.setTimeout(60000);

describe('Auth flows', () => {
  let mongo;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongo.getUri();
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
    app = require('../server');
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  test('register -> login -> refresh -> logout', async () => {
    const user = { name: 'Test User', email: 'test@example.com', password: 'Password123!', role: 'manager' };

    const reg = await request(app).post('/api/auth/register').send(user);
    expect(reg.statusCode).toBe(201);
    expect(reg.body.user.email).toBe('test@example.com');

    const login = await request(app).post('/api/auth/login').send({ email: user.email, password: user.password });
    expect(login.statusCode).toBe(200);
    expect(login.body).toHaveProperty('accessToken');
    expect(login.body).toHaveProperty('refreshToken');

    const firstRefresh = login.body.refreshToken;

    // include access token for refresh since route now accepts either but
    // it's valid to send it here to authenticate the user
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ refreshToken: firstRefresh });
    expect(refreshRes.statusCode).toBe(200);
    expect(refreshRes.body).toHaveProperty('accessToken');
    expect(refreshRes.body).toHaveProperty('refreshToken');

    const newRefresh = refreshRes.body.refreshToken;

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ refreshToken: newRefresh });
    expect(logoutRes.statusCode).toBe(200);

    // Attempt using revoked token
    const failRefresh = await request(app).post('/api/auth/refresh').send({ refreshToken: newRefresh });
    expect(failRefresh.statusCode).toBe(401);
  });
});