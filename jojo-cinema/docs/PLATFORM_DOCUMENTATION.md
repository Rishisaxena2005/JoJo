# JoJo Cinema — Enterprise Platform Architecture & API Specification

**Document Version:** 1.0.0  
**Status:** Approved for Production Integration  
**Date:** October 2026  
**System Classification:** Mock External Booking Provider for JoJo WhatsApp AI Multi-Agent Ecosystem  

---

## Table of Contents
1. [Executive Summary & System Architecture](#1-executive-summary--system-architecture)
2. [Core Technology Stack & Design Decisions](#2-core-technology-stack--design-decisions)
3. [Global API Protocols & Error Envelope](#3-global-api-protocols--error-envelope)
4. [Comprehensive REST API Reference](#4-comprehensive-rest-api-reference)
   - 4.1 [System Health & Discovery](#41-system-health--discovery)
   - 4.2 [Movie Catalog Service](#42-movie-catalog-service)
   - 4.3 [Showtime & Schedule Service](#43-showtime--schedule-service)
   - 4.4 [Seat Inventory & Locking Engine](#44-seat-inventory--locking-engine)
   - 4.5 [Booking Order Management](#45-booking-order-management)
   - 4.6 [Payment Processing & Webhook Engine](#46-payment-processing--webhook-engine)
   - 4.7 [Digital Ticket & Gate Verification](#47-digital-ticket--gate-verification)
5. [State Machines & Concurrency Architecture](#5-state-machines--concurrency-architecture)
6. [Database Schema & Data Dictionary](#6-database-schema--data-dictionary)
7. [WhatsApp Multi-Agent System Integration Specs](#7-whatsapp-multi-agent-system-integration-specs)
8. [Security, Performance & Operational Runbook](#8-security-performance--operational-runbook)

---

## 1. Executive Summary & System Architecture

**JoJo Cinema** is an enterprise-grade movie ticketing platform built as the backend engine for a WhatsApp AI Multi-Agent booking interface while simultaneously providing a modern BookMyShow-style web client.

The platform solves four critical distributed booking challenges:
1. **Zero Double-Booking Guarantee:** Atomic Compare-And-Swap (CAS) seat locking prevents race conditions under high concurrent demand.
2. **Deterministic Time-To-Live (TTL):** Active seat locks automatically expire in 300 seconds (5 minutes) without requiring cron polling.
3. **Idempotent Financial Transactions:** Checkout operations guarantee strict deduplication across network retries via unique `idempotencyKey` constraints.
4. **Agent-First API Design:** Normalized REST payloads designed for zero-ambiguity parsing by autonomous LLM agent runtimes.

```
                           +----------------------------------------+
                           |  WhatsApp User (Mobile / Desktop)      |
                           +-------------------+--------------------+
                                               |
                                               v
                           +-------------------+--------------------+
                           |    JoJo WhatsApp AI Agent Mesh         |
                           |  (Discovery, Show, Seat, Pay, Ticket)  |
                           +-------------------+--------------------+
                                               | (REST / HTTPS)
+-------------------------+                    |
|   JoJo Cinema Frontend  |                    v
|   React 18 + Tailwind   +--------> +---------+--------------------+
+-------------------------+          |   JoJo Cinema API Gateway    |
                                     |   (Express + TypeScript)     |
                                     |  - Rate Limiting (500r/15m)  |
                                     |  - Zod Request Validators    |
                                     |  - Error Boundary Middleware |
                                     +---------+--------------------+
                                               |
                     +-------------------------+-------------------------+
                     |                                                   |
                     v                                                   v
      +--------------+--------------+                     +--------------+--------------+
      |       Prisma ORM Client     |                     |    Mock Payment & Webhook   |
      |   (Transaction Connection)  |                     |           Engine            |
      +--------------+--------------+                     +-----------------------------+
                     |
                     v
      +--------------+--------------+
      |     Supabase PostgreSQL     |
      | - Connection Pooler (6543)  |
      | - Relational Integrity     |
      | - Unique Concurrency Locks  |
      +-----------------------------+
```

---

## 2. Core Technology Stack & Design Decisions

| Layer | Technology | Architectural Rationale |
|---|---|---|
| **Frontend** | React 18, Vite, TypeScript | Fast bundling, typed client model matching backend schemas, zero client-side hydration drift. |
| **Styling** | Tailwind CSS | Cinema-tailored color tokens (`brand-500: #e8193c`, `navy-900: #0a0f1e`), responsive seat-map grids, micro-interactions. |
| **Icons** | Lucide React | Tree-shakeable, modern accessible SVG iconography. |
| **Backend** | Express.js, Node.js, TypeScript | Production-tested event loop, low latency for IO-bound database operations, explicit middleware pipelines. |
| **Validation** | Zod (v3) | Dual-phase validation for request bodies, query params, URL route params, and process environment variables. |
| **Database** | PostgreSQL on Supabase | ACID transactions, native JSON column support, strong row-level isolation, and transaction connection pooling. |
| **ORM** | Prisma ORM (v5.22) | Type-safe query building, migration versioning, automated connection management, and atomic transaction blocks. |
| **Logging** | Winston + Morgan | Structured JSON application logs with log levels (`info`, `warn`, `error`) and automated HTTP request telemetry. |
| **Security** | Helmet, CORS, Rate Limit | HTTP header hardening, controlled origin whitelisting, and volumetric abuse protection. |

---

## 3. Global API Protocols & Error Envelope

### 3.1 Base URLs
- **Local Development:** `http://localhost:4000/api`
- **Frontend Development:** `http://localhost:5173`
- **Network Expose (WiFi):** `http://<YOUR_LOCAL_IP>:4000/api`
- **Tunnel (ngrok):** `https://<subdomain>.ngrok-free.app/api`

### 3.2 Standard JSON Envelope (JSend-Aligned)
Every response returned by the JoJo Cinema API adheres to an explicit envelope contract:

#### Successful Response (`200 OK`, `201 Created`)
```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

#### Error Response (`400`, `401`, `403`, `404`, `409`, `429`, `500`)
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human-readable explanation of failure",
    "details": { ... }
  }
}
```

### 3.3 Standard Error Code Catalog

| HTTP Status | Error Code | Description |
|---|---|---|
| `400 Bad Request` | `VALIDATION_ERROR` | Schema validation failed on body, path params, or query strings. Details contain field breakdown. |
| `400 Bad Request` | `SEAT_LIMIT_EXCEEDED` | Request attempted to lock or book more than 6 seats in a single transaction. |
| `400 Bad Request` | `LOCK_EXPIRED` | The 5-minute seat lock TTL has passed. Seats must be re-locked. |
| `403 Forbidden` | `FORBIDDEN` | Session identifier does not match the owning session of the lock/booking. |
| `404 Not Found` | `NOT_FOUND` | Generic resource not found. |
| `404 Not Found` | `MOVIE_NOT_FOUND` | Specified Movie UUID does not exist. |
| `404 Not Found` | `SHOW_NOT_FOUND` | Specified Show UUID does not exist. |
| `404 Not Found` | `BOOKING_NOT_FOUND` | Specified Booking UUID does not exist. |
| `404 Not Found` | `TICKET_NOT_FOUND` | Specified Ticket Reference does not exist. |
| `409 Conflict` | `SEAT_UNAVAILABLE` | One or more requested seats are already locked by another user or booked. |
| `409 Conflict` | `BOOKING_ALREADY_CONFIRMED` | Attempted checkout on an already confirmed booking. |
| `409 Conflict` | `BOOKING_EXPIRED` | Attempted checkout on an order whose 15-minute payment window lapsed. |
| `429 Too Many Req` | `RATE_LIMITED` | Client exceeded 500 requests per 15-minute window. |
| `500 Internal Err` | `INTERNAL_ERROR` | Unhandled runtime exception. |
| `503 Service Unavail`| `DB_UNAVAILABLE` | Database health probe failed. |

---

## 4. Comprehensive REST API Reference

### 4.1 System Health & Discovery

#### `GET /api`
Returns API metadata, version, and full catalog of registered route handlers.
- **Headers:** None
- **Sample Response (200 OK):**
```json
{
  "name": "JoJo Cinema API",
  "version": "1.0.0",
  "docs": "/api/health",
  "endpoints": [
    "GET  /api/health",
    "GET  /api/health/ready",
    "GET  /api/movies",
    "GET  /api/movies/:movieId",
    "GET  /api/movies/cities",
    "GET  /api/shows",
    "GET  /api/shows/:showId",
    "GET  /api/shows/:showId/seats",
    "POST /api/seat-locks",
    "POST /api/seat-locks/:lockId/release",
    "POST /api/bookings",
    "GET  /api/bookings/:bookingId",
    "GET  /api/bookings/:bookingId/ticket",
    "GET  /api/bookings?sessionId=",
    "POST /api/payments/checkout",
    "GET  /api/payments/:paymentId/status",
    "POST /api/payments/:paymentId/simulate",
    "POST /api/payments/webhook",
    "GET  /api/tickets/:ticketReference/verify"
  ]
}
```

#### `GET /api/health`
Liveness probe.
- **Sample Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-10-21T18:00:00.000Z"
  },
  "error": null
}
```

#### `GET /api/health/ready`
Readiness probe. Executes a live `SELECT 1` ping against Supabase PostgreSQL.
- **Sample Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "status": "ready",
    "database": "connected",
    "timestamp": "2026-10-21T18:00:00.000Z"
  },
  "error": null
}
```

---

### 4.2 Movie Catalog Service

#### `GET /api/movies`
List and search movies with faceted filtering and pagination.
- **Query Parameters:**
  - `search` *(string, optional)*: Case-insensitive keyword search on title and synopsis.
  - `city` *(string, optional)*: Filters movies with active showtimes in this city name.
  - `language` *(string, optional)*: Filter by language (e.g., `Hindi`, `English`, `Telugu`).
  - `genre` *(string, optional)*: Filter by genre (e.g., `Action`, `Sci-Fi`, `Drama`).
  - `status` *(string, optional)*: `NOW_SHOWING` | `UPCOMING` | `ENDED`. Default: `NOW_SHOWING`.
  - `page` *(number, optional)*: Default `1`.
  - `limit` *(number, optional)*: Default `20`, Max `50`.
- **Sample Request:**
  `GET /api/movies?city=Pune&search=Kalki&language=Hindi`
- **Sample Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "e0b0e9b6-81cf-4d98-b80c-a9eb827a5e95",
        "title": "Kalki Chronicles",
        "synopsis": "In a dystopian future India, a warrior chosen by destiny...",
        "language": "Hindi",
        "genres": ["Action", "Sci-Fi", "Mythology"],
        "durationMinutes": 181,
        "certification": "U/A",
        "posterUrl": "https://picsum.photos/seed/kalki/300/450",
        "backdropUrl": "https://picsum.photos/seed/kalki-back/1280/720",
        "releaseDate": "2026-08-15T00:00:00.000Z",
        "status": "NOW_SHOWING",
        "director": "Nag Ashwin",
        "cast": ["Prabhas", "Deepika Padukone", "Amitabh Bachchan"]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1
    }
  },
  "error": null
}
```

#### `GET /api/movies/cities`
Returns all unique operating cities.
- **Sample Response (200 OK):**
```json
{
  "success": true,
  "data": [
    { "id": "city-1", "name": "Bengaluru", "state": "Karnataka", "country": "India" },
    { "id": "city-2", "name": "Mumbai", "state": "Maharashtra", "country": "India" },
    { "id": "city-3", "name": "Pune", "state": "Maharashtra", "country": "India" }
  ],
  "error": null
}
```

#### `GET /api/movies/:movieId`
Returns detailed metadata for a single movie.
- **Path Parameters:** `movieId` *(UUID, required)*
- **Sample Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "e0b0e9b6-81cf-4d98-b80c-a9eb827a5e95",
    "title": "Kalki Chronicles",
    "synopsis": "Full synopsis text...",
    "language": "Hindi",
    "genres": ["Action", "Sci-Fi"],
    "durationMinutes": 181,
    "certification": "U/A",
    "posterUrl": "https://picsum.photos/seed/kalki/300/450",
    "backdropUrl": "https://picsum.photos/seed/kalki-back/1280/720",
    "director": "Nag Ashwin",
    "cast": ["Prabhas", "Deepika Padukone"],
    "releaseDate": "2026-08-15T00:00:00.000Z",
    "status": "NOW_SHOWING"
  },
  "error": null
}
```

---

### 4.3 Showtime & Schedule Service

#### `GET /api/shows`
Retrieves schedules and showtimes grouped by theatre.
- **Query Parameters:**
  - `movieId` *(UUID, optional)*
  - `city` *(string, optional)*
  - `theatreId` *(UUID, optional)*
  - `date` *(string, optional, Format: `YYYY-MM-DD`)*
- **Sample Request:**
  `GET /api/shows?movieId=e0b0e9b6-81cf-4d98-b80c-a9eb827a5e95&city=Pune&date=2026-10-22`
- **Sample Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "84ea87cb-f924-4d4a-ad6e-82146e16b3de",
      "startTime": "2026-10-22T14:30:00.000Z",
      "endTime": "2026-10-22T17:31:00.000Z",
      "format": "IMAX",
      "status": "SCHEDULED",
      "theatre": {
        "id": "theatre-1",
        "name": "PVR Cinemas — Phoenix MarketCity",
        "address": "Viman Nagar, Pune",
        "city": "Pune"
      },
      "screen": {
        "id": "screen-1",
        "name": "Screen 1 — IMAX"
      },
      "availableSeatCount": 116
    }
  ],
  "error": null
}
```

#### `GET /api/shows/:showId`
Returns complete show summary including movie runtime and theatre address.

#### `GET /api/shows/:showId/seats`
Returns the complete visual seat map with real-time status of every seat.
- **Path Parameters:** `showId` *(UUID, required)*
- **Sample Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "showId": "84ea87cb-f924-4d4a-ad6e-82146e16b3de",
    "movie": {
      "id": "e0b0e9b6-81cf-4d98-b80c-a9eb827a5e95",
      "title": "Kalki Chronicles"
    },
    "theatre": {
      "id": "theatre-1",
      "name": "PVR Cinemas — Phoenix MarketCity",
      "screenName": "Screen 1 — IMAX"
    },
    "totalSeats": 120,
    "availableSeats": 116,
    "rows": [
      {
        "rowLabel": "A",
        "isPremium": false,
        "seats": [
          {
            "showSeatId": "61a15383-a9d9-482a-a92c-54a72d7fec74",
            "seatId": "seat-a1",
            "seatLabel": "A1",
            "seatType": "STANDARD",
            "price": 350.00,
            "status": "AVAILABLE"
          },
          {
            "showSeatId": "61a15383-a9d9-482a-a92c-54a72d7fec75",
            "seatId": "seat-a2",
            "seatLabel": "A2",
            "seatType": "STANDARD",
            "price": 350.00,
            "status": "BOOKED"
          }
        ]
      }
    ]
  },
  "error": null
}
```

---

### 4.4 Seat Inventory & Locking Engine

#### `POST /api/seat-locks`
Atomically locks 1 to 6 selected seats for 300 seconds.
- **Request Headers:** `Content-Type: application/json`
- **Request Body Schema:**
```json
{
  "showId": "84ea87cb-f924-4d4a-ad6e-82146e16b3de",
  "seatIds": [
    "61a15383-a9d9-482a-a92c-54a72d7fec74",
    "61a15383-a9d9-482a-a92c-54a72d7fec76"
  ],
  "sessionId": "wa_919876543210"
}
```
- **Validation Constraints:**
  - `seatIds`: Array of UUIDs. Length must be `1 <= len <= 6`.
  - `sessionId`: String, length `1..100`. Represents WhatsApp chat ID or browser session.
- **Sample Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "lockId": "a47fea92-62e8-4435-974d-78080dea023b",
    "showId": "84ea87cb-f924-4d4a-ad6e-82146e16b3de",
    "seatIds": [
      "61a15383-a9d9-482a-a92c-54a72d7fec74",
      "61a15383-a9d9-482a-a92c-54a72d7fec76"
    ],
    "seatLabels": ["A1", "A3"],
    "status": "ACTIVE",
    "expiresAt": "2026-10-21T18:05:00.000Z"
  },
  "error": null
}
```
- **Sample Error Response (409 Conflict):**
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "SEAT_UNAVAILABLE",
    "message": "One or more selected seats are no longer available"
  }
}
```

#### `POST /api/seat-locks/:lockId/release`
Voluntarily unlocks held seats if user cancels or backs out.
- **Path Parameters:** `lockId` *(UUID, required)*
- **Request Body:**
```json
{
  "sessionId": "wa_919876543210"
}
```
- **Sample Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "released": true,
    "lockId": "a47fea92-62e8-4435-974d-78080dea023b"
  },
  "error": null
}
```

---

### 4.5 Booking Order Management

#### `POST /api/bookings`
Converts an active seat lock into a pending order.
- **Request Body Schema:**
```json
{
  "lockId": "a47fea92-62e8-4435-974d-78080dea023b",
  "sessionId": "wa_919876543210",
  "showId": "84ea87cb-f924-4d4a-ad6e-82146e16b3de",
  "seatIds": [
    "61a15383-a9d9-482a-a92c-54a72d7fec74",
    "61a15383-a9d9-482a-a92c-54a72d7fec76"
  ]
}
```
- **Sample Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "bookingId": "8872bccf-3426-445f-9917-10ac8702b27f",
    "bookingReference": "JC-MVI4IS-TX9A",
    "status": "PENDING_PAYMENT",
    "totalAmount": 700.00,
    "currency": "INR",
    "expiresAt": "2026-10-21T18:15:00.000Z",
    "seats": [
      { "seatLabel": "A1", "price": 350.00 },
      { "seatLabel": "A3", "price": 350.00 }
    ],
    "movie": {
      "title": "Kalki Chronicles"
    },
    "theatre": {
      "name": "PVR Cinemas — Phoenix MarketCity"
    }
  },
  "error": null
}
```

#### `GET /api/bookings/:bookingId`
Fetches real-time status and financial breakdown of an existing order.
- **Query Parameter:** `sessionId` *(string, optional for validation)*

#### `GET /api/bookings?sessionId=wa_919876543210`
Returns all historic and active bookings associated with a session token.

---

### 4.6 Payment Processing & Webhook Engine

#### `POST /api/payments/checkout`
Creates an idempotent payment intent.
- **Request Body Schema:**
```json
{
  "bookingId": "8872bccf-3426-445f-9917-10ac8702b27f",
  "sessionId": "wa_919876543210",
  "idempotencyKey": "pay_key_987654321_step4",
  "paymentMethod": "UPI"
}
```
- **Concurrency & Idempotency Guarantee:**  
  If two identical requests arrive with the same `idempotencyKey`, the backend catches PostgreSQL unique constraint `P2002` and returns the same existing payment record with status `201 Created` without double-charging.
- **Sample Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "paymentId": "f1755411-b787-4c56-93c4-bb1ad60b9009",
    "bookingId": "8872bccf-3426-445f-9917-10ac8702b27f",
    "status": "PENDING",
    "amount": 700.00,
    "currency": "INR",
    "checkoutUrl": "/demo-payment/f1755411-b787-4c56-93c4-bb1ad60b9009"
  },
  "error": null
}
```

#### `GET /api/payments/:paymentId/status`
Polls payment status during checkout.
- **Sample Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "paymentId": "f1755411-b787-4c56-93c4-bb1ad60b9009",
    "bookingId": "8872bccf-3426-445f-9917-10ac8702b27f",
    "bookingReference": "JC-MVI4IS-TX9A",
    "status": "SUCCESS",
    "amount": 700.00,
    "currency": "INR",
    "provider": "MOCK",
    "updatedAt": "2026-10-21T18:02:00.000Z"
  },
  "error": null
}
```

#### `POST /api/payments/:paymentId/simulate` *(Demo Mode)*
Forces an outcome transition for automated tests and WhatsApp bot simulations.
- **Request Body:**
```json
{
  "outcome": "SUCCESS"
}
```
*(Accepts `"SUCCESS"` or `"FAILED"`)*.
- **Side Effects on `"SUCCESS"`:**
  1. Sets Payment status to `SUCCESS`.
  2. Sets Booking status to `CONFIRMED`.
  3. Permanently transitions `show_seats` status to `BOOKED`.
  4. Mints a unique cryptographically signed digital `Ticket` with QR token.

#### `POST /api/payments/webhook`
Ingests asynchronous gateway payment notifications.
- **Headers:** `X-Webhook-Signature: <hmac_sha256_hash>`
- **Payload:** Contains `providerEventId`, `bookingId`, `status`. Deduplicates identical event IDs.

---

### 4.7 Digital Ticket & Gate Verification

#### `GET /api/bookings/:bookingId/ticket`
Retrieves confirmed ticket and ready-to-render QR code.
- **Path Parameters:** `bookingId` *(UUID, required)*
- **Constraint:** Booking status must be `CONFIRMED`. Otherwise returns `409 Conflict`.
- **Sample Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "ticketReference": "TKT-MVI4ISZ6-TXEAF",
    "qrToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "qrCodeDataUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6e...",
    "issuedAt": "2026-10-21T18:04:12.000Z",
    "booking": {
      "bookingReference": "JC-MVI4IS-TX9A",
      "totalAmount": 700.00,
      "seats": ["A1", "A3"],
      "movie": {
        "title": "Kalki Chronicles",
        "language": "Hindi",
        "certification": "U/A"
      },
      "theatre": {
        "name": "PVR Cinemas — Phoenix MarketCity",
        "city": "Pune"
      },
      "show": {
        "startTime": "2026-10-22T14:30:00.000Z",
        "format": "IMAX"
      }
    }
  },
  "error": null
}
```

#### `GET /api/tickets/:ticketReference/verify`
Cinema entrance gate verification scanner API.
- **Path Parameters:** `ticketReference` *(string, e.g., `TKT-MVI4ISZ6-TXEAF`)*
- **Sample Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "ticketReference": "TKT-MVI4ISZ6-TXEAF",
    "movie": "Kalki Chronicles",
    "theatre": "PVR Cinemas — Phoenix MarketCity",
    "city": "Pune",
    "showTime": "2026-10-22T14:30:00.000Z",
    "issuedAt": "2026-10-21T18:04:12.000Z"
  },
  "error": null
}
```

