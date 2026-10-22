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

### Telegram conversation state

The polling adapter stores recent chat history, a versioned conversation state, and processed Telegram update IDs in the `telegram_conversations` PostgreSQL table. This keeps chats isolated by Telegram chat and sender, preserves pending clarification state across restarts, and makes redelivered updates idempotent. Stale conversational context expires after 24 hours; confirmed bookings remain in the booking tables.

After deploying a schema change, apply the migration and regenerate Prisma Client:

```bash
cd backend
npm run db:migrate
npm run db:generate
npm run telegram:dev
```

Conversation-state and routing tests can run without a live model. The API integration tests require a reachable PostgreSQL database configured by `DATABASE_URL` and `DIRECT_URL`.

### Train demo API

The same backend includes a synthetic train-booking vertical slice. The seeded schedules, fares, seat counts, and booking statuses are demo data, not live railway availability or an IRCTC connection. Apply the Prisma schema and seed train inventory with:

```bash
cd backend
npm run db:push
node ./node_modules/tsx/dist/cli.mjs prisma/seed-trains.ts
```

Endpoints are `GET /api/trains/stations?q=Pune`, `GET /api/trains/search?from=PUNE&to=CSMT&date=YYYY-MM-DD&passengers=1`, `POST /api/trains/bookings`, `POST /api/trains/bookings/:bookingId/cancel`, `POST /api/trains/bookings/:bookingId/pay-demo`, and `GET /api/trains/bookings/:bookingId?sessionId=...`. The seed provides 12 Indian stations, 18 synthetic train services in both directions, and a rolling 120-day timetable. Fares, seat capacities, remaining availability, and booking status are tracked separately for each train class (for example 2S, CC, EC, SL, 3A, 2A, and 1A). Booking a class reserves only that class's inventory; a successful simulated payment marks that booking `CONFIRMED` and its confirmation includes the selected class and fare. Search results include class-specific fare, total/available seats, and an availability label, plus a `demo: true` marker. Train bookings require passenger names and ages and use demo payment only.

In Telegram, say “train booking” or “find trains” to start. The guided order is origin → destination → date → train/class → passenger count → passenger details → review → payment. Telegram choice keyboards are used for seeded stations, near/future dates (including +30, +60, +90, and +120 days), train/classes, passenger-count quick picks, confirmation, and demo payment; users can type station names/codes or dates within the rolling 120-day window, and enter a count up to 100. Group passenger manifests can be pasted as one passenger per line or separated with semicolons, with optional gender and berth preference (for example `Asha, 28, F, Lower`). The demo booking API accepts up to 100 passengers, subject to the selected sample inventory’s class-specific availability. A separate `PAY DEMO` step is required to simulate payment. The bot can answer the last demo booking’s status/reference and carry the last route forward when the user asks for more tickets; a pending demo hold can be cancelled. Movie and cinema requests continue through the cinema flow, and the user can switch between the two. Current train journeys are synthetic demos only—no live railway inventory, real payment, ticket issuance, return trips, or live cancellation/refunds are supported.

---

## 🤖 JoJo WhatsApp AI Agent Integration

For full API documentation, endpoint lists, request/response samples, and agent integration flows, see:
- [docs/API_CONTRACT.md](docs/API_CONTRACT.md) — WhatsApp Agent Integration Guide
- [docs/openapi.yaml](docs/openapi.yaml) — OpenAPI 3.0 Specification
