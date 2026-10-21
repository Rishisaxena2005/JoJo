import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ErrorCodes } from '../types/api';
import { env } from '../config/env';
import { logger } from '../config/logger';

function generateTicketReference(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `TKT-${ts}-${rand}`;
}

interface CheckoutInput {
  bookingId: string;
  sessionId: string;
  idempotencyKey: string;
}

export async function checkout(input: CheckoutInput) {
  const { bookingId, sessionId, idempotencyKey } = input;

  // Check idempotency — return existing payment if same key
  const existing = await prisma.payment.findUnique({ where: { idempotencyKey } });
  if (existing) {
    if (existing.bookingId !== bookingId) {
      throw new AppError(409, ErrorCodes.DUPLICATE_IDEMPOTENCY, 'Idempotency key used for a different booking');
    }
    return existing;
  }

  // Fetch and validate booking
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    throw new AppError(404, ErrorCodes.BOOKING_NOT_FOUND, `Booking not found: ${bookingId}`);
  }
  if (booking.sessionId !== sessionId) {
    throw new AppError(403, ErrorCodes.FORBIDDEN, 'Access denied');
  }
  if (booking.status === 'CONFIRMED') {
    throw new AppError(409, ErrorCodes.BOOKING_ALREADY_CONFIRMED, 'Booking already confirmed');
  }
  if (booking.status === 'EXPIRED') {
    throw new AppError(409, ErrorCodes.BOOKING_EXPIRED, 'Booking has expired');
  }
  if (!['PENDING_PAYMENT', 'PAYMENT_FAILED'].includes(booking.status)) {
    throw new AppError(409, ErrorCodes.BOOKING_INVALID_STATE, `Cannot checkout booking in ${booking.status} state`);
  }

  // Check booking expiry
  if (booking.expiresAt < new Date()) {
    await prisma.booking.update({ where: { id: bookingId }, data: { status: 'EXPIRED' } });
    throw new AppError(409, ErrorCodes.BOOKING_EXPIRED, 'Booking has expired. Please select seats again');
  }

  // Idempotency: return existing payment if already created
  const existingPayment = await prisma.payment.findUnique({
    where: { idempotencyKey },
  });
  if (existingPayment) {
    return existingPayment;
  }

  // Create payment record with concurrent idempotency handling
  try {
    const payment = await prisma.payment.create({
      data: {
        bookingId,
        provider: 'MOCK',
        providerPaymentId: `mock_pay_${uuidv4()}`,
        amount: booking.totalAmount,
        currency: booking.currency,
        status: 'PENDING',
        idempotencyKey,
      },
    });
    return payment;
  } catch (err: any) {
    if (err?.code === 'P2002') {
      const existing = await prisma.payment.findUnique({
        where: { idempotencyKey },
      });
      if (existing) return existing;
    }
    throw err;
  }
}

export async function getPaymentStatus(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      booking: { select: { bookingReference: true, sessionId: true, status: true } },
    },
  });

  if (!payment) {
    throw new AppError(404, ErrorCodes.PAYMENT_NOT_FOUND, `Payment not found: ${paymentId}`);
  }

  return payment;
}

export async function simulatePayment(paymentId: string, outcome: 'success' | 'failure') {
  if (!env.DEMO_MODE) {
    throw new AppError(403, ErrorCodes.DEMO_MODE_ONLY, 'Payment simulation only available in demo mode');
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { booking: true },
  });

  if (!payment) {
    throw new AppError(404, ErrorCodes.PAYMENT_NOT_FOUND, `Payment not found: ${paymentId}`);
  }

  if (payment.status === 'SUCCESS') {
    throw new AppError(409, ErrorCodes.PAYMENT_ALREADY_PROCESSED, 'Payment already processed successfully');
  }

  if (payment.booking.status === 'EXPIRED') {
    throw new AppError(409, ErrorCodes.BOOKING_EXPIRED, 'Booking has expired');
  }

  if (outcome === 'failure') {
    const updated = await prisma.$transaction(async tx => {
      const p = await tx.payment.update({
        where: { id: paymentId },
        data: { status: 'FAILED' },
      });
      await tx.booking.update({
        where: { id: payment.bookingId },
        data: { status: 'PAYMENT_FAILED' },
      });
      return p;
    });
    return updated;
  }

  // Success path — confirm booking
  return await confirmBookingAfterPayment(paymentId, payment.bookingId);
}

async function confirmBookingAfterPayment(paymentId: string, bookingId: string) {
  return await prisma.$transaction(async tx => {
    // Re-read booking with lock to prevent race conditions
    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new AppError(404, ErrorCodes.BOOKING_NOT_FOUND, 'Booking not found');

    // Idempotent — already confirmed
    if (booking.status === 'CONFIRMED') {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      return payment;
    }

    // Safety: cannot confirm expired booking
    if (booking.status === 'EXPIRED') {
      // Late payment — reconciliation required
      await tx.payment.update({
        where: { id: paymentId },
        data: { status: 'RECONCILIATION_REQUIRED' },
      });
      throw new AppError(409, ErrorCodes.BOOKING_EXPIRED, 'Booking expired before payment completed. Reconciliation required');
    }

    // Update payment to SUCCESS
    const payment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: 'SUCCESS',
        providerEventId: `evt_${uuidv4()}`,
      },
    });

    // Confirm booking
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
    });

    // Generate ticket
    const ticketRef = generateTicketReference();
    const qrToken = `${ticketRef}:${bookingId}:${uuidv4()}`;
    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(qrToken, { width: 256, margin: 2 });
    } catch (e) {
      logger.warn('QR generation failed', { error: e });
      qrDataUrl = qrToken;
    }

    await tx.ticket.create({
      data: {
        bookingId,
        ticketReference: ticketRef,
        qrToken: qrDataUrl,
      },
    });

    logger.info('Booking confirmed', { bookingId, ticketRef });
    return payment;
  });
}

export async function processWebhook(body: Record<string, unknown>, signature?: string) {
  // Mock webhook processing
  const { paymentId, outcome, eventId } = body as {
    paymentId: string;
    outcome: string;
    eventId: string;
  };

  // Deduplication check
  if (eventId) {
    const existing = await prisma.payment.findFirst({
      where: { providerEventId: eventId },
    });
    if (existing) {
      logger.info('Duplicate webhook event ignored', { eventId });
      return { deduplicated: true };
    }
  }

  if (!paymentId) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Missing paymentId in webhook body');
  }

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) {
    throw new AppError(404, ErrorCodes.PAYMENT_NOT_FOUND, `Payment not found: ${paymentId}`);
  }

  if (outcome === 'success' && payment.status === 'PENDING') {
    return confirmBookingAfterPayment(paymentId, payment.bookingId);
  } else if (outcome === 'failure') {
    return prisma.$transaction(async tx => {
      const p = await tx.payment.update({ where: { id: paymentId }, data: { status: 'FAILED' } });
      await tx.booking.update({ where: { id: payment.bookingId }, data: { status: 'PAYMENT_FAILED' } });
      return p;
    });
  }

  return payment;
}