---

## 5. State Machines & Concurrency Architecture

### 5.1 Seat Inventory Lifecycle
A single `show_seat` record traverses the following deterministic states:

```
                  +-------------------------+
                  |        AVAILABLE        |
                  +------------+------------+
                               |
               [POST /api/seat-locks (CAS)]
                               |
                               v
                  +------------+------------+
                  |         LOCKED          |
                  +----+---------------+----+
                       |               |
       [Lock Release / TTL 5m]     [Payment Success]
                       |               |
                       v               v
            +----------+--+     +------+--------+
            |  AVAILABLE  |     |    BOOKED     | (Terminal)
            +-------------+     +---------------+
```

### 5.2 Atomic Compare-And-Swap (CAS) Algorithm
To guarantee zero double-bookings across concurrent requests:
```typescript
// Executed within an ACID transaction block:
const updateResult = await tx.showSeat.updateMany({
  where: {
    id: { in: requestedSeatIds },
    showId: targetShowId,
    status: 'AVAILABLE' // CAS Predicate
  },
  data: { status: 'LOCKED' }
});

// If count does not match requested length, another thread won the race
if (updateResult.count !== requestedSeatIds.length) {
  throw new AppError(409, 'SEAT_UNAVAILABLE', 'One or more selected seats are no longer available');
}
```

