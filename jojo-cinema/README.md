# 🎬 JoJo Cinema — Movie Booking Platform

> A full-stack, production-grade movie ticket booking platform inspired by BookMyShow, featuring atomic seat locking, mock payment processing with webhook simulation, QR ticket generation, and a complete REST API contract for the **JoJo WhatsApp AI Multi-Agent Booking System**.

---

## 🌟 Highlights & Architecture

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide icons, responsive BookMyShow-style UI with city selector, live seat layout map with legend, seat locking with countdown timers, demo payment simulator, and printable/downloadable QR tickets.
- **Backend**: Node.js, Express, TypeScript, Zod request/params validation, centralized error handling, structured Winston logging.
- **Database**: PostgreSQL (via Supabase) with Prisma ORM. Strict relational constraints, optimistic locking, index coverage, and idempotent seeding.
- **AI Agent Integration**: Built specifically for integration with the 5 JoJo WhatsApp AI agents (Discovery, Showtime, Seat Selection, Payment, Ticket Retrieval). Complete OpenAPI 3.0 spec provided.
- **Resilient Booking Engine**:
  - Atomic seat locking with auto-expiry (5-minute TTL)
  - Duplicate booking prevention via database constraints
  - Idempotent payment checkout
  - Webhook simulation with HMAC signature verification
  - State machine: `PENDING_PAYMENT` → `CONFIRMED` / `PAYMENT_FAILED` / `EXPIRED`

---

## 📁 Repository Structure

```
jojo-cinema/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database models, relations & indexes
│   │   └── seed.ts                # Idempotent seed script (movies, theatres, shows, seats)
│   ├── src/
│   │   ├── config/                # Database, environment validation, logger
│   │   ├── controllers/           # Route controller handlers
│   │   ├── middleware/            # Error handling, request validation, rate limiting
│   │   ├── repositories/          # Prisma database queries & transactions
│   │   ├── routes/                # Express REST routers (/movies, /shows, /seat-locks, etc.)
│   │   ├── services/              # Business logic (seat locking, payments, tickets)
│   │   ├── types/                 # API contracts & response shapes
│   │   ├── utils/                 # QR generator, signature verification
│   │   ├── validators/            # Zod validation schemas
│   │   ├── app.ts                 # Express application setup
│   │   └── server.ts              # Server entrypoint
│   ├── tests/
│   │   └── api.test.ts            # Integration test suite
│   ├── .env.example               # Backend environment variables
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/            # UI components, layout, movie cards, seat map
│   │   ├── pages/                 # Home, MovieDetail, SeatSelection, Payment, Confirmation, MyBookings
│   │   ├── services/              # Typed Axios API client
│   │   ├── types/                 # TypeScript data contracts
│   │   ├── utils/                 # Formatting, session helpers
│   │   ├── App.tsx                # App routing
│   │   └── index.css              # Custom Tailwind styles & animations
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── package.json
└── docs/
    ├── openapi.yaml               # Complete OpenAPI 3.0 specification
    ├── API_CONTRACT.md            # WhatsApp AI Agent integration guide
    └── SETUP_GUIDE.md             # Supabase & deployment guide
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js 18+ and npm
- A free [Supabase](https://supabase.com) account (for PostgreSQL database)

### 2. Backend Setup

```bash
cd backend

# Copy environment template
cp .env.example .env

# Configure your Supabase connection strings in .env:
# DATABASE_URL="postgresql://postgres.[REF]:[PASS]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
# DIRECT_URL="postgresql://postgres.[REF]:[PASS]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"

# Install dependencies
npm install

# Push schema to Supabase & generate Prisma client
npm run db:push
npm run db:generate

# Seed the database with movies, cities, theatres, screens, and shows
npm run db:seed

# Start backend dev server (runs on port 4000)
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start frontend dev server (runs on port 5173)
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Testing

```bash
cd backend
npm test
```

---

## 🤖 JoJo WhatsApp AI Agent Integration

For full API documentation, endpoint lists, request/response samples, and agent integration flows, see:
- [docs/API_CONTRACT.md](docs/API_CONTRACT.md) — WhatsApp Agent Integration Guide
- [docs/openapi.yaml](docs/openapi.yaml) — OpenAPI 3.0 Specification
