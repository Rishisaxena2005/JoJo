import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../middleware/validate';
import { ticketRefSchema } from '../validators/schemas';
import prisma from '../config/database';
import { success, failure } from '../types/api';

const router = Router();

// GET /api/tickets/:ticketReference/verify
router.get('/:ticketReference/verify', validate(ticketRefSchema, 'params'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { ticketReference: req.params.ticketReference as string },
      include: {
        booking: {
          select: {
            status: true,
            show: {
              select: {
                startTime: true,
                movie: { select: { title: true } },
                screen: {
                  select: {
                    name: true,
                    theatre: { select: { name: true, city: { select: { name: true } } } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!ticket) {
      res.status(404).json(failure('TICKET_NOT_FOUND', 'Ticket not found'));
      return;
    }

    if (ticket.booking.status !== 'CONFIRMED') {
      res.status(409).json(failure('TICKET_INVALID', 'Ticket is not valid'));
      return;
    }

    res.json(success({
      valid: true,
      ticketReference: ticket.ticketReference,
      movie: ticket.booking.show.movie.title,
      theatre: ticket.booking.show.screen.theatre.name,
      city: ticket.booking.show.screen.theatre.city.name,
      showTime: ticket.booking.show.startTime,
      issuedAt: ticket.issuedAt,
    }));
  } catch (e) { next(e); }
});

export default router;