### 5.3 Order & Payment State Machine

```
   [POST /api/bookings]
            |
            v
+-----------+-----------+
|    PENDING_PAYMENT    +------------------------------+
+-----------+-----------+                              |
            |                                          |
   [Payment Success]                             [Payment Failed]
            |                                          |
            v                                          v
+-----------+-----------+                    +---------+----------+
|       CONFIRMED       | (Terminal)         |   PAYMENT_FAILED   |
+-----------+-----------+                    +---------+----------+
            |                                          |
            v                                  [Retry Checkout]
     [Mint Ticket]                                     |
                                                       v
                                             +---------+----------+
                                             |  PENDING_PAYMENT   |
                                             +--------------------+
```

---

## 6. Database Schema & Data Dictionary

The persistence layer is managed via PostgreSQL on Supabase using Prisma ORM.

### 6.1 Relational Architecture Diagram

```
[City] 1 ──── * [Theatre] 1 ──── * [Screen] 1 ──── * [Seat]
                                       |                |
                                       | 1              | 1
                                       |                |
[Movie] 1 ──── * [Show] 1 ─────────── * + ──────────── * [ShowSeat]
                   |                                       |
                   | 1                                     | *
                   v                                       v
              [SeatLock] 1 ──────────────────────── * [SeatLockSeat]
                   |
                   | 1
                   v
               [Booking] 1 ───────────────────────── * [BookingSeat]
                   |
         +---------+---------+
         | 1                 | 1
         v                   v
     [Payment]           [Ticket]
```

