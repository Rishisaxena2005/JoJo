"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const validate_1 = require("../middleware/validate");
const schemas_1 = require("../validators/schemas");
const bookingService_1 = require("../services/bookingService");
const api_1 = require("../types/api");
const router = (0, express_1.Router)();
// GET /api/bookings  — session-scoped
router.get('/', (0, validate_1.validate)(schemas_1.sessionQuerySchema, 'query'), async (req, res, next) => {
    try {
        const { sessionId, page, limit } = req.query;
        const result = await (0, bookingService_1.getBookingsBySession)(sessionId, page, limit);
        res.json((0, api_1.success)(result));
    }
    catch (e) {
        next(e);
    }
});
// POST /api/bookings
router.post('/', (0, validate_1.validate)(schemas_1.createBookingSchema), async (req, res, next) => {
    try {
        const booking = await (0, bookingService_1.createBooking)(req.body);
        res.status(201).json((0, api_1.success)({
            bookingId: booking.id,
            bookingReference: booking.bookingReference,
            status: booking.status,
            totalAmount: Number(booking.totalAmount),
            currency: booking.currency,
            expiresAt: booking.expiresAt,
            seats: booking.bookingSeats.map(bs => ({
                showSeatId: bs.showSeatId,
                seatLabel: bs.showSeat.seat.seatLabel,
                seatType: bs.showSeat.seat.seatType,
                price: Number(bs.priceAtBooking),
            })),
            show: {
                id: booking.show.id,
                startTime: booking.show.startTime,
                endTime: booking.show.endTime,
                format: booking.show.format,
                movie: booking.show.movie,
                theatre: booking.show.screen.theatre,
            },
        }));
    }
    catch (e) {
        next(e);
    }
});
// GET /api/bookings/:bookingId
router.get('/:bookingId', (0, validate_1.validate)(schemas_1.bookingIdSchema, 'params'), async (req, res, next) => {
    try {
        const sessionId = req.query.sessionId;
        const booking = await (0, bookingService_1.getBookingById)(req.params.bookingId, sessionId);
        res.json((0, api_1.success)(booking));
    }
    catch (e) {
        next(e);
    }
});
// GET /api/bookings/:bookingId/ticket
router.get('/:bookingId/ticket', (0, validate_1.validate)(schemas_1.bookingIdSchema, 'params'), async (req, res, next) => {
    try {
        const sessionId = req.query.sessionId;
        const ticket = await (0, bookingService_1.getBookingTicket)(req.params.bookingId, sessionId);
        res.json((0, api_1.success)(ticket));
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=bookings.js.map