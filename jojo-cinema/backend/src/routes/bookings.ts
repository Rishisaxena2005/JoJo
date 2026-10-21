import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../middleware/validate';
import { createBookingSchema, bookingIdSchema, sessionQuerySchema } from '../validators/schemas';
import { createBooking, getBookingById, getBookingsBySession, getBookingTicket } from '../services/bookingService';
import { success } from '../types/api';

const router = Router();

// GET /api/bookings  — session-scoped
router.get('/', validate(sessionQuerySchema, 'query'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, page, limit } = req.query as any;
    const result = await getBookingsBySession(sessionId, page, limit);
    res.json(success(result));
  } catch (e) { next(e); }
});

// POST /api/bookings
router.post('/', validate(createBookingSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const booking = await createBooking(req.body);
    res.status(201).json(success({
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
  } catch (e) { next(e); }
});

// GET /api/bookings/:bookingId
router.get('/:bookingId', validate(bookingIdSchema, 'params'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.query.sessionId as string | undefined;
    const booking = await getBookingById(req.params.bookingId as string, sessionId);
    res.json(success(booking));
  } catch (e) { next(e); }
});

// GET /api/bookings/:bookingId/ticket
router.get('/:bookingId/ticket', validate(bookingIdSchema, 'params'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.query.sessionId as string | undefined;
    const ticket = await getBookingTicket(req.params.bookingId as string, sessionId);
    res.json(success(ticket));
  } catch (e) { next(e); }
});

export default router;