### 6.2 Core Tables Summary

| Table | Description | Key Constraints & Indexes |
|---|---|---|
| `movies` | Film catalog, language, certification, cast | `PRIMARY KEY (id)` |
| `cities` | Operational regions | `UNIQUE (name)` |
| `theatres` | Physical cinema complexes | `FOREIGN KEY (cityId) -> cities(id)` |
| `screens` | Auditoriums / Screen halls | `UNIQUE (theatreId, name)` |
| `seats` | Physical chairs in a screen | `UNIQUE (screenId, seatLabel)`, `INDEX (screenId, rowLabel)` |
| `shows` | Scheduled movie screenings | `INDEX (movieId, startTime)`, `INDEX (screenId, startTime)` |
| `show_seats` | Real-time seat inventory per show | `UNIQUE (showId, seatId)`, `INDEX (showId, status)` |
| `seat_locks` | 5-minute reservation sessions | `INDEX (showId, status, expiresAt)`, `INDEX (sessionId)` |
| `seat_lock_seats`| Association between locks & show seats | `UNIQUE (seatLockId, showSeatId)` |
| `bookings` | Customer ticket orders | `UNIQUE (bookingReference)`, `INDEX (sessionId, status)` |
| `booking_seats` | Assigned show seats to a booking | `UNIQUE (bookingId, showSeatId)`, `UNIQUE (showSeatId)` |
| `payments` | Financial ledger and mock transactions | `UNIQUE (idempotencyKey)`, `UNIQUE (providerEventId)` |
| `tickets` | Digital boarding pass with QR token | `UNIQUE (bookingId)`, `UNIQUE (ticketReference)`, `UNIQUE (qrToken)` |

