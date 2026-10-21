import { z } from 'zod';

export const movieQuerySchema = z.object({
  city: z.string().optional(),
  search: z.string().optional(),
  language: z.string().optional(),
  genre: z.string().optional(),
  status: z.enum(['NOW_SHOWING', 'UPCOMING', 'ENDED']).optional(),
  page: z.string().default('1').transform(Number),
  limit: z.string().default('20').transform(Number),
});

export const movieIdSchema = z.object({
  movieId: z.string().uuid('Invalid movie ID'),
});

export const showQuerySchema = z.object({
  movieId: z.string().uuid('Invalid movie ID').optional(),
  city: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  theatreId: z.string().uuid().optional(),
});

export const showIdSchema = z.object({
  showId: z.string().uuid('Invalid show ID'),
});

export const seatLockSchema = z.object({
  showId: z.string().uuid('Invalid show ID'),
  seatIds: z
    .array(z.string().min(1))
    .min(1, 'At least one seat required')
    .max(6, 'Maximum 6 seats per booking'),
  sessionId: z.string().min(1, 'sessionId is required'),
});

export const releaseLockSchema = z.object({
  lockId: z.string().uuid('Invalid lock ID'),
});

export const releaseLockBodySchema = z.object({
  sessionId: z.string().min(1, 'sessionId is required'),
});

export const createBookingSchema = z.object({
  showId: z.string().uuid('Invalid show ID'),
  lockId: z.string().uuid('Invalid lock ID'),
  sessionId: z.string().min(1, 'sessionId is required'),
  seatIds: z.array(z.string().min(1)).min(1, 'At least one seat required'),
});

export const bookingIdSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID'),
});

export const checkoutSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID'),
  sessionId: z.string().min(1, 'sessionId is required'),
  idempotencyKey: z.string().min(1, 'idempotencyKey is required'),
});

export const paymentIdSchema = z.object({
  paymentId: z.string().uuid('Invalid payment ID'),
});

export const simulatePaymentSchema = z.object({
  outcome: z.enum(['success', 'failure']),
});

export const sessionQuerySchema = z.object({
  sessionId: z.string().min(1, 'sessionId is required'),
  page: z.string().default('1').transform(Number),
  limit: z.string().default('20').transform(Number),
});

export const ticketRefSchema = z.object({
  ticketReference: z.string().min(1, 'ticketReference is required'),
});
