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
const register = (data) => request(app).post('/api/v1/auth/register').send(data);
const login = (data) => request(app).post('/api/v1/auth/login').send(data);

const adminData = { name: 'Alice', email: 'admin@test.com', password: 'password123', role: 'admin' };
const analystData = { name: 'Bob', email: 'analyst@test.com', password: 'password123', role: 'analyst' };
const viewerData = { name: 'Carol', email: 'viewer@test.com', password: 'password123', role: 'viewer' };

const getToken = async (userData) => {
    await register(userData);
    const res = await login({ email: userData.email, password: userData.password });
    return res.body.token;
};

// ---------- Tests ----------

describe('User Management (Admin)', () => {
    let adminToken, analystUserId;

    beforeEach(async () => {
        adminToken = await getToken(adminData);
        const analystRes = await register(analystData);
        analystUserId = analystRes.body.data.user.id;
        await register(viewerData);
    });

    it('admin can list all users', async () => {
        const res = await request(app)
            .get('/api/v1/users')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.results).toBe(3);
        expect(res.body.total).toBe(3);
    });

    it('admin can filter users by role', async () => {
        const res = await request(app)
            .get('/api/v1/users?role=analyst')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.results).toBe(1);
        expect(res.body.data.users[0].role).toBe('analyst');
    });

    it('admin can get a specific user', async () => {
        const res = await request(app)
            .get(`/api/v1/users/${analystUserId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data.user.email).toBe('analyst@test.com');
    });

    it('admin can update user role', async () => {
        const res = await request(app)
            .patch(`/api/v1/users/${analystUserId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ role: 'admin' });
        expect(res.status).toBe(200);
        expect(res.body.data.user.role).toBe('admin');
    });

    it('admin can update user status', async () => {
        const res = await request(app)
            .patch(`/api/v1/users/${analystUserId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'inactive' });
        expect(res.status).toBe(200);
        expect(res.body.data.user.status).toBe('inactive');
    });

    it('admin can delete a user', async () => {
        const res = await request(app)
            .delete(`/api/v1/users/${analystUserId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(204);
    });

    it('admin cannot delete themselves', async () => {
        const meRes = await request(app)
            .get('/api/v1/users/me')
            .set('Authorization', `Bearer ${adminToken}`);
        const adminId = meRes.body.data.user._id;

        const res = await request(app)
            .delete(`/api/v1/users/${adminId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/cannot delete your own/i);
    });

    it('rejects invalid role in update', async () => {
        const res = await request(app)
            .patch(`/api/v1/users/${analystUserId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ role: 'superadmin' });
        expect(res.status).toBe(400);
    });

    it('rejects invalid status in update', async () => {
        const res = await request(app)
            .patch(`/api/v1/users/${analystUserId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'suspended' });
        expect(res.status).toBe(400);
    });

    it('returns 404 for non-existent user', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app)
            .get(`/api/v1/users/${fakeId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(404);
    });
});

describe('User Management RBAC', () => {
    it('analyst cannot access user list', async () => {
        const analystToken = await getToken(analystData);
        const res = await request(app)
            .get('/api/v1/users')
            .set('Authorization', `Bearer ${analystToken}`);
        expect(res.status).toBe(403);
    });

    it('viewer cannot access user list', async () => {
        const viewerToken = await getToken(viewerData);
        const res = await request(app)
            .get('/api/v1/users')
            .set('Authorization', `Bearer ${viewerToken}`);
        expect(res.status).toBe(403);
    });

    it('any authenticated user can get own profile', async () => {
        const viewerToken = await getToken(viewerData);
        const res = await request(app)
            .get('/api/v1/users/me')
            .set('Authorization', `Bearer ${viewerToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data.user.email).toBe('viewer@test.com');
    });
});
