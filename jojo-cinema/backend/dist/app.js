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
// Routes
const health_1 = __importDefault(require("./routes/health"));
const movies_1 = __importDefault(require("./routes/movies"));
const shows_1 = __importDefault(require("./routes/shows"));
const seatLocks_1 = __importDefault(require("./routes/seatLocks"));
const bookings_1 = __importDefault(require("./routes/bookings"));
const payments_1 = __importDefault(require("./routes/payments"));
const tickets_1 = __importDefault(require("./routes/tickets"));
const agent_1 = __importDefault(require("./routes/agent"));
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
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Webhook-Signature', 'X-Idempotency-Key'],
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
// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/health', health_1.default);
app.use('/api/movies', movies_1.default);
app.use('/api/shows', shows_1.default);
app.use('/api/seat-locks', seatLocks_1.default);
app.use('/api/bookings', bookings_1.default);
app.use('/api/payments', payments_1.default);
app.use('/api/tickets', tickets_1.default);
app.use('/api/agent', agent_1.default);
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
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map