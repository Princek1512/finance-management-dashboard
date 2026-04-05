# Finance Data Processing & Access Control Backend

A production-quality REST API built with Node.js, Express, MongoDB, and JWT for managing financial records with role-based access control.

---

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB + Mongoose
- **Auth**: JWT + bcryptjs
- **Security**: Helmet, CORS, express-rate-limit
- **Testing**: Jest, Supertest, mongodb-memory-server

---

## Project Structure

```
backend/
├── config/
│   └── db.js                  # MongoDB connection
├── controllers/
│   ├── authController.js      # Register, login
│   ├── userController.js      # User CRUD (admin)
│   ├── recordController.js    # Financial record CRUD
│   └── dashboardController.js # Aggregation/analytics
├── middleware/
│   ├── auth.js                # protect + restrictTo
│   ├── errorHandler.js        # Centralized error handler
│   └── validate.js            # Input validation
├── models/
│   ├── User.js
│   └── Record.js
├── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── recordRoutes.js
│   └── dashboardRoutes.js
├── tests/
│   ├── setup.js               # Test setup (mongodb-memory-server)
│   ├── auth.test.js           # Auth endpoint tests
│   ├── records.test.js        # Records CRUD + RBAC tests
│   ├── dashboard.test.js      # Dashboard aggregation tests
│   └── users.test.js          # User management tests
├── utils/
│   ├── AppError.js            # Custom error class
│   ├── catchAsync.js          # Async wrapper
│   ├── jwt.js                 # Token sign/verify
│   └── seed.js                # Database seeder
├── .env.example
├── jest.config.js
├── package.json
├── Finance_API.postman_collection.json
└── server.js
```

---

## Setup & Installation

### Prerequisites
- Node.js v18+
- MongoDB running locally or a MongoDB Atlas URI

### Steps

```bash
# 1. Clone the repo
git clone <repo-url>
cd backend

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your values

# 4. Start the server
npm run dev        # development (nodemon)
npm start          # production
```

The API will be available at `http://localhost:5000`.

---

## Seed Data

Seed the database with demo users and sample financial records:

```bash
npm run seed
```

This creates:

| User           | Email              | Password      | Role    |
|----------------|--------------------|---------------|---------|
| Alice Admin    | admin@test.com     | password123   | admin   |
| Bob Analyst    | analyst@test.com   | password123   | analyst |
| Carol Viewer   | viewer@test.com    | password123   | viewer  |

Plus 20 sample financial records (income/expense) across 4 months with various categories.

---

## Running Tests

The test suite uses an in-memory MongoDB instance — no external database required.

```bash
npm test
```

Tests cover:
- **Auth** — register, login, validation, inactive accounts
- **Records** — CRUD, filtering, search, pagination, soft delete
- **Dashboard** — summary totals, category aggregation, trends
- **Users** — admin management, RBAC enforcement, self-delete prevention

---

## Environment Variables

| Variable        | Description                        | Example                          |
|-----------------|------------------------------------|----------------------------------|
| `NODE_ENV`      | Environment mode                   | `development`                    |
| `PORT`          | Server port                        | `5000`                           |
| `MONGO_URI`     | MongoDB connection string          | `mongodb://localhost:27017/finance_db` |
| `JWT_SECRET`    | Secret key for signing JWTs        | `your_secret_key`                |
| `JWT_EXPIRES_IN`| JWT expiry duration                | `7d`                             |

---

## Roles & Permissions

| Action                     | viewer | analyst | admin |
|----------------------------|--------|---------|-------|
| Access dashboard           | ✅     | ✅      | ✅    |
| Read financial records     | ❌     | ✅      | ✅    |
| Create financial records   | ❌     | ❌      | ✅    |
| Update financial records   | ❌     | ❌      | ✅    |
| Delete financial records   | ❌     | ❌      | ✅    |
| Manage users               | ❌     | ❌      | ✅    |
| View own profile           | ✅     | ✅      | ✅    |

---

## API Reference

### Auth