---

## 7. WhatsApp Multi-Agent System Integration Specs

The second developer building the WhatsApp multi-agent system uses these exact agent-to-endpoint mappings:

```
[ WhatsApp User: "Show me Kalki in Pune tomorrow" ]
                         |
                         v
        +---------------------------------+
        | 1. Discovery Agent              |
        | - Calls: GET /api/movies?city=..|
        +----------------+----------------+
                         |
                         v
        +---------------------------------+
        | 2. Showtime Agent               |
        | - Calls: GET /api/shows?date=.. |
        +----------------+----------------+
                         |
[ WhatsApp User: "Book 2 seats for 2:30 PM show" ]
                         |
                         v
        +---------------------------------+
        | 3. Seat Locking Agent           |
        | - Calls: GET /shows/:id/seats   |
        | - Calls: POST /api/seat-locks   |
        |   (Uses user WhatsApp phone as  |
        |    sessionId e.g. wa_919876543) |
        +----------------+----------------+
                         |
                         v
        +---------------------------------+
        | 4. Booking & Payment Agent      |
        | - Calls: POST /api/bookings     |
        | - Calls: POST /payments/checkout|
        | - Simulates or verifies payment |
        +----------------+----------------+
                         |
[ Payment Confirmed ]
                         |
                         v
        +---------------------------------+
        | 5. Ticket Retrieval Agent       |
        | - Calls: GET /bookings/:id/tkt  |
        | - Sends QR data URL & reference |
        |   directly to WhatsApp chat     |
        +---------------------------------+
```

