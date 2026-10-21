import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ErrorCodes } from '../types/api';
import { env } from '../config/env';

function generateBookingReference(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `JOJO-${ts}-${rand}`;
}

interface CreateBookingInput {
  showId: string;
  lockId: string;
  sessionId: string;
  seatIds: string[]; // showSeatIds
}

export async function createBooking(input: CreateBookingInput) {
  const { showId, lockId, sessionId, seatIds } = input;

  return await prisma.$transaction(async tx => {
    // 1. Validate lock
    const lock = await tx.seatLock.findUnique({
      where: { id: lockId },
      include: { seats: { include: { showSeat: true } } },
    });

    if (!lock) {
      throw new AppError(404, ErrorCodes.LOCK_NOT_FOUND, 'Seat lock not found');
    }
    if (lock.sessionId !== sessionId) {
      throw new AppError(403, ErrorCodes.LOCK_UNAUTHORIZED, 'Lock belongs to a different session');
    }
    if (lock.showId !== showId) {
      throw new AppError(400, ErrorCodes.LOCK_MISMATCH, 'Lock does not match the requested show');
    }
    if (lock.status !== 'ACTIVE') {
      throw new AppError(409, ErrorCodes.LOCK_EXPIRED, `Lock is ${lock.status}`);
    }
    if (lock.expiresAt < new Date()) {
      throw new AppError(409, ErrorCodes.LOCK_EXPIRED, 'Seat lock has expired. Please select seats again');
    }

    // 2. Verify lock covers exactly the requested seats
    const lockedSeatIds = lock.seats.map(s => s.showSeatId).sort();
    const requestedSeatIds = [...seatIds].sort();
    const matches = lockedSeatIds.length === requestedSeatIds.length &&
      lockedSeatIds.every((id, i) => id === requestedSeatIds[i]);

    if (!matches) {
      throw new AppError(400, ErrorCodes.LOCK_MISMATCH, 'Requested seats do not match lock');
    }

    // 3. Recheck show seat status in DB
    const showSeats = await tx.showSeat.findMany({
      where: { id: { in: seatIds }, showId },
      include: { seat: { select: { seatLabel: true } } },
    });

    const unavailable = showSeats.filter(s => s.status !== 'LOCKED');
    if (unavailable.length > 0) {
      throw new AppError(409, ErrorCodes.SEAT_UNAVAILABLE, 'One or more seats are no longer locked', {
        seats: unavailable.map(s => s.seat.seatLabel),
      });
    }

    // 4. Calculate total from DB prices
    const totalAmount = showSeats.reduce((sum, s) => sum + Number(s.price), 0);

    // 5. Create booking
    const expiresAt = new Date(Date.now() + env.BOOKING_EXPIRY_SECONDS * 1000);
    const booking = await tx.booking.create({
      data: {
        bookingReference: generateBookingReference(),
        sessionId,
        showId,
        status: 'PENDING_PAYMENT',
        totalAmount,
        currency: 'INR',
        expiresAt,
        bookingSeats: {
          create: showSeats.map(ss => ({
            showSeatId: ss.id,
            priceAtBooking: ss.price,
          })),
        },
      },
      include: {
        bookingSeats: {
          include: {
            showSeat: {
              include: {
                seat: { select: { seatLabel: true, rowLabel: true, seatType: true } },
              },
            },
          },
        },
        show: {
          include: {
            movie: { select: { id: true, title: true, posterUrl: true, language: true } },
            screen: {
              include: {
                theatre: { include: { city: true } },
              },
            },
          },
        },
      },
    });

    // 6. Transition show seats to BOOKED
    await tx.showSeat.updateMany({
      where: { id: { in: seatIds } },
      data: { status: 'BOOKED' },
    });

    // 7. Mark lock as CONVERTED
    await tx.seatLock.update({
      where: { id: lockId },
      data: { status: 'CONVERTED' },
    });

    return booking;
  });
}

export async function getBookingById(bookingId: string, sessionId?: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      bookingSeats: {
        include: {
          showSeat: {
            include: {
              seat: { select: { seatLabel: true, rowLabel: true, seatType: true } },
            },
          },
        },
      },
      show: {
        include: {
          movie: true,
          screen: {
            include: { theatre: { include: { city: true } } },
          },
        },
      },
      payments: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, status: true, amount: true, createdAt: true, provider: true },
      },
      ticket: true,
    },
  });

  if (!booking) {
    throw new AppError(404, ErrorCodes.BOOKING_NOT_FOUND, `Booking not found: ${bookingId}`);
  }

  // In demo mode, check session ownership
  if (sessionId && booking.sessionId !== sessionId) {
    throw new AppError(403, ErrorCodes.FORBIDDEN, 'Access denied');
  }

  return booking;
}

export async function getBookingsBySession(sessionId: string, page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [total, bookings] = await Promise.all([
    prisma.booking.count({ where: { sessionId } }),
    prisma.booking.findMany({
      where: { sessionId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        show: {
          include: {
            movie: { select: { id: true, title: true, posterUrl: true, language: true } },
            screen: {
              include: { theatre: { include: { city: true } } },
            },
          },
        },
        bookingSeats: {
          include: { showSeat: { include: { seat: { select: { seatLabel: true } } } } },
        },
        ticket: { select: { ticketReference: true } },
      },
    }),
  ]);

  return {
    items: bookings,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getBookingTicket(bookingId: string, sessionId?: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { ticket: true },
  });

  if (!booking) {
    throw new AppError(404, ErrorCodes.BOOKING_NOT_FOUND, `Booking not found: ${bookingId}`);
  }
  if (sessionId && booking.sessionId !== sessionId) {
    throw new AppError(403, ErrorCodes.FORBIDDEN, 'Access denied');
  }
  if (booking.status !== 'CONFIRMED') {
    throw new AppError(409, ErrorCodes.BOOKING_NOT_CONFIRMED, 'Booking is not confirmed');
  }
  if (!booking.ticket) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'Ticket not generated yet');
  }

  return booking.ticket;
}

export async function expireStaleBookings() {
  const result = await prisma.booking.updateMany({
    where: {
      status: 'PENDING_PAYMENT',
      expiresAt: { lt: new Date() },
    },
    data: { status: 'EXPIRED' },
  });

  return result.count;
}