| Method | Endpoint              | Description        | Auth Required |
|--------|-----------------------|--------------------|---------------|
| POST   | `/api/v1/auth/register` | Register new user | No            |
| POST   | `/api/v1/auth/login`    | Login user        | No            |

### Users

| Method | Endpoint              | Description         | Role     |
|--------|-----------------------|---------------------|----------|
| GET    | `/api/v1/users/me`    | Get own profile     | Any      |
| GET    | `/api/v1/users`       | List all users      | Admin    |
| GET    | `/api/v1/users/:id`   | Get user by ID      | Admin    |
| PATCH  | `/api/v1/users/:id`   | Update user         | Admin    |
| DELETE | `/api/v1/users/:id`   | Delete user         | Admin    |

### Financial Records

| Method | Endpoint               | Description              | Role           |
|--------|------------------------|--------------------------|----------------|
| POST   | `/api/v1/records`      | Create record            | Admin          |
| GET    | `/api/v1/records`      | List records (paginated) | Analyst, Admin |
| GET    | `/api/v1/records/:id`  | Get record by ID         | Analyst, Admin |
| PATCH  | `/api/v1/records/:id`  | Update record            | Admin          |
| DELETE | `/api/v1/records/:id`  | Soft delete record       | Admin          |

**Query parameters for GET /records:**

| Param       | Type   | Description                    |
|-------------|--------|--------------------------------|
| `type`      | string | `income` or `expense`          |
| `category`  | string | Filter by category (partial)   |
| `search`    | string | Search across category & notes |
| `startDate` | date   | ISO date string                |
| `endDate`   | date   | ISO date string                |
| `page`      | number | Page number (default: 1)       |
| `limit`     | number | Items per page (default: 10)   |
| `sortBy`    | string | `date`, `amount`, `createdAt`  |
| `order`     | string | `asc` or `desc`                |

### Dashboard

| Method | Endpoint                      | Description                 | Role |
|--------|-------------------------------|-----------------------------|------|
| GET    | `/api/v1/dashboard`           | Full dashboard (all data)   | Any  |
| GET    | `/api/v1/dashboard/summary`   | Income, expense, net balance| Any  |
| GET    | `/api/v1/dashboard/categories`| Category-wise totals        | Any  |
| GET    | `/api/v1/dashboard/recent`    | Last 5 transactions         | Any  |
| GET    | `/api/v1/dashboard/trends`    | Monthly trends              | Any  |

---

## Design Decisions & Assumptions

1. **Soft delete**: Records are never hard-deleted; `isDeleted: true` hides them from all queries and dashboard aggregations.
2. **Role assignment on register**: The `role` field can be passed during registration. In a production system, you'd restrict this so only admins can assign elevated roles.
3. **Dashboard open to all roles**: All authenticated users (including viewers) can see dashboard summaries. Only analysts and admins can see individual raw records.
4. **Centralized error handling**: All async errors flow through a single `errorHandler` middleware that handles Mongoose errors, JWT errors, and custom `AppError` instances.
5. **Pagination**: All list endpoints support `page` and `limit` query params and return total count and page metadata.
6. **Rate limiting**: 100 requests per 15 minutes per IP on all `/api` routes.
7. **Input validation**: Validation is split between a dedicated `validate` middleware (for structural checks) and Mongoose schema validators (for data integrity).
8. **Self-delete prevention**: Admins cannot delete their own account to avoid accidental lockout.
9. **Search**: The `search` query param on records performs a case-insensitive regex match across both `category` and `note` fields.

---

## Error Response Format

All errors return a consistent JSON structure:

```json
{
  "status": "error",
  "message": "Descriptive error message."
}
```

In development mode, a `stack` field is also included for debugging.

### Common Status Codes

| Code | Meaning                    |
|------|----------------------------|
| 200  | Success                    |
| 201  | Created                    |
| 400  | Bad Request / Validation   |
| 401  | Unauthorized               |
| 403  | Forbidden (role/status)    |
| 404  | Not Found                  |
| 409  | Conflict (duplicate)       |
| 429  | Rate Limit Exceeded        |
| 500  | Internal Server Error      |
