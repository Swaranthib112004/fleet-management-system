const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const fs = require('fs');
const path = require('path');
let app;

jest.setTimeout(60000);

describe('Upload flows', () => {
  let mongo;
  let token;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongo.getUri();
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
    app = require('../server');

    // register and login a manager user
    const user = { name: 'Manager', email: 'mgr2@example.com', password: 'Password123!', role: 'manager' };
    await request(app).post('/api/auth/register').send(user);
    const login = await request(app).post('/api/auth/login').send({ email: user.email, password: user.password });
    token = login.body.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  test('upload valid file', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'sample.pdf');
    // ensure fixture exists; create a small file
    fs.mkdirSync(path.join(__dirname, 'fixtures'), { recursive: true });
    fs.writeFileSync(filePath, 'hello');

    const res = await request(app)
      .post('/api/uploads')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', filePath)
      .field('relatedTo', JSON.stringify({ kind: 'Vehicle' }));

    expect(res.statusCode).toBe(201);
    expect(res.body.document).toHaveProperty('url');
  });

  test('reject invalid mime', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'sample.exe');
    fs.writeFileSync(filePath, 'exe');

    const res = await request(app)
      .post('/api/uploads')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', filePath);

    expect(res.statusCode).toBe(400); // invalid file type should result in 400
  });
});