import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ErrorCodes } from '../types/api';
import { env } from '../config/env';

interface LockSeatsInput {
  showId: string;
  seatIds: string[]; // These are showSeatIds (returned by /shows/:showId/seats)
  sessionId: string;
}

export async function lockSeats(input: LockSeatsInput) {
  const { showId, seatIds, sessionId } = input;

  if (seatIds.length > env.MAX_SEATS_PER_BOOKING) {
    throw new AppError(
      400,
      ErrorCodes.SEAT_LIMIT_EXCEEDED,
      `Maximum ${env.MAX_SEATS_PER_BOOKING} seats per booking`
    );
  }

  const expiresAt = new Date(Date.now() + env.SEAT_LOCK_DURATION_SECONDS * 1000);

  // Use a transaction to atomically check and lock all seats
  return await prisma.$transaction(async tx => {
    // Expire any stale active locks first
    await tx.seatLock.updateMany({
      where: { showId, status: 'ACTIVE', expiresAt: { lt: new Date() } },
      data: { status: 'EXPIRED' },
    });

    // Re-open expired show seats
    await tx.showSeat.updateMany({
      where: {
        showId,
        status: 'LOCKED',
        seatLockSeats: {
          every: {
            seatLock: { status: { in: ['EXPIRED', 'RELEASED'] } },
          },
        },
      },
      data: { status: 'AVAILABLE' },
    });

    // Fetch the requested show seats with a FOR UPDATE lock
    const showSeats = await tx.showSeat.findMany({
      where: { id: { in: seatIds }, showId },
      include: { seat: { select: { seatLabel: true } } },
    });

    // Verify all requested seats exist
    if (showSeats.length !== seatIds.length) {
      const foundIds = showSeats.map(s => s.id);
      const missing = seatIds.filter(id => !foundIds.includes(id));
      throw new AppError(404, ErrorCodes.NOT_FOUND, `Seats not found: ${missing.join(', ')}`);
    }

    // Atomically mark seats as LOCKED only if they are currently AVAILABLE
    const updateResult = await tx.showSeat.updateMany({
      where: { id: { in: seatIds }, showId, status: 'AVAILABLE' },
      data: { status: 'LOCKED' },
    });

    if (updateResult.count !== seatIds.length) {
      throw new AppError(
        409,
        ErrorCodes.SEAT_UNAVAILABLE,
        'One or more selected seats are no longer available'
      );
    }

    // Create the SeatLock record
    const seatLock = await tx.seatLock.create({
      data: {
        showId,
        sessionId,
        expiresAt,
        status: 'ACTIVE',
        seats: {
          create: seatIds.map(showSeatId => ({ showSeatId })),
        },
      },
      include: {
        seats: {
          include: { showSeat: { include: { seat: true } } },
        },
      },
    });

    return {
      lockId: seatLock.id,
      showId: seatLock.showId,
      seatIds: seatLock.seats.map(s => s.showSeatId),
      seatLabels: seatLock.seats.map(s => s.showSeat.seat.seatLabel),
      expiresAt: seatLock.expiresAt,
      status: seatLock.status,
    };
  });
}

export async function releaseLock(lockId: string, sessionId: string) {
  const lock = await prisma.seatLock.findUnique({
    where: { id: lockId },
    include: { seats: true },
  });

  if (!lock) {
    throw new AppError(404, ErrorCodes.LOCK_NOT_FOUND, `Lock not found: ${lockId}`);
  }

  // Already released/expired — idempotent
  if (lock.status !== 'ACTIVE') {
    return { lockId, status: lock.status, message: 'Lock already released or expired' };
  }

  // Authorization check
  if (lock.sessionId !== sessionId) {
    throw new AppError(403, ErrorCodes.LOCK_UNAUTHORIZED, 'Not authorized to release this lock');
  }

  const showSeatIds = lock.seats.map(s => s.showSeatId);

  await prisma.$transaction(async tx => {
    // Release the lock
    await tx.seatLock.update({
      where: { id: lockId },
      data: { status: 'RELEASED' },
    });

    // Only set back to AVAILABLE if they haven't been converted to BOOKED
    await tx.showSeat.updateMany({
      where: { id: { in: showSeatIds }, status: 'LOCKED' },
      data: { status: 'AVAILABLE' },
    });
  });

  return { lockId, status: 'RELEASED' };
}

export async function getLockById(lockId: string) {
  const lock = await prisma.seatLock.findUnique({
    where: { id: lockId },
    include: {
      seats: {
        include: { showSeat: { include: { seat: true } } },
      },
    },
  });

  if (!lock) {
    throw new AppError(404, ErrorCodes.LOCK_NOT_FOUND, `Lock not found: ${lockId}`);
  }

  // Check if the active lock has expired
  if (lock.status === 'ACTIVE' && lock.expiresAt < new Date()) {
    return { ...lock, status: 'EXPIRED' as const };
  }

  return lock;
}
