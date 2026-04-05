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
const viewerData = { name: 'Carol', email: 'viewer@test.com', password: 'password123', role: 'viewer' };

const getToken = async (userData) => {
    await register(userData);
    const res = await login({ email: userData.email, password: userData.password });
    return res.body.token;
};

const seedRecords = async (token) => {
    const records = [
        { amount: 5000, type: 'income', category: 'Salary', date: '2024-01-15', note: 'Jan salary' },
        { amount: 1200, type: 'expense', category: 'Rent', date: '2024-01-05', note: 'Jan rent' },
        { amount: 300, type: 'expense', category: 'Groceries', date: '2024-01-10', note: 'Groceries' },
        { amount: 800, type: 'income', category: 'Freelance', date: '2024-02-20', note: 'Side project' },
        { amount: 5000, type: 'income', category: 'Salary', date: '2024-02-15', note: 'Feb salary' },
        { amount: 1200, type: 'expense', category: 'Rent', date: '2024-02-05', note: 'Feb rent' },
        { amount: 200, type: 'expense', category: 'Utilities', date: '2024-03-10', note: 'Electricity' },
        { amount: 5200, type: 'income', category: 'Salary', date: '2024-03-15', note: 'Mar salary' },
    ];

    for (const r of records) {
        await request(app).post('/api/v1/records').set('Authorization', `Bearer ${token}`).send(r);
    }
};

// ---------- Tests ----------

describe('Dashboard APIs', () => {
    let adminToken, viewerToken;

    beforeEach(async () => {
        adminToken = await getToken(adminData);
        viewerToken = await getToken(viewerData);
        await seedRecords(adminToken);
    });

    describe('GET /api/v1/dashboard/summary', () => {
        it('should return correct totals', async () => {
            const res = await request(app)
                .get('/api/v1/dashboard/summary')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            expect(res.body.data.totalIncome).toBe(16000); // 5000 + 800 + 5000 + 5200
            expect(res.body.data.totalExpense).toBe(2900); // 1200 + 300 + 1200 + 200
            expect(res.body.data.netBalance).toBe(13100);
        });

        it('viewer can access summary', async () => {
            const res = await request(app)
                .get('/api/v1/dashboard/summary')
                .set('Authorization', `Bearer ${viewerToken}`);
            expect(res.status).toBe(200);
            expect(res.body.data.totalIncome).toBeDefined();
        });
    });

    describe('GET /api/v1/dashboard/categories', () => {
        it('should return category-wise totals', async () => {
            const res = await request(app)
                .get('/api/v1/dashboard/categories')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            expect(res.body.data.categories.length).toBeGreaterThan(0);

            const salary = res.body.data.categories.find(
                (c) => c.category === 'Salary' && c.type === 'income'
            );
            expect(salary).toBeDefined();
            expect(salary.total).toBe(15200); // 5000 + 5000 + 5200
        });

        it('should filter categories by type', async () => {
            const res = await request(app)
                .get('/api/v1/dashboard/categories?type=expense')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            res.body.data.categories.forEach((c) => {
                expect(c.type).toBe('expense');
            });
        });
    });

    describe('GET /api/v1/dashboard/recent', () => {
        it('should return last 5 transactions sorted by date desc', async () => {
            const res = await request(app)
                .get('/api/v1/dashboard/recent')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            expect(res.body.data.records.length).toBeLessThanOrEqual(5);

            // Verify descending order
            const dates = res.body.data.records.map((r) => new Date(r.date));
            for (let i = 1; i < dates.length; i++) {
                expect(dates[i - 1].getTime()).toBeGreaterThanOrEqual(dates[i].getTime());
            }
        });
    });

    describe('GET /api/v1/dashboard/trends', () => {
        it('should return monthly trends', async () => {
            const res = await request(app)
                .get('/api/v1/dashboard/trends?year=2024')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            expect(res.body.data.trends.length).toBeGreaterThan(0);

            const jan = res.body.data.trends.find((t) => t.month === 1 && t.year === 2024);
            expect(jan).toBeDefined();
            expect(jan.income).toBe(5000);
            expect(jan.expense).toBe(1500); // 1200 + 300
        });
    });

    describe('GET /api/v1/dashboard (full)', () => {
        it('should return combined dashboard data', async () => {
            const res = await request(app)
                .get('/api/v1/dashboard')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            expect(res.body.data.summary).toBeDefined();
            expect(res.body.data.categoryTotals).toBeDefined();
            expect(res.body.data.recentTransactions).toBeDefined();
            expect(res.body.data.monthlyTrends).toBeDefined();
            expect(res.body.data.summary.netBalance).toBe(13100);
        });
    });

    it('unauthenticated user cannot access dashboard', async () => {
        const res = await request(app).get('/api/v1/dashboard');
        expect(res.status).toBe(401);
    });
});
