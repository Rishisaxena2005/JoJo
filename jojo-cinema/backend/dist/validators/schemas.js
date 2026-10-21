"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ticketRefSchema = exports.sessionQuerySchema = exports.simulatePaymentSchema = exports.paymentIdSchema = exports.checkoutSchema = exports.bookingIdSchema = exports.createBookingSchema = exports.releaseLockBodySchema = exports.releaseLockSchema = exports.seatLockSchema = exports.showIdSchema = exports.showQuerySchema = exports.movieIdSchema = exports.movieQuerySchema = void 0;
const zod_1 = require("zod");
exports.movieQuerySchema = zod_1.z.object({
    city: zod_1.z.string().optional(),
    search: zod_1.z.string().optional(),
    language: zod_1.z.string().optional(),
    genre: zod_1.z.string().optional(),
    status: zod_1.z.enum(['NOW_SHOWING', 'UPCOMING', 'ENDED']).optional(),
    page: zod_1.z.string().default('1').transform(Number),
    limit: zod_1.z.string().default('20').transform(Number),
});
exports.movieIdSchema = zod_1.z.object({
    movieId: zod_1.z.string().uuid('Invalid movie ID'),
});
exports.showQuerySchema = zod_1.z.object({
    movieId: zod_1.z.string().uuid('Invalid movie ID').optional(),
    city: zod_1.z.string().optional(),
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
    theatreId: zod_1.z.string().uuid().optional(),
});
exports.showIdSchema = zod_1.z.object({
    showId: zod_1.z.string().uuid('Invalid show ID'),
});
exports.seatLockSchema = zod_1.z.object({
    showId: zod_1.z.string().uuid('Invalid show ID'),
    seatIds: zod_1.z
        .array(zod_1.z.string().min(1))
        .min(1, 'At least one seat required')
        .max(6, 'Maximum 6 seats per booking'),
    sessionId: zod_1.z.string().min(1, 'sessionId is required'),
});
exports.releaseLockSchema = zod_1.z.object({
    lockId: zod_1.z.string().uuid('Invalid lock ID'),
});
exports.releaseLockBodySchema = zod_1.z.object({
    sessionId: zod_1.z.string().min(1, 'sessionId is required'),
});
exports.createBookingSchema = zod_1.z.object({
    showId: zod_1.z.string().uuid('Invalid show ID'),
    lockId: zod_1.z.string().uuid('Invalid lock ID'),
    sessionId: zod_1.z.string().min(1, 'sessionId is required'),
    seatIds: zod_1.z.array(zod_1.z.string().min(1)).min(1, 'At least one seat required'),
});
exports.bookingIdSchema = zod_1.z.object({
    bookingId: zod_1.z.string().uuid('Invalid booking ID'),
});
exports.checkoutSchema = zod_1.z.object({
    bookingId: zod_1.z.string().uuid('Invalid booking ID'),
    sessionId: zod_1.z.string().min(1, 'sessionId is required'),
    idempotencyKey: zod_1.z.string().min(1, 'idempotencyKey is required'),
});
exports.paymentIdSchema = zod_1.z.object({
    paymentId: zod_1.z.string().uuid('Invalid payment ID'),
});
exports.simulatePaymentSchema = zod_1.z.object({
    outcome: zod_1.z.enum(['success', 'failure']),
});
exports.sessionQuerySchema = zod_1.z.object({
    sessionId: zod_1.z.string().min(1, 'sessionId is required'),
    page: zod_1.z.string().default('1').transform(Number),
    limit: zod_1.z.string().default('20').transform(Number),
});
exports.ticketRefSchema = zod_1.z.object({
    ticketReference: zod_1.z.string().min(1, 'ticketReference is required'),
});
//# sourceMappingURL=schemas.js.map