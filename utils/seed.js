const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Record = require('../models/Record');

dotenv.config();

const users = [
  { name: 'Alice Admin', email: 'admin@test.com', password: 'password123', role: 'admin', status: 'active' },
  { name: 'Bob Analyst', email: 'analyst@test.com', password: 'password123', role: 'analyst', status: 'active' },
  { name: 'Carol Viewer', email: 'viewer@test.com', password: 'password123', role: 'viewer', status: 'active' },
];

const makeRecords = (userId) => [
  { amount: 5000, type: 'income', category: 'Salary', date: new Date('2024-01-15'), note: 'January salary', userId },
  { amount: 1200, type: 'expense', category: 'Rent', date: new Date('2024-01-05'), note: 'Monthly rent', userId },
  { amount: 250, type: 'expense', category: 'Groceries', date: new Date('2024-01-10'), note: 'Weekly groceries', userId },
  { amount: 800, type: 'income', category: 'Freelance', date: new Date('2024-01-20'), note: 'Website project', userId },
  { amount: 150, type: 'expense', category: 'Utilities', date: new Date('2024-01-25'), note: 'Electricity bill', userId },
  { amount: 5000, type: 'income', category: 'Salary', date: new Date('2024-02-15'), note: 'February salary', userId },
  { amount: 1200, type: 'expense', category: 'Rent', date: new Date('2024-02-05'), note: 'Monthly rent', userId },
  { amount: 300, type: 'expense', category: 'Groceries', date: new Date('2024-02-12'), note: 'Groceries and supplies', userId },
  { amount: 100, type: 'expense', category: 'Transport', date: new Date('2024-02-18'), note: 'Gas and parking', userId },
  { amount: 5200, type: 'income', category: 'Salary', date: new Date('2024-03-15'), note: 'March salary', userId },
  { amount: 1200, type: 'expense', category: 'Rent', date: new Date('2024-03-05'), note: 'Monthly rent', userId },
  { amount: 500, type: 'income', category: 'Freelance', date: new Date('2024-03-22'), note: 'Logo design', userId },
  { amount: 180, type: 'expense', category: 'Utilities', date: new Date('2024-03-25'), note: 'Internet + phone', userId },
  { amount: 75, type: 'expense', category: 'Entertainment', date: new Date('2024-03-28'), note: 'Movie and dinner', userId },
  { amount: 5200, type: 'income', category: 'Salary', date: new Date('2024-04-15'), note: 'April salary', userId },
  { amount: 1200, type: 'expense', category: 'Rent', date: new Date('2024-04-05'), note: 'Monthly rent', userId },
  { amount: 350, type: 'expense', category: 'Groceries', date: new Date('2024-04-08'), note: 'Weekly groceries', userId },
  { amount: 1500, type: 'income', category: 'Freelance', date: new Date('2024-04-20'), note: 'Mobile app project', userId },
  { amount: 200, type: 'expense', category: 'Healthcare', date: new Date('2024-04-22'), note: 'Doctor visit', userId },
  { amount: 60, type: 'expense', category: 'Transport', date: new Date('2024-04-25'), note: 'Metro pass', userId },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    await User.deleteMany({});
    await Record.deleteMany({});
    console.log('Cleared existing data');

    const createdUsers = await User.create(users);
    console.log(`Created ${createdUsers.length} users`);

    const adminUser = createdUsers.find((u) => u.role === 'admin');
    const records = makeRecords(adminUser._id);
    await Record.insertMany(records);
    console.log(`Created ${records.length} financial records`);

    console.log('\n--- Demo Credentials ---');
    console.log('Admin:   admin@test.com   / password123');
    console.log('Analyst: analyst@test.com / password123');
    console.log('Viewer:  viewer@test.com  / password123');

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
};

seed();
