import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/database';

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ─── Health Tests ────────────────────────────────────────────────────────────

describe('GET /api/health', () => {
  it('returns 200 with success status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.error).toBeNull();
  });
});

// ─── Movie Tests ─────────────────────────────────────────────────────────────

describe('GET /api/movies', () => {
  it('returns seeded movies with pagination', async () => {
    const res = await request(app).get('/api/movies');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toBeInstanceOf(Array);
    expect(res.body.data.items.length).toBeGreaterThan(0);
    expect(res.body.data.pagination).toBeDefined();
  });

  it('filters movies by search term', async () => {
    const res = await request(app).get('/api/movies?search=Kalki');
    expect(res.status).toBe(200);
    expect(res.body.data.items.some((m: any) => m.title.includes('Kalki'))).toBe(true);
  });

  it('filters movies by city', async () => {
    const res = await request(app).get('/api/movies?city=Pune');
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
  });

  it('returns 400 for invalid status filter', async () => {
    const res = await request(app).get('/api/movies?status=INVALID');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/movies/:movieId', () => {
  it('returns 404 for non-existent movie', async () => {
    const res = await request(app).get('/api/movies/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 for invalid UUID', async () => {
    const res = await request(app).get('/api/movies/not-a-uuid');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns movie details for valid ID', async () => {
    const listRes = await request(app).get('/api/movies');
    const movieId = listRes.body.data.items[0].id;
    const res = await request(app).get(`/api/movies/${movieId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(movieId);
    expect(res.body.data.title).toBeDefined();
  });
});

// ─── Show Tests ───────────────────────────────────────────────────────────────

describe('GET /api/shows', () => {
  it('returns shows for today', async () => {
    const today = new Date().toISOString().split('T')[0];
    const res = await request(app).get(`/api/shows?city=Pune&date=${today}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it('filters shows by movieId', async () => {
    const movies = await request(app).get('/api/movies?status=NOW_SHOWING');
    if (movies.body.data.items.length === 0) return;
    const movieId = movies.body.data.items[0].id;
    const res = await request(app).get(`/api/shows?movieId=${movieId}`);
    expect(res.status).toBe(200);
  });

  it('returns 400 for invalid date format', async () => {
    const res = await request(app).get('/api/shows?date=21-10-2026');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/shows/:showId', () => {
  it('returns 404 for non-existent show', async () => {
    const res = await request(app).get('/api/shows/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/shows/:showId/seats', () => {
  it('returns seat map with rows and seats', async () => {
    const today = new Date().toISOString().split('T')[0];
    const shows = await request(app).get(`/api/shows?date=${today}`);
    if (!shows.body.data.length) return;
    const showId = shows.body.data[0].id;

    const res = await request(app).get(`/api/shows/${showId}/seats`);
    expect(res.status).toBe(200);
    expect(res.body.data.rows).toBeInstanceOf(Array);
    expect(res.body.data.rows.length).toBeGreaterThan(0);
    expect(res.body.data.rows[0].seats).toBeInstanceOf(Array);
    // Each seat must have required fields
    const seat = res.body.data.rows[0].seats[0];
    expect(seat.showSeatId).toBeDefined();
    expect(seat.seatLabel).toBeDefined();
    expect(seat.status).toMatch(/AVAILABLE|LOCKED|BOOKED/);
  });
});

// ─── Seat Lock Tests ─────────────────────────────────────────────────────────

describe('POST /api/seat-locks', () => {
  it('returns 400 for invalid payload', async () => {
    const res = await request(app).post('/api/seat-locks').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for too many seats', async () => {
    const res = await request(app).post('/api/seat-locks').send({
      showId: '00000000-0000-0000-0000-000000000000',
      seatIds: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
      sessionId: 'test-session',
    });
    expect(res.status).toBe(400);
  });

  it('locks seats and returns lock ID', async () => {
    const today = new Date().toISOString().split('T')[0];
    const shows = await request(app).get(`/api/shows?date=${today}&city=Pune`);
    if (!shows.body.data.length) return;
    const showId = shows.body.data[0].id;

    const seatsRes = await request(app).get(`/api/shows/${showId}/seats`);
    const availableSeats = seatsRes.body.data.rows
      .flatMap((r: any) => r.seats)
      .filter((s: any) => s.status === 'AVAILABLE')
      .slice(0, 2);

    if (availableSeats.length < 2) return;

    const res = await request(app).post('/api/seat-locks').send({
      showId,
      seatIds: availableSeats.map((s: any) => s.showSeatId),
      sessionId: 'test-session-api',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.lockId).toBeDefined();
    expect(res.body.data.status).toBe('ACTIVE');
    expect(res.body.data.expiresAt).toBeDefined();

    // Cleanup
    await request(app).post(`/api/seat-locks/${res.body.data.lockId}/release`).send({
      sessionId: 'test-session-api',
    });
  });

  it('concurrent requests for same seat: only one succeeds', async () => {
    const today = new Date().toISOString().split('T')[0];
    const shows = await request(app).get(`/api/shows?date=${today}&city=Pune`);
    if (!shows.body.data.length) return;
    const showId = shows.body.data[0].id;

    const seatsRes = await request(app).get(`/api/shows/${showId}/seats`);
    const availableSeats = seatsRes.body.data.rows
      .flatMap((r: any) => r.seats)
      .filter((s: any) => s.status === 'AVAILABLE')
      .slice(0, 1);

    if (!availableSeats.length) return;

    const seatId = availableSeats[0].showSeatId;

    // Fire two concurrent requests
    const [res1, res2] = await Promise.all([
      request(app).post('/api/seat-locks').send({
        showId,
        seatIds: [seatId],
        sessionId: 'concurrent-session-1',
      }),
      request(app).post('/api/seat-locks').send({
        showId,
        seatIds: [seatId],
        sessionId: 'concurrent-session-2',
      }),
    ]);

    const codes = [res1.status, res2.status];
    expect(codes).toContain(201);
    expect(codes).toContain(409);

    // Cleanup
    const winner = res1.status === 201 ? res1 : res2;
    const winnerSession = res1.status === 201 ? 'concurrent-session-1' : 'concurrent-session-2';
    await request(app).post(`/api/seat-locks/${winner.body.data.lockId}/release`).send({
      sessionId: winnerSession,
    });
  });

  it('unauthorized session cannot release another sessions lock', async () => {
    const today = new Date().toISOString().split('T')[0];
    const shows = await request(app).get(`/api/shows?date=${today}&city=Pune`);
    if (!shows.body.data.length) return;
    const showId = shows.body.data[0].id;

    const seatsRes = await request(app).get(`/api/shows/${showId}/seats`);
    const seat = seatsRes.body.data.rows
      .flatMap((r: any) => r.seats)
      .find((s: any) => s.status === 'AVAILABLE');
    if (!seat) return;

    const lockRes = await request(app).post('/api/seat-locks').send({
      showId,
      seatIds: [seat.showSeatId],
      sessionId: 'owner-session',
    });

    if (lockRes.status !== 201) return;

    const releaseRes = await request(app)
      .post(`/api/seat-locks/${lockRes.body.data.lockId}/release`)
      .send({ sessionId: 'different-session' });

    expect(releaseRes.status).toBe(403);

    // Cleanup
    await request(app)
      .post(`/api/seat-locks/${lockRes.body.data.lockId}/release`)
      .send({ sessionId: 'owner-session' });
  });
});

// ─── Booking Tests ────────────────────────────────────────────────────────────

describe('POST /api/bookings', () => {
  it('returns 400 for invalid payload', async () => {
    const res = await request(app).post('/api/bookings').send({});
    expect(res.status).toBe(400);
  });

  it('creates a booking from a valid lock', async () => {
    const today = new Date().toISOString().split('T')[0];
    const shows = await request(app).get(`/api/shows?date=${today}&city=Pune`);
    if (!shows.body.data.length) return;
    const showId = shows.body.data[0].id;

    const seatsRes = await request(app).get(`/api/shows/${showId}/seats`);
    const availableSeats = seatsRes.body.data.rows
      .flatMap((r: any) => r.seats)
      .filter((s: any) => s.status === 'AVAILABLE')
      .slice(0, 2);
    if (availableSeats.length < 2) return;

    const sessionId = `booking-test-${Date.now()}`;
    const lockRes = await request(app).post('/api/seat-locks').send({
      showId,
      seatIds: availableSeats.map((s: any) => s.showSeatId),
      sessionId,
    });
    if (lockRes.status !== 201) return;

    const bookingRes = await request(app).post('/api/bookings').send({
      showId,
      lockId: lockRes.body.data.lockId,
      sessionId,
      seatIds: availableSeats.map((s: any) => s.showSeatId),
    });

    expect(bookingRes.status).toBe(201);
    expect(bookingRes.body.data.bookingId).toBeDefined();
    expect(bookingRes.body.data.status).toBe('PENDING_PAYMENT');
    expect(typeof bookingRes.body.data.totalAmount).toBe('number');
  });
});

// ─── Payment Tests ────────────────────────────────────────────────────────────

describe('Payment flow', () => {
  it('full booking + payment flow: success path', async () => {
    const today = new Date().toISOString().split('T')[0];
    const shows = await request(app).get(`/api/shows?date=${today}&city=Pune`);
    if (!shows.body.data.length) return;
    const showId = shows.body.data[0].id;

    const seatsRes = await request(app).get(`/api/shows/${showId}/seats`);
    const availableSeats = seatsRes.body.data.rows
      .flatMap((r: any) => r.seats)
      .filter((s: any) => s.status === 'AVAILABLE')
      .slice(0, 2);
    if (availableSeats.length < 2) return;

    const sessionId = `payment-test-${Date.now()}`;

    // Lock
    const lockRes = await request(app).post('/api/seat-locks').send({
      showId,
      seatIds: availableSeats.map((s: any) => s.showSeatId),
      sessionId,
    });
    if (lockRes.status !== 201) return;

    // Book
    const bookingRes = await request(app).post('/api/bookings').send({
      showId,
      lockId: lockRes.body.data.lockId,
      sessionId,
      seatIds: availableSeats.map((s: any) => s.showSeatId),
    });
    if (bookingRes.status !== 201) return;
    const bookingId = bookingRes.body.data.bookingId;

    // Checkout
    const checkoutRes = await request(app).post('/api/payments/checkout').send({
      bookingId,
      sessionId,
      idempotencyKey: `test-${Date.now()}`,
    });
    expect(checkoutRes.status).toBe(201);
    const paymentId = checkoutRes.body.data.paymentId;

    // Simulate success
    const simRes = await request(app).post(`/api/payments/${paymentId}/simulate`).send({ outcome: 'success' });
    expect(simRes.status).toBe(200);
    expect(simRes.body.data.status).toBe('SUCCESS');

    // Verify booking confirmed
    const bookingDetail = await request(app).get(`/api/bookings/${bookingId}?sessionId=${sessionId}`);
    expect(bookingDetail.body.data.status).toBe('CONFIRMED');

    // Get ticket
    const ticketRes = await request(app).get(`/api/bookings/${bookingId}/ticket?sessionId=${sessionId}`);
    expect(ticketRes.status).toBe(200);
    expect(ticketRes.body.data.ticketReference).toBeDefined();
    expect(ticketRes.body.data.qrToken).toBeDefined();

    // Verify ticket
    const verifyRes = await request(app).get(`/api/tickets/${ticketRes.body.data.ticketReference}/verify`);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.valid).toBe(true);
  });

  it('failed payment does not confirm booking', async () => {
    const today = new Date().toISOString().split('T')[0];
    const shows = await request(app).get(`/api/shows?date=${today}&city=Pune`);
    if (!shows.body.data.length) return;
    const showId = shows.body.data[0].id;

    const seatsRes = await request(app).get(`/api/shows/${showId}/seats`);
    const availableSeats = seatsRes.body.data.rows
      .flatMap((r: any) => r.seats)
      .filter((s: any) => s.status === 'AVAILABLE')
      .slice(0, 1);
    if (!availableSeats.length) return;

    const sessionId = `fail-test-${Date.now()}`;
    const lockRes = await request(app).post('/api/seat-locks').send({
      showId,
      seatIds: [availableSeats[0].showSeatId],
      sessionId,
    });
    if (lockRes.status !== 201) return;

    const bookingRes = await request(app).post('/api/bookings').send({
      showId,
      lockId: lockRes.body.data.lockId,
      sessionId,
      seatIds: [availableSeats[0].showSeatId],
    });
    if (bookingRes.status !== 201) return;
    const bookingId = bookingRes.body.data.bookingId;

    const checkoutRes = await request(app).post('/api/payments/checkout').send({
      bookingId,
      sessionId,
      idempotencyKey: `fail-test-${Date.now()}`,
    });
    if (checkoutRes.status !== 201) return;
    const paymentId = checkoutRes.body.data.paymentId;

    await request(app).post(`/api/payments/${paymentId}/simulate`).send({ outcome: 'failure' });

    const booking = await request(app).get(`/api/bookings/${bookingId}?sessionId=${sessionId}`);
    expect(booking.body.data.status).toBe('PAYMENT_FAILED');

    const ticketRes = await request(app).get(`/api/bookings/${bookingId}/ticket?sessionId=${sessionId}`);
    expect(ticketRes.status).toBe(409);
    expect(ticketRes.body.error.code).toBe('BOOKING_NOT_CONFIRMED');
  });

  it('duplicate checkout with same idempotency key returns same payment', async () => {
    const today = new Date().toISOString().split('T')[0];
    const shows = await request(app).get(`/api/shows?date=${today}&city=Pune`);
    if (!shows.body.data.length) return;
    const showId = shows.body.data[0].id;

    const seatsRes = await request(app).get(`/api/shows/${showId}/seats`);
    const seat = seatsRes.body.data.rows
      .flatMap((r: any) => r.seats)
      .find((s: any) => s.status === 'AVAILABLE');
    if (!seat) return;

    const sessionId = `idem-test-${Date.now()}`;
    const lockRes = await request(app).post('/api/seat-locks').send({
      showId,
      seatIds: [seat.showSeatId],
      sessionId,
    });
    if (lockRes.status !== 201) return;

    const bookingRes = await request(app).post('/api/bookings').send({
      showId,
      lockId: lockRes.body.data.lockId,
      sessionId,
      seatIds: [seat.showSeatId],
    });
    if (bookingRes.status !== 201) return;

    const idemKey = `idem-${Date.now()}`;
    const [c1, c2] = await Promise.all([
      request(app).post('/api/payments/checkout').send({ bookingId: bookingRes.body.data.bookingId, sessionId, idempotencyKey: idemKey }),
      request(app).post('/api/payments/checkout').send({ bookingId: bookingRes.body.data.bookingId, sessionId, idempotencyKey: idemKey }),
    ]);

    expect(c1.status).toBe(201);
    expect(c2.status).toBe(201);
    expect(c1.body.data.paymentId).toBe(c2.body.data.paymentId);
  });
});
