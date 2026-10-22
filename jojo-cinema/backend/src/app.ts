import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { logger } from './config/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { createAgentEvent } from './agent-runtime/events';

// Routes
import healthRouter from './routes/health';
import moviesRouter from './routes/movies';
import showsRouter from './routes/shows';
import seatLocksRouter from './routes/seatLocks';
import bookingsRouter from './routes/bookings';
import paymentsRouter from './routes/payments';
import ticketsRouter from './routes/tickets';
import agentRouter from './routes/agent';
import trainsRouter from './routes/trains';

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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Webhook-Signature', 'X-Idempotency-Key', 'X-JoJo-Run-Id'],
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

function traceableOperation(method: string, path: string): string | undefined {
  if (method === 'GET' && path === '/trains/stations') return 'train.list_stations';
  if (method === 'GET' && path === '/trains/search') return 'train.search_journeys';
  if (method === 'POST' && path === '/trains/bookings') return 'train.create_demo_booking';
  if (method === 'POST' && /^\/trains\/bookings\/[^/]+\/cancel$/.test(path)) return 'train.cancel_demo_booking';
  if (method === 'POST' && /^\/trains\/bookings\/[^/]+\/pay-demo$/.test(path)) return 'train.confirm_demo_booking';
  if (method === 'GET' && /^\/trains\/bookings\/[^/]+$/.test(path)) return 'train.retrieve_booking';
  if (method === 'GET' && path === '/movies/cities') return 'cinema.list_cities';
  if (method === 'GET' && path === '/movies') return 'cinema.search_movies';
  if (method === 'GET' && path === '/shows') return 'cinema.search_showtimes';
  if (method === 'GET' && /^\/shows\/[^/]+\/seats$/.test(path)) return 'cinema.load_seat_map';
  if (method === 'GET' && /^\/shows\/[^/]+$/.test(path)) return 'cinema.load_show';
  if (method === 'POST' && path === '/seat-locks') return 'cinema.hold_seats';
  if (method === 'POST' && /^\/seat-locks\/[^/]+\/release$/.test(path)) return 'cinema.release_seats';
  if (method === 'POST' && path === '/bookings') return 'cinema.create_booking';
  if (method === 'GET' && /^\/bookings\/[^/]+\/ticket$/.test(path)) return 'cinema.retrieve_ticket';
  if (method === 'POST' && path === '/payments/checkout') return 'payment.create_demo_checkout';
  if (method === 'POST' && /^\/payments\/[^/]+\/simulate$/.test(path)) return 'payment.simulate_demo_payment';
  return undefined;
}

// Capture real calls made by the separate Telegram process. The trace accepts
// only UUID correlation IDs and allow-listed, non-sensitive query fields.
app.use('/api', (req, res, next) => {
  const runId = req.header('x-jojo-run-id');
  const toolName = traceableOperation(req.method, req.path);
  if (!runId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(runId) || !toolName) return next();

  const train = toolName.startsWith('train.');
  const payment = toolName.startsWith('payment.');
  const conversationId = `trace-${runId}`;
  const agentId = train ? 'train-booking-flow' : payment ? 'payment-workflow' : 'movie-booking-flow';
  const agentName = train ? 'Train booking workflow' : payment ? 'Demo payment workflow' : 'Movie booking workflow';
  const sanitizedArguments: Record<string, string | number | boolean> = { method: req.method };
  const query = new URLSearchParams(req.url.split('?')[1] ?? '');
  for (const name of ['city', 'date', 'from', 'to', 'passengers', 'class']) {
    const value = query.get(name);
    if (value && value.length <= 60) sanitizedArguments[name] = name === 'passengers' && /^\d+$/.test(value) ? Number(value) : value;
  }
  const startedAt = Date.now();
  createAgentEvent({ runId, conversationId, agentId, agentName, eventType: 'tool.started', status: 'running', toolName, sanitizedArguments });
  res.once('finish', () => {
    const failed = res.statusCode >= 400;
    createAgentEvent({
      runId, conversationId, agentId, agentName,
      eventType: failed ? 'tool.failed' : 'tool.completed', status: failed ? 'failed' : 'completed', toolName,
      ...(!failed ? { toolResultSummary: `Service responded with HTTP ${res.statusCode}` } : {}),
      durationMs: Date.now() - startedAt,
      ...(failed ? { errorCategory: 'tool' as const, recoveryStatus: 'not_attempted' as const } : {}),
    });
  });
  next();
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/health', healthRouter);
app.use('/api/movies', moviesRouter);
app.use('/api/shows', showsRouter);
app.use('/api/seat-locks', seatLocksRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/agent', agentRouter);
app.use('/api/trains', trainsRouter);

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
      'POST /api/agent/trace-event',
      'GET  /api/trains/stations?q=',
      'GET  /api/trains/search?from=&to=&date=&passengers=',
      'POST /api/trains/bookings',
      'POST /api/trains/bookings/:bookingId/cancel',
      'POST /api/trains/bookings/:bookingId/pay-demo',
      'GET  /api/trains/bookings/:bookingId?sessionId=',
    ],
  });
});

// ─── Error Handling ──────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
