# 🤖 JoJo Cinema — WhatsApp AI Multi-Agent Integration Guide

This guide is written for the developer building the WhatsApp multi-agent system (JoJo). The 5 AI agents communicate with JoJo Cinema backend via REST endpoints.

---

## 🧭 System Overview & Base URL

- **Development Base URL**: `http://localhost:4000/api`
- **Standard Envelope**: All endpoints return a uniform JSON format:
```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```
In case of an error:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "SEATS_ALREADY_LOCKED",
    "message": "One or more requested seats are currently locked or booked",
    "details": { ... }
  }
}
```

---

## 👥 The 5 JoJo WhatsApp Agents & Endpoints

### 1. 🔍 Discovery Agent (Movie Search & Details)
**Responsibilities**: Helps user find what to watch by title, language, genre, or city.

| Action | HTTP | Endpoint | Parameters |
|---|---|---|---|
| Search movies | `GET` | `/movies` | `?search=kalki&city=Mumbai&language=Hindi` |
| Get cities | `GET` | `/movies/cities` | None |
| Movie details | `GET` | `/movies/:movieId` | `:movieId` path param |

**Example Agent Call**:
```bash
curl http://localhost:4000/api/movies?city=Pune&search=Kalki
```

---

### 2. 🕒 Showtime Agent (Showtimes & Theatres)
**Responsibilities**: Retrieves showtimes for a specific movie in a city on a chosen date.

| Action | HTTP | Endpoint | Parameters |
|---|---|---|---|
| List showtimes | `GET` | `/shows` | `?movieId=xxx&city=Pune&date=2026-10-22` |
| Show details | `GET` | `/shows/:showId` | `:showId` path param |

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "show-uuid-1",
      "startTime": "2026-10-22T14:30:00.000Z",
      "format": "2D",
      "theatre": {
        "id": "theatre-uuid-1",
        "name": "PVR Icon Pavilion",
        "address": "SB Road, Pune"
      },
      "screen": { "name": "Screen 1" },
      "availableSeatCount": 85
    }
  ]
}
```

---

### 3. 💺 Seat Selection & Locking Agent
**Responsibilities**: Checks seat map, suggests seats, and locks selected seats atomically.

| Action | HTTP | Endpoint | Body |
|---|---|---|---|
| View seat layout | `GET` | `/shows/:showId/seats` | None |
| Lock seats (5 min TTL)| `POST` | `/seat-locks` | `{"showId": "...", "seatIds": ["..."], "sessionId": "..."}` |
| Release lock | `POST` | `/seat-locks/:lockId/release` | `{"sessionId": "..."}` |

**Important for Agent**:
- Seat locks expire automatically in **300 seconds** (5 minutes).
- `sessionId` should be the user's WhatsApp number (e.g. `wa_919876543210`) to persist across messages.
- If response is `409 Conflict`, one or more seats were snatched by someone else. Prompt user to choose alternate seats.

---

### 4. 💳 Booking & Payment Agent
**Responsibilities**: Creates booking order, initiates payment, and handles status.

| Action | HTTP | Endpoint | Body / Params |
|---|---|---|---|
| Create booking | `POST` | `/bookings` | `{"lockId": "...", "sessionId": "..."}` |
| Get booking | `GET` | `/bookings/:bookingId` | `:bookingId` |
| Initiate checkout | `POST` | `/payments/checkout` | `{"bookingId": "...", "idempotencyKey": "..."}` |
| Check payment status | `GET` | `/payments/:paymentId/status` | `:paymentId` |
| Simulate payment (Test) | `POST` | `/payments/:paymentId/simulate` | `{"outcome": "SUCCESS"}` |

**Agent Flow**:
1. Post `/bookings` with `lockId`.
2. Receives `bookingId` and `totalAmount`.
3. Calls `/payments/checkout` with `idempotencyKey` (e.g. `pay_wa_msg_12345`).
4. Sends payment link or mock payment confirmation prompt to WhatsApp user.
5. Polls `/payments/:paymentId/status` until `status === "SUCCESS"`.

---

### 5. 🎟️ Ticket Retrieval Agent
**Responsibilities**: Delivers confirmed ticket details and QR code to WhatsApp chat.

| Action | HTTP | Endpoint |
|---|---|---|
| Get ticket & QR code | `GET` | `/bookings/:bookingId/ticket` |
| Gate ticket verification | `GET` | `/tickets/:ticketReference/verify` |

**Example Ticket Payload**:
```json
{
  "success": true,
  "data": {
    "ticketReference": "TKT-JC-20261021-A9B2",
    "qrToken": "qr_jwt_token_here",
    "qrCodeDataUrl": "data:image/png;base64,iVBORw0KG...",
    "issuedAt": "2026-10-21T18:00:00.000Z",
    "booking": {
      "bookingReference": "JC-20261021-9876",
      "movie": { "title": "Kalki Chronicles" },
      "theatre": { "name": "PVR Icon Pavilion" },
      "seats": ["C5", "C6"]
    }
  }
}
```
The agent can directly send `ticketReference`, movie title, showtime, and embed the `qrCodeDataUrl` image in the WhatsApp message!

---

## ⚠️ Standard Error Codes

| Code | HTTP | Description |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Invalid payload, missing fields, or exceeded max 6 seats |
| `MOVIE_NOT_FOUND` | 404 | Invalid movie ID |
| `SHOW_NOT_FOUND` | 404 | Invalid show ID |
| `SEATS_ALREADY_LOCKED` | 409 | One or more seats are unavailable or already locked |
| `LOCK_EXPIRED` | 400 | Seat lock TTL (5 min) exceeded |
| `BOOKING_NOT_FOUND` | 404 | Invalid booking ID |
| `PAYMENT_FAILED` | 402 | Payment processing failed or was declined |
