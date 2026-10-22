import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { logger } from './config/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Routes
import healthRouter from './routes/health';
import moviesRouter from './routes/movies';
import showsRouter from './routes/shows';
import seatLocksRouter from './routes/seatLocks';
import bookingsRouter from './routes/bookings';
import paymentsRouter from './routes/payments';
import ticketsRouter from './routes/tickets';
import agentRouter from './routes/agent';

const app = express();

// ─── Security ────────────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = env.CORS_ORIGINS.split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Allow no-origin (curl, Postman, same-origin) and configured origins
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Webhook-Signature', 'X-Idempotency-Key'],
}));

// ─── Body Parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Logging ─────────────────────────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) },
  skip: (req) => req.url === '/api/health',
}));

// ─── Rate Limiting ───────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, data: null, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
});
app.use('/api', limiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/health', healthRouter);
app.use('/api/movies', moviesRouter);
app.use('/api/shows', showsRouter);
app.use('/api/seat-locks', seatLocksRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/agent', agentRouter);

// ─── API Info ────────────────────────────────────────────────────────────────
app.get('/api', (_req, res) => {
  res.json({
    name: 'JoJo Cinema API',
    version: '1.0.0',
    docs: '/api/health',
    endpoints: [
      'GET  /api/health',
      'GET  /api/health/ready',
      'GET  /api/movies',
      'GET  /api/movies/:movieId',
      'GET  /api/movies/cities',
      'GET  /api/shows',
      'GET  /api/shows/:showId',
      'GET  /api/shows/:showId/seats',
      'POST /api/seat-locks',
      'POST /api/seat-locks/:lockId/release',
      'POST /api/bookings',
      'GET  /api/bookings/:bookingId',
      'GET  /api/bookings/:bookingId/ticket',
      'GET  /api/bookings?sessionId=',
      'POST /api/payments/checkout',
      'GET  /api/payments/:paymentId/status',
      'POST /api/payments/:paymentId/simulate',
      'POST /api/payments/webhook',
      'GET  /api/tickets/:ticketReference/verify',
      'POST /api/agent/chat',
    ],
  });
});

// ─── Error Handling ──────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
