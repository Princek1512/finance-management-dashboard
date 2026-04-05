# 💰 Finance Data Processing & Access Control Backend

> A production-quality REST API built with **Node.js + Express + MongoDB + JWT** for managing financial records with full Role-Based Access Control (RBAC).

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-lightgrey?logo=express)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-green?logo=mongodb)](https://www.mongodb.com)
[![JWT](https://img.shields.io/badge/Auth-JWT-orange?logo=jsonwebtokens)](https://jwt.io)
[![Tests](https://img.shields.io/badge/Tests-96%20passed-brightgreen?logo=jest)](https://jestjs.io)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

**GitHub:** [https://github.com/Princek1512/finance-backend](https://github.com/Princek1512/finance-backend)

---

## 📋 Table of Contents

- [Features](#-features-implemented)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Setup & Installation](#-setup--installation)
- [Seed Data](#-seed-data)
- [Running Tests](#-running-tests)
- [Environment Variables](#-environment-variables)
- [Roles & Permissions](#-roles--permissions)
- [API Reference](#-api-reference)
- [Design Decisions](#-design-decisions--trade-offs)

---

## ✅ Features Implemented

| Feature | Status |
|---|---|
| 👤 User and Role Management | ✅ Implemented |
| 💳 Financial Records (CRUD) | ✅ Implemented |
| 🔍 Record Filtering (by date, category, type) | ✅ Implemented |
| 📊 Dashboard Summary APIs (totals, trends) | ✅ Implemented |
| 🔐 Role Based Access Control | ✅ Implemented |
| ✔️ Input Validation and Error Handling | ✅ Implemented |
| 🗄️ Data Persistence (Database) | ✅ Implemented |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js v18+ |
| **Framework** | Express.js |
| **Database** | MongoDB + Mongoose ODM |
| **Authentication** | JWT (jsonwebtoken) + bcryptjs |
| **Security** | Helmet, CORS, express-rate-limit |
| **Testing** | Jest, Supertest, mongodb-memory-server |
| **Dev** | Nodemon, dotenv |

---

## 📁 Project Structure

```
finance-backend/
├── config/
│   └── db.js                  # MongoDB connection
├── controllers/
│   ├── authController.js      # Register & login
│   ├── userController.js      # User CRUD (admin only)
│   ├── recordController.js    # Financial records CRUD
│   └── dashboardController.js # Aggregation & analytics
├── middleware/
│   ├── auth.js                # protect + restrictTo middleware
│   ├── errorHandler.js        # Centralized error handler
│   └── validate.js            # Input validation middleware
├── models/
│   ├── User.js                # User schema (role, status)
│   └── Record.js              # Record schema (soft delete)
├── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── recordRoutes.js
│   └── dashboardRoutes.js
├── tests/
│   ├── setup.js               # mongodb-memory-server setup
│   ├── auth.test.js           # Auth endpoint tests
│   ├── records.test.js        # Records CRUD + RBAC tests
│   ├── dashboard.test.js      # Dashboard aggregation tests
│   └── users.test.js          # User management tests
├── utils/
│   ├── AppError.js            # Custom error class
│   ├── catchAsync.js          # Async error wrapper
│   ├── jwt.js                 # Token sign/verify
│   └── seed.js                # Database seeder
├── public/
│   ├── index.html             # Minimal frontend (SPA)
│   ├── app.js                 # Frontend JavaScript
│   └── style.css              # Styles
├── .env.example
├── Finance_API.postman_collection.json
├── jest.config.js
├── package.json
└── server.js                  # Entry point
```

---

## 🚀 Setup & Installation

### Prerequisites
- **Node.js** v18 or higher
- **MongoDB** running locally OR a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) URI

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/Princek1512/finance-backend.git
cd finance-backend

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your values (see Environment Variables section)

# 4. Seed the database (optional but recommended)
npm run seed

# 5. Start the server
npm run dev        # development mode (nodemon, auto-restart)
npm start          # production mode
```

The API will be available at: **`http://localhost:5000`**  
The frontend UI will be available at: **`http://localhost:5000`** (served as static files)

---

## 🌱 Seed Data

Populate the database with demo users and 20 sample financial records:

```bash
npm run seed
```

This creates the following demo accounts:

| Name | Email | Password | Role |
|---|---|---|---|
| Alice Admin | admin@test.com | password123 | admin |
| Bob Analyst | analyst@test.com | password123 | analyst |
| Carol Viewer | viewer@test.com | password123 | viewer |

Plus **20 financial records** (income/expense) spread across 4 months (Jan–Apr 2024) with categories: Salary, Freelance, Rent, Groceries, Utilities, Transport, Entertainment, Healthcare.

---

## 🧪 Running Tests

The test suite uses an **in-memory MongoDB instance** — no external database required.

```bash
npm test
```

**Test Coverage:**

| Test Suite | Tests |
|---|---|
| `auth.test.js` | Register, login, validation, inactive account |
| `records.test.js` | CRUD, filtering, search, pagination, soft delete, RBAC |
| `dashboard.test.js` | Summary totals, category aggregation, monthly trends |
| `users.test.js` | Admin user management, self-delete prevention |

**Result: ✅ 96 / 96 tests passing**

---

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/finance_db
JWT_SECRET=your_strong_secret_key_here
JWT_EXPIRES_IN=7d
```

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/finance_db` |
| `JWT_SECRET` | Secret key for signing JWTs | `your_super_secret_key` |
| `JWT_EXPIRES_IN` | JWT token expiry | `7d` |

> ⚠️ Never commit your `.env` file. Use `.env.example` as a template.

---

## 🔐 Roles & Permissions (RBAC)

| Action | viewer | analyst | admin |
|---|:---:|:---:|:---:|
| Login / Register | ✅ | ✅ | ✅ |
| View own profile (`/me`) | ✅ | ✅ | ✅ |
| Access dashboard APIs | ✅ | ✅ | ✅ |
| Read financial records | ❌ | ✅ | ✅ |
| Create financial records | ❌ | ❌ | ✅ |
| Update financial records | ❌ | ❌ | ✅ |
| Delete financial records | ❌ | ❌ | ✅ |
| Manage users (CRUD) | ❌ | ❌ | ✅ |

---

## 📡 API Reference

### 🔑 Auth

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Register a new user | None |
| `POST` | `/api/v1/auth/login` | Login and receive JWT | None |

**Register body:**
```json
{
  "name": "Alice Admin",
  "email": "admin@test.com",
  "password": "password123",
  "role": "admin"
}
```

**Login body:**
```json
{
  "email": "admin@test.com",
  "password": "password123"
}
```

**Auth response:**
```json
{
  "status": "success",
  "token": "eyJhbGci...",
  "data": {
    "user": { "id": "...", "name": "Alice Admin", "email": "admin@test.com", "role": "admin" }
  }
}
```

---

### 👤 Users *(Admin only, except `/me`)*

| Method | Endpoint | Description | Role |
|---|---|---|---|
| `GET` | `/api/v1/users/me` | Get own profile | Any |
| `GET` | `/api/v1/users` | List all users | Admin |
| `GET` | `/api/v1/users/:id` | Get user by ID | Admin |
| `PATCH` | `/api/v1/users/:id` | Update user role/status | Admin |
| `DELETE` | `/api/v1/users/:id` | Delete user | Admin |

---

### 💳 Financial Records

| Method | Endpoint | Description | Role |
|---|---|---|---|
| `POST` | `/api/v1/records` | Create a record | Admin |
| `GET` | `/api/v1/records` | List records (paginated) | Analyst, Admin |
| `GET` | `/api/v1/records/:id` | Get record by ID | Analyst, Admin |
| `PATCH` | `/api/v1/records/:id` | Update a record | Admin |
| `DELETE` | `/api/v1/records/:id` | Soft delete a record | Admin |

**Query parameters for `GET /records`:**

| Param | Type | Description |
|---|---|---|
| `type` | string | `income` or `expense` |
| `category` | string | Partial match (case insensitive) |
| `search` | string | Searches category AND note fields |
| `startDate` | date | ISO date (e.g. `2024-01-01`) |
| `endDate` | date | ISO date (e.g. `2024-12-31`) |
| `page` | number | Page number (default: `1`) |
| `limit` | number | Items per page (default: `10`) |
| `sortBy` | string | `date`, `amount`, or `createdAt` |
| `order` | string | `asc` or `desc` |

---

### 📊 Dashboard

| Method | Endpoint | Description | Role |
|---|---|---|---|
| `GET` | `/api/v1/dashboard` | Full dashboard (all data) | Any |
| `GET` | `/api/v1/dashboard/summary` | Total income, expense, net balance | Any |
| `GET` | `/api/v1/dashboard/categories` | Category-wise totals | Any |
| `GET` | `/api/v1/dashboard/recent` | Last 5 transactions | Any |
| `GET` | `/api/v1/dashboard/trends` | Monthly income vs expense trends | Any |

---

## 🏗 Design Decisions & Trade-offs

1. **Soft Delete for Records** — Records are never permanently deleted; `isDeleted: true` hides them from all queries and dashboard aggregations. This preserves data for auditing.

2. **Role-Based Access via Middleware** — `protect` (authentication) and `restrictTo(...roles)` (authorization) middleware are composed per route, making permissions explicit and easy to change.

3. **Dashboard Open to All Authenticated Roles** — All roles (including viewers) can see dashboard summaries. The distinction is that viewers cannot see individual raw record data.

4. **Centralized Error Handling** — All async errors are caught by `catchAsync` and flow to a single `errorHandler` middleware that handles Mongoose errors (`CastError`, `ValidationError`, `11000`), JWT errors, and custom `AppError` instances.

5. **Pagination on All List Endpoints** — All list endpoints support `page` / `limit` query params and return total count, page count, and current page in the response.

6. **Rate Limiting** — 100 requests per 15 minutes per IP on all `/api` routes to prevent abuse.

7. **Input Validation is Layered** — Structural validation happens in the `validate` middleware before the controller, while data integrity is enforced by Mongoose schema validators.

8. **Self-Delete Prevention** — Admins cannot delete their own account to prevent accidental lockout.

9. **Search** — The `search` query param performs a case-insensitive regex match across both `category` and `note` fields simultaneously using MongoDB `$or`.

10. **In-Memory Testing** — Tests use `mongodb-memory-server` — no real database needed to run the test suite, making CI/CD setup trivial.

---

## 🚨 Error Response Format

All errors return a consistent JSON structure:

```json
{
  "status": "error",
  "message": "Descriptive error message."
}
```

In `development` mode, a `stack` field is included for debugging.

### HTTP Status Codes

| Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Resource Created |
| `204` | No Content (delete) |
| `400` | Bad Request / Validation Error |
| `401` | Unauthorized (missing/invalid token) |
| `403` | Forbidden (insufficient role / inactive) |
| `404` | Resource Not Found |
| `409` | Conflict (duplicate email) |
| `429` | Rate Limit Exceeded |
| `500` | Internal Server Error |

---

## 📬 Postman Collection

A full Postman collection is included at `Finance_API.postman_collection.json`. Import it into Postman to test all API endpoints without setting up requests manually.

---

## 📄 License

MIT © [Princek1512](https://github.com/Princek1512)
