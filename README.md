
# 🚀 TaskFlow — Scalable REST API with Auth & RBAC

> **Primetrade.ai Backend Developer Intern Assignment**  
> Built by **Arya Verma** | MERN Stack | JWT Auth | Role-Based Access Control

---

## 📋 Table of Contents

- [Tech Stack](#-tech-stack)
- [Features](#-features)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [API Documentation](#-api-documentation)
- [Environment Variables](#-environment-variables)
- [Database Schema](#-database-schema)
- [Security Practices](#-security-practices)
- [Scalability](#-scalability)
- [Demo Credentials](#-demo-credentials)

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express.js 4 |
| Database | MongoDB Atlas (Mongoose 8) |
| Authentication | JWT + bcryptjs |
| Validation | Joi |
| API Docs | Swagger / OpenAPI 3.0 |
| Frontend | React 18 + Vite |
| HTTP Client | Axios |
| Security | Helmet, CORS, Rate Limiting, Mongo Sanitize |
| Logging | Winston |

---

## ✅ Features

### Backend
- 🔐 **User Registration & Login** with bcrypt password hashing (cost factor 12)
- 🎫 **JWT Authentication** with 7-day expiry
- 🛡 **Role-Based Access Control** — `user` and `admin` roles
- ✅ **CRUD API for Tasks** — create, read, update, delete with ownership rules
- 📄 **Swagger Docs** at `http://localhost:5000/api-docs`
- 🔄 **API Versioning** via `/api/v1/` prefix
- ⚡ **Rate Limiting** — 100 req/15min globally, 20 req/15min on auth
- 🛡 **Input Validation** with Joi on all routes
- 🪵 **Winston Logging** to console and log files
- 📊 **Pagination** on task listing
- 🌱 **Seed Script** for demo data

### Frontend
- 🎨 **Premium Dark UI** — glassmorphism, gradient accents, smooth animations
- 🔑 **Login & Register** pages with form validation and password strength meter
- 📊 **User Dashboard** — task stats, filters, CRUD modals
- 👑 **Admin Panel** — user management, role changes, platform analytics
- 🔒 **Protected Routes** — automatic redirect for unauthenticated users

---

## 📁 Project Structure

```
intern-assignment-project/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js              # MongoDB connection
│   │   │   └── swagger.js         # Swagger/OpenAPI config
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT verify middleware
│   │   │   ├── roleCheck.js       # RBAC middleware
│   │   │   ├── errorHandler.js    # Global error handler
│   │   │   └── validate.js        # Joi validation wrapper
│   │   ├── models/
│   │   │   ├── User.js            # User schema
│   │   │   └── Task.js            # Task schema
│   │   ├── modules/
│   │   │   ├── auth/              # Register, Login, Me
│   │   │   ├── tasks/             # Task CRUD
│   │   │   └── admin/             # User management, Stats
│   │   └── utils/
│   │       ├── jwt.js             # Token helpers
│   │       ├── response.js        # API response formatters
│   │       ├── logger.js          # Winston logger
│   │       └── seed.js            # Database seeder
│   ├── .env                       # ← Your credentials here
│   ├── .env.example
│   ├── server.js
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── api/                   # Axios instance + API calls
    │   ├── components/            # Navbar, TaskCard, TaskModal, etc.
    │   ├── context/               # AuthContext (JWT state)
    │   └── pages/                 # Login, Register, Dashboard, Admin
    ├── index.html
    └── package.json
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 9+
- MongoDB Atlas account (or local MongoDB)

### 1. Clone & Install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
```

### 3. Seed Database (Optional)

```bash
cd backend
npm run seed
```

### 4. Start Development Servers

```bash
# Terminal 1 — Backend (port 5000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

### 5. Access

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000/api/v1 |
| Swagger Docs | http://localhost:5000/api-docs |
| Health Check | http://localhost:5000/health |

---

## 📖 API Documentation

Full interactive docs available at **http://localhost:5000/api-docs** (Swagger UI).

### Auth Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Public | Register new user |
| POST | `/api/v1/auth/login` | Public | Login, returns JWT |
| GET | `/api/v1/auth/me` | 🔒 Auth | Get current user |

### Task Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/v1/tasks` | 🔒 Auth | List tasks (admin=all, user=own) |
| POST | `/api/v1/tasks` | 🔒 Auth | Create new task |
| GET | `/api/v1/tasks/:id` | 🔒 Auth | Get task by ID |
| PUT | `/api/v1/tasks/:id` | 🔒 Auth | Update task |
| DELETE | `/api/v1/tasks/:id` | 🔒 Auth | Delete task |

### Admin Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/v1/admin/users` | 👑 Admin | List all users |
| GET | `/api/v1/admin/stats` | 👑 Admin | Platform statistics |
| PATCH | `/api/v1/admin/users/:id/role` | 👑 Admin | Change user role |
| DELETE | `/api/v1/admin/users/:id` | 👑 Admin | Delete user + their tasks |

### Example Request

```bash
# Register
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Arya Verma","email":"arya@example.com","password":"secret123"}'

# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"arya@example.com","password":"secret123"}'

# Create Task (with token)
curl -X POST http://localhost:5000/api/v1/tasks \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title":"My first task","priority":"high","status":"todo"}'
```

---

## 🔐 Environment Variables

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/intern_db
JWT_SECRET=your_super_secret_key_min_32_chars
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
```

---

## 🗄 Database Schema

### User
```
_id         ObjectId (auto)
name        String (2-50 chars, required)
email       String (unique, lowercase, required)
password    String (bcrypt hash, hidden from responses)
role        Enum: 'user' | 'admin' (default: 'user')
isActive    Boolean (default: true)
lastLogin   Date
createdAt   Date (auto)
updatedAt   Date (auto)
```

### Task
```
_id          ObjectId (auto)
title        String (3-100 chars, required)
description  String (max 500 chars)
status       Enum: 'todo' | 'in-progress' | 'done' (default: 'todo')
priority     Enum: 'low' | 'medium' | 'high' (default: 'medium')
dueDate      Date (optional)
tags         [String]
owner        ObjectId → User (required)
assignedTo   ObjectId → User (optional)
createdAt    Date (auto)
updatedAt    Date (auto)
```

---

## 🛡 Security Practices

| Practice | Implementation |
|---|---|
| Password Hashing | bcryptjs with 12 salt rounds |
| JWT | HS256, 7-day expiry, Bearer scheme |
| Rate Limiting | `express-rate-limit` — 100/15min global, 20/15min auth |
| HTTP Headers | `helmet` sets X-Frame-Options, CSP, HSTS, etc. |
| NoSQL Injection | `express-mongo-sanitize` strips `$` and `.` from inputs |
| Input Validation | Joi schema validation on all request bodies |
| CORS | Configured for frontend origin only |
| Sensitive Data | `password` field excluded from all API responses |
| Error Leakage | Stack traces only in `NODE_ENV=development` |

---

## 📈 Scalability

See [`SCALABILITY.md`](./SCALABILITY.md) for the full architectural note.

**TL;DR:**
- **Stateless JWT** → horizontal scaling with no session affinity
- **Modular architecture** → each module (auth, tasks, admin) can be extracted into a microservice
- **MongoDB Atlas** → built-in auto-scaling, sharding, and multi-region replication
- **Indexes** on `owner`, `status`, `priority`, `createdAt` for sub-ms query performance
- **Redis** → can be added for token blacklisting and response caching
- **Docker** → Dockerfile + docker-compose included for container deployment
- **Load Balancer** → Nginx or AWS ALB compatible (stateless design)

---

## 🎭 Demo Credentials

After running `npm run seed` from the backend directory:

| Role | Email | Password |
|---|---|---|
| 👑 Admin | admin@primetrade.ai | admin123 |
| 👤 User | arya@example.com | user123 |
| 👤 User | jane@example.com | user123 |

---

## 📬 Postman Collection

Import the Swagger spec from `http://localhost:5000/api-docs/swagger.json` directly into Postman, or use the Swagger UI for interactive testing.

---

*Built with ❤️ by Arya Verma for the Primetrade.ai Backend Intern Assignment*

