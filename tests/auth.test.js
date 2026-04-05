const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongoServer.getUri();
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.JWT_EXPIRES_IN = '1d';
    process.env.NODE_ENV = 'test';
    await mongoose.connect(mongoServer.getUri());
    app = require('../server');
});

afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

// ---------- Helpers ----------
const registerUser = (data) =>
    request(app).post('/api/v1/auth/register').send(data);

const loginUser = (data) =>
    request(app).post('/api/v1/auth/login').send(data);

const adminData = { name: 'Alice Admin', email: 'admin@test.com', password: 'password123', role: 'admin' };

// ---------- Tests ----------

describe('POST /api/v1/auth/register', () => {
    it('should register a new user and return token', async () => {
        const res = await registerUser(adminData);
        expect(res.status).toBe(201);
        expect(res.body.token).toBeDefined();
        expect(res.body.data.user.email).toBe('admin@test.com');
        expect(res.body.data.user.role).toBe('admin');
    });

    it('should reject duplicate email', async () => {
        await registerUser(adminData);
        const res = await registerUser(adminData);
        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/already registered/i);
    });

    it('should reject missing name', async () => {
        const res = await registerUser({ email: 'x@x.com', password: 'password123' });
        expect(res.status).toBe(400);
    });

    it('should reject invalid email', async () => {
        const res = await registerUser({ name: 'Test', email: 'not-an-email', password: 'password123' });
        expect(res.status).toBe(400);
    });

    it('should reject short password', async () => {
        const res = await registerUser({ name: 'Test', email: 'a@b.com', password: '123' });
        expect(res.status).toBe(400);
    });
});

describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
        await registerUser(adminData);
    });

    it('should login and return token', async () => {
        const res = await loginUser({ email: 'admin@test.com', password: 'password123' });
        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(res.body.data.user.role).toBe('admin');
    });

    it('should reject wrong password', async () => {
        const res = await loginUser({ email: 'admin@test.com', password: 'wrongpassword' });
        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/invalid/i);
    });

    it('should reject non-existent email', async () => {
        const res = await loginUser({ email: 'nobody@test.com', password: 'password123' });
        expect(res.status).toBe(401);
    });

    it('should reject missing credentials', async () => {
        const res = await loginUser({});
        expect(res.status).toBe(400);
    });

    it('should reject inactive user', async () => {
        const User = require('../models/User');
        await User.updateOne({ email: 'admin@test.com' }, { status: 'inactive' });
        const res = await loginUser({ email: 'admin@test.com', password: 'password123' });
        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/inactive/i);
    });
});
