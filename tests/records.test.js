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

const sampleRecord = {
    amount: 5000,
    type: 'income',
    category: 'Salary',
    date: '2024-06-01',
    note: 'Monthly salary',
};

// ---------- Tests ----------

describe('Financial Records CRUD (Admin)', () => {
    let adminToken;

    beforeEach(async () => {
        adminToken = await getToken(adminData);
    });

    it('should create a record', async () => {
        const res = await request(app)
            .post('/api/v1/records')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(sampleRecord);
        expect(res.status).toBe(201);
        expect(res.body.data.record.amount).toBe(5000);
        expect(res.body.data.record.type).toBe('income');
        expect(res.body.data.record.category).toBe('Salary');
    });

    it('should reject record with missing amount', async () => {
        const res = await request(app)
            .post('/api/v1/records')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ type: 'income', category: 'Test' });
        expect(res.status).toBe(400);
    });

    it('should reject record with invalid type', async () => {
        const res = await request(app)
            .post('/api/v1/records')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ amount: 100, type: 'donation', category: 'Test' });
        expect(res.status).toBe(400);
    });

    it('should get all records (paginated)', async () => {
        await request(app).post('/api/v1/records').set('Authorization', `Bearer ${adminToken}`).send(sampleRecord);
        await request(app).post('/api/v1/records').set('Authorization', `Bearer ${adminToken}`)
            .send({ ...sampleRecord, amount: 1200, type: 'expense', category: 'Rent' });

        const res = await request(app)
            .get('/api/v1/records?page=1&limit=10')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.results).toBe(2);
        expect(res.body.total).toBe(2);
    });

    it('should filter by type', async () => {
        await request(app).post('/api/v1/records').set('Authorization', `Bearer ${adminToken}`).send(sampleRecord);
        await request(app).post('/api/v1/records').set('Authorization', `Bearer ${adminToken}`)
            .send({ ...sampleRecord, type: 'expense', category: 'Rent', amount: 1200 });

        const res = await request(app)
            .get('/api/v1/records?type=expense')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.results).toBe(1);
        expect(res.body.data.records[0].type).toBe('expense');
    });

    it('should filter by category (partial match)', async () => {
        await request(app).post('/api/v1/records').set('Authorization', `Bearer ${adminToken}`).send(sampleRecord);
        const res = await request(app)
            .get('/api/v1/records?category=sal')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.results).toBe(1);
    });

    it('should search across note and category', async () => {
        await request(app).post('/api/v1/records').set('Authorization', `Bearer ${adminToken}`).send(sampleRecord);
        const res = await request(app)
            .get('/api/v1/records?search=monthly')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.results).toBe(1);
    });

    it('should filter by date range', async () => {
        await request(app).post('/api/v1/records').set('Authorization', `Bearer ${adminToken}`).send(sampleRecord);
        await request(app).post('/api/v1/records').set('Authorization', `Bearer ${adminToken}`)
            .send({ ...sampleRecord, date: '2024-01-01' });

        const res = await request(app)
            .get('/api/v1/records?startDate=2024-05-01&endDate=2024-07-01')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.results).toBe(1);
    });

    it('should update a record', async () => {
        const createRes = await request(app)
            .post('/api/v1/records')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(sampleRecord);
        const id = createRes.body.data.record._id;

        const res = await request(app)
            .patch(`/api/v1/records/${id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ amount: 6000, note: 'Updated salary' });
        expect(res.status).toBe(200);
        expect(res.body.data.record.amount).toBe(6000);
        expect(res.body.data.record.note).toBe('Updated salary');
    });

    it('should soft delete a record', async () => {
        const createRes = await request(app)
            .post('/api/v1/records')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(sampleRecord);
        const id = createRes.body.data.record._id;

        const delRes = await request(app)
            .delete(`/api/v1/records/${id}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(delRes.status).toBe(200);
        expect(delRes.body.message).toMatch(/deleted/i);

        // Record should no longer appear in listing
        const listRes = await request(app)
            .get('/api/v1/records')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(listRes.body.results).toBe(0);
    });

    it('should return 404 for non-existent record', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app)
            .get(`/api/v1/records/${fakeId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(404);
    });
});

describe('Financial Records RBAC', () => {
    let adminToken, analystToken, viewerToken;

    beforeEach(async () => {
        adminToken = await getToken(adminData);
        analystToken = await getToken(analystData);
        viewerToken = await getToken(viewerData);

        // Admin creates a record
        await request(app)
            .post('/api/v1/records')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(sampleRecord);
    });

    it('analyst can read records', async () => {
        const res = await request(app)
            .get('/api/v1/records')
            .set('Authorization', `Bearer ${analystToken}`);
        expect(res.status).toBe(200);
        expect(res.body.results).toBe(1);
    });

    it('analyst cannot create records', async () => {
        const res = await request(app)
            .post('/api/v1/records')
            .set('Authorization', `Bearer ${analystToken}`)
            .send(sampleRecord);
        expect(res.status).toBe(403);
    });

    it('analyst cannot delete records', async () => {
        const listRes = await request(app)
            .get('/api/v1/records')
            .set('Authorization', `Bearer ${adminToken}`);
        const id = listRes.body.data.records[0]._id;

        const res = await request(app)
            .delete(`/api/v1/records/${id}`)
            .set('Authorization', `Bearer ${analystToken}`);
        expect(res.status).toBe(403);
    });

    it('viewer cannot read records', async () => {
        const res = await request(app)
            .get('/api/v1/records')
            .set('Authorization', `Bearer ${viewerToken}`);
        expect(res.status).toBe(403);
    });

    it('viewer cannot create records', async () => {
        const res = await request(app)
            .post('/api/v1/records')
            .set('Authorization', `Bearer ${viewerToken}`)
            .send(sampleRecord);
        expect(res.status).toBe(403);
    });

    it('unauthenticated user cannot access records', async () => {
        const res = await request(app).get('/api/v1/records');
        expect(res.status).toBe(401);
    });
});
