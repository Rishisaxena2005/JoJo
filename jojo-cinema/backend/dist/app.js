"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
const errorHandler_1 = require("./middleware/errorHandler");
const events_1 = require("./agent-runtime/events");
// Routes
const health_1 = __importDefault(require("./routes/health"));
const movies_1 = __importDefault(require("./routes/movies"));
const shows_1 = __importDefault(require("./routes/shows"));
const seatLocks_1 = __importDefault(require("./routes/seatLocks"));
const bookings_1 = __importDefault(require("./routes/bookings"));
const payments_1 = __importDefault(require("./routes/payments"));
const tickets_1 = __importDefault(require("./routes/tickets"));
const agent_1 = __importDefault(require("./routes/agent"));
const trains_1 = __importDefault(require("./routes/trains"));
const app = (0, express_1.default)();
// ─── Security ────────────────────────────────────────────────────────────────
app.use((0, helmet_1.default)());
// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = env_1.env.CORS_ORIGINS.split(',').map(o => o.trim());
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow no-origin (curl, Postman, same-origin) and configured origins
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            callback(null, true);
        }
        else {
            callback(new Error(`CORS: origin ${origin} not allowed`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Webhook-Signature', 'X-Idempotency-Key', 'X-JoJo-Run-Id'],
}));
// ─── Body Parsing ────────────────────────────────────────────────────────────
app.use(express_1.default.json({ limit: '1mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// ─── Logging ─────────────────────────────────────────────────────────────────
app.use((0, morgan_1.default)('combined', {
    stream: { write: (message) => logger_1.logger.info(message.trim()) },
    skip: (req) => req.url === '/api/health',
}));
// ─── Rate Limiting ───────────────────────────────────────────────────────────
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, data: null, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
});
app.use('/api', limiter);
function traceableOperation(method, path) {
    if (method === 'GET' && path === '/trains/stations')
        return 'train.list_stations';
    if (method === 'GET' && path === '/trains/search')
        return 'train.search_journeys';
    if (method === 'POST' && path === '/trains/bookings')
        return 'train.create_demo_booking';
    if (method === 'POST' && /^\/trains\/bookings\/[^/]+\/cancel$/.test(path))
        return 'train.cancel_demo_booking';
    if (method === 'POST' && /^\/trains\/bookings\/[^/]+\/pay-demo$/.test(path))
        return 'train.confirm_demo_booking';
    if (method === 'GET' && /^\/trains\/bookings\/[^/]+$/.test(path))
        return 'train.retrieve_booking';
    if (method === 'GET' && path === '/movies/cities')
        return 'cinema.list_cities';
    if (method === 'GET' && path === '/movies')
        return 'cinema.search_movies';
    if (method === 'GET' && path === '/shows')
        return 'cinema.search_showtimes';
    if (method === 'GET' && /^\/shows\/[^/]+\/seats$/.test(path))
        return 'cinema.load_seat_map';
    if (method === 'GET' && /^\/shows\/[^/]+$/.test(path))
        return 'cinema.load_show';
    if (method === 'POST' && path === '/seat-locks')
        return 'cinema.hold_seats';
    if (method === 'POST' && /^\/seat-locks\/[^/]+\/release$/.test(path))
        return 'cinema.release_seats';
    if (method === 'POST' && path === '/bookings')
        return 'cinema.create_booking';
    if (method === 'GET' && /^\/bookings\/[^/]+\/ticket$/.test(path))
        return 'cinema.retrieve_ticket';
    if (method === 'POST' && path === '/payments/checkout')
        return 'payment.create_demo_checkout';
    if (method === 'POST' && /^\/payments\/[^/]+\/simulate$/.test(path))
        return 'payment.simulate_demo_payment';
    return undefined;
}
// Capture real calls made by the separate Telegram process. The trace accepts
// only UUID correlation IDs and allow-listed, non-sensitive query fields.
app.use('/api', (req, res, next) => {
    const runId = req.header('x-jojo-run-id');
    const toolName = traceableOperation(req.method, req.path);
    if (!runId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(runId) || !toolName)
        return next();
    const train = toolName.startsWith('train.');
    const payment = toolName.startsWith('payment.');
    const conversationId = `trace-${runId}`;
    const agentId = train ? 'train-booking-flow' : payment ? 'payment-workflow' : 'movie-booking-flow';
    const agentName = train ? 'Train booking workflow' : payment ? 'Demo payment workflow' : 'Movie booking workflow';
    const sanitizedArguments = { method: req.method };
    const query = new URLSearchParams(req.url.split('?')[1] ?? '');
    for (const name of ['city', 'date', 'from', 'to', 'passengers', 'class']) {
        const value = query.get(name);
        if (value && value.length <= 60)
            sanitizedArguments[name] = name === 'passengers' && /^\d+$/.test(value) ? Number(value) : value;
    }
    const startedAt = Date.now();
    (0, events_1.createAgentEvent)({ runId, conversationId, agentId, agentName, eventType: 'tool.started', status: 'running', toolName, sanitizedArguments });
    res.once('finish', () => {
        const failed = res.statusCode >= 400;
        (0, events_1.createAgentEvent)({
            runId, conversationId, agentId, agentName,
            eventType: failed ? 'tool.failed' : 'tool.completed', status: failed ? 'failed' : 'completed', toolName,
            ...(!failed ? { toolResultSummary: `Service responded with HTTP ${res.statusCode}` } : {}),
            durationMs: Date.now() - startedAt,
            ...(failed ? { errorCategory: 'tool', recoveryStatus: 'not_attempted' } : {}),
        });
    });
    next();
});
// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/health', health_1.default);
app.use('/api/movies', movies_1.default);
app.use('/api/shows', shows_1.default);
app.use('/api/seat-locks', seatLocks_1.default);
app.use('/api/bookings', bookings_1.default);
app.use('/api/payments', payments_1.default);
app.use('/api/tickets', tickets_1.default);
app.use('/api/agent', agent_1.default);
app.use('/api/trains', trains_1.default);
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
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map