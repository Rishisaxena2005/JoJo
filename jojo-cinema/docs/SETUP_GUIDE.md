# ⚙️ JoJo Cinema — Setup & Deployment Guide

This guide covers setting up Supabase PostgreSQL, configuring environment variables, running migrations & seeds, starting the servers locally, and deploying to AWS.

---

## 🐘 1. Setting Up Supabase (PostgreSQL)

1. Sign up or log in to [Supabase](https://supabase.com).
2. Click **New Project** and configure:
   - **Name**: `jojo-cinema`
   - **Database Password**: Choose a strong password (save this securely)
   - **Region**: Choose closest to you (e.g. `ap-south-1` Mumbai)
3. Once the project is created, navigate to **Project Settings** → **Database**.
4. Scroll to **Connection string** section:
   - Select **URI** tab.
   - For `DATABASE_URL` (Connection Pooling): Select **Transaction** mode (Port `6543`), copy the connection string.
   - For `DIRECT_URL` (Direct Connection): Select **Session** mode (Port `5432`), copy the direct connection string.
5. Replace `[YOUR-PASSWORD]` in both strings with your database password.

---

## 🔑 2. Environment Variables Configuration

Create `backend/.env` (copy from `backend/.env.example`):

```bash
PORT=4000
NODE_ENV=development
DEMO_MODE=true

# Supabase PostgreSQL Connection Strings
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"

# CORS
CORS_ORIGINS="http://localhost:5173,http://localhost:3000"

# Timeouts & Limits
SEAT_LOCK_DURATION_SECONDS=300
BOOKING_EXPIRY_SECONDS=900
MAX_SEATS_PER_BOOKING=6

# Security
SESSION_SECRET="super-secret-key-for-session-tokens-2026"
WEBHOOK_SECRET="webhook-secret-key"
JOJO_BOOKING_API_BASE_URL="http://localhost:4000/api"
```

---

## 📦 3. Database Schema Push & Seed

In `backend/`:

```bash
# Push schema directly to Supabase
npm run db:push

# Generate Prisma Client
npm run db:generate

# Populate with realistic movies, theatres, screens, shows, and seats
npm run db:seed
```

The seed script adds:
- 5 Major Cities (Mumbai, Pune, Delhi NCR, Bengaluru, Hyderabad)
- 10 Multiplexes & Theatres (PVR, INOX, Cinepolis)
- 12 Movies (Now Showing & Upcoming) across Hindi, English, Tamil, Telugu
- Scheduled shows with 3 seat tiers (Standard ₹220, Premium ₹350, Recliner ₹500)

---

## 💻 4. Running the Complete Application Locally

You can run both backend and frontend from their respective directories:

**Terminal 1 — Backend**:
```bash
cd backend
npm run dev
# Server runs on http://localhost:4000
# Health check: http://localhost:4000/api/health
```

**Terminal 2 — Frontend**:
```bash
cd frontend
npm run dev
# Frontend runs on http://localhost:5173
```

Or from the project root:
```bash
npm run dev:backend
npm run dev:frontend
```

---

## ☁️ 5. AWS Deployment Guide

### Option A: AWS Elastic Beanstalk / ECS Fargate (Recommended)
1. **Containerization**:
   Add a standard `Dockerfile` to `backend/` and `frontend/`:
   ```dockerfile
   FROM node:20-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build
   EXPOSE 4000
   CMD ["npm", "start"]
   ```
2. **Environment Variables**:
   Set `DATABASE_URL`, `DIRECT_URL`, and other `.env` parameters in AWS Parameter Store or ECS Task Definition environment variables.
3. **Frontend Hosting on AWS S3 + CloudFront**:
   - Run `npm run build` in `frontend/`
   - Upload `frontend/dist/` to an Amazon S3 bucket configured for static web hosting.
   - Attach an Amazon CloudFront distribution for SSL and CDN distribution.
   - Set up API reverse proxy `/api/*` in CloudFront targeting the ECS Application Load Balancer.

### Option B: AWS App Runner
1. Connect your GitHub repository to AWS App Runner.
2. Select Node.js 20 runtime, build command: `npm install && npm run build`, start command: `npm start`.
3. Set environment variables directly in App Runner configuration console.

---

## 🔍 Troubleshooting

| Issue | Cause | Fix |
|---|---|---|
| `P1001: Can't reach database server` | Incorrect password or network blocking | Check Supabase password and ensure IP is allowed (Supabase defaults allow `0.0.0.0/0`). |
| `P2025: Record not found` | Empty database | Run `npm run db:seed` to populate data. |
| `409 Conflict: Seats already locked` | Seats held by another session | Wait 5 minutes for TTL expiration or choose other seats. |
