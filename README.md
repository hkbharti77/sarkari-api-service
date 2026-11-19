# Sarkari API Service (GovJob Backend)

RESTful API backend and database services powering the **BharatRojgar Public Portal** and the **GovJob Admin Console**. Built with NestJS, TypeScript, MongoDB (Mongoose), and Redis.

---

## 🚀 Features

- **Recruitment Vacancies API**: Search, filter, pagination, category & state tagging for government job posts.
- **Admin & Scrutiny Workflow**: Multi-tier status transitions (`DRAFT` -> `SCRUTINY` -> `APPROVED` -> `PUBLISHED`), audit logging, and change tracking.
- **Authentication & RBAC**: JWT-based authentication for administrative roles with secure password hashing.
- **Official Source Verification**: Enforced official PDF URLs and authority website attribution.
- **Interactive API Documentation**: Swagger / OpenAPI integration at `/api/docs`.

---

## 🛠️ Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) (Node.js & Express)
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Cache**: Redis
- **Documentation**: Swagger UI (`@nestjs/swagger`)
- **Containerization**: Docker & Docker Compose

---

## 📦 Getting Started

### 1. Prerequisites
- Node.js (v18 or higher)
- npm / pnpm
- MongoDB instance (local or MongoDB Atlas)
- Redis instance

### 2. Installation
```bash
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env` and fill in your connection details:
```bash
cp .env.example .env
```

| Key | Description | Default |
| :--- | :--- | :--- |
| `PORT` | API Server Port | `4000` |
| `API_PREFIX` | Base route prefix | `api/v1` |
| `MONGODB_URI` | MongoDB Connection String | `mongodb://...` |
| `JWT_SECRET` | Secret key for JWT auth tokens | - |
| `CORS_ORIGIN` | Allowed frontend origins | `http://localhost:5173,http://localhost:3000` |

### 4. Running the Application
```bash
# Development mode with hot-reload
npm run dev

# Production build
npm run build
npm run start:prod
```

### 5. API Documentation
Once started, visit:
```
http://localhost:4000/api/docs
```