### Recommendation for WhatsApp Session Token
Set `sessionId: "wa_" + user_phone_number` (e.g., `wa_919876543210`).  
This ensures when a user asks *"Show my bookings"* on WhatsApp, the bot queries:
`GET /api/bookings?sessionId=wa_919876543210` to return their past orders instantly.

---

## 8. Security, Performance & Operational Runbook

### 8.1 Security & Protection
- **SQL Injection Prevention:** 100% parameterization via Prisma query engine.
- **Header Hardening:** Helmet configured with `Content-Security-Policy`, `X-Frame-Options`, and `HSTS`.
- **CORS Allowlist:** Origin restricted to frontend host and localhost development servers.
- **Volumetric Rate Limiting:** 500 requests per 15-minute sliding window per IP.

### 8.2 Operational Health & Runbook

#### Starting Backend
```bash
cd backend
npm run dev
# Verification: curl -s http://localhost:4000/api/health
```

#### Starting Frontend
```bash
cd frontend
npm run dev
# Verification: Browser navigation to http://localhost:5173
```

#### Database Schema Refresh
```bash
cd backend
npm run db:push
npm run db:seed
```

#### Executing Test Suite
```bash
cd backend
npm test
# Expected: 23 passed (23) - 100% pass rate
```

---

*Authored by Antigravity Engineering for JoJo Cinema & JoJo WhatsApp Agent Integration.*
