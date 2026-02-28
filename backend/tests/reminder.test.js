process.env.NODE_ENV = 'test';
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Reminder = require('../models/reminderModel');
const emailService = require('../services/emailService');
let app;

jest.setTimeout(60000);

jest.mock('../services/emailService');

describe('Reminders & Scheduler', () => {
  let mongo;
  let token;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongo.getUri();
    process.env.JWT_SECRET = 'testsecret';
    app = require('../server');

    const user = { name: 'Manager', email: 'mgr3@example.com', password: 'Password123!', role: 'manager' };
    await request(app).post('/api/auth/register').send(user);
    const login = await request(app).post('/api/auth/login').send({ email: user.email, password: user.password });
    token = login.body.accessToken;

    // ensure sendEmail resolves
    emailService.sendEmail.mockResolvedValue({});
  });

  afterAll(async () => {
    // teardown agenda shim if used
    const { _teardown } = require('../jobs/scheduler');
    if (_teardown) _teardown();

    await mongoose.disconnect();
    await mongo.stop();
  });

  test('create reminder and worker processes it', async () => {
    // create reminder scheduled for now
    const now = new Date();
    // include user so reminder has recipient
    const User = require('../models/userModel');
    const usr = await User.findOne({ email: 'mgr3@example.com' });

    const res = await request(app).post('/api/reminders').set('Authorization', `Bearer ${token}`).send({ scheduleAt: now, message: 'Test reminder', user: usr._id });
    expect(res.statusCode).toBe(201);

    // run scheduler.start manually
    const { initAgenda } = require('../jobs/scheduler');
    await initAgenda(process.env.MONGO_URI);

    // wait a bit for agenda to process
    await new Promise(r => setTimeout(r, 2500));

    const reminders = await Reminder.find();
    expect(reminders.length).toBe(1);

    // emailService.sendEmail should have been called
    expect(emailService.sendEmail).toHaveBeenCalled();

    const updated = await Reminder.findById(reminders[0]._id);
    expect(['sent','failed']).toContain(updated.status);
  });
});