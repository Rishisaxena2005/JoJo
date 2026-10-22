import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { success } from '../types/api';
import { AppError } from '../middleware/errorHandler';
import { isDateInsideTrainScheduleWindow, normalizeRailLocation, TRAIN_SCHEDULE_HORIZON_DAYS, trainAvailabilityStatus } from '../trains/scheduleWindow';

const router = Router();
const stationSchema = z.object({ q: z.string().max(80).optional() });
const searchSchema = z.object({ from: z.string().min(2).max(80), to: z.string().min(2).max(80), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), passengers: z.coerce.number().int().min(1).max(100).default(1) }).refine(input => normalizeRailLocation(input.from) !== normalizeRailLocation(input.to), 'Origin and destination must differ');
const stationWhere = (value: string) => {
  const normalized = normalizeRailLocation(value);
  return { OR: [
    { code: { equals: value, mode: 'insensitive' as const } },
    { name: { equals: value, mode: 'insensitive' as const } },
    { city: { equals: value, mode: 'insensitive' as const } },
    { city: { equals: normalized, mode: 'insensitive' as const } },
  ] };
};
const bookingSchema = z.object({ inventoryId: z.string().uuid(), sessionId: z.string().min(1).max(120), idempotencyKey: z.string().min(8).max(120), passengers: z.array(z.object({
  name: z.string().trim().min(2).max(100), age: z.number().int().min(1).max(120),
  category: z.enum(['ADULT', 'CHILD', 'SENIOR']).default('ADULT'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED']).default('UNSPECIFIED'),
  berthPreference: z.enum(['LOWER', 'MIDDLE', 'UPPER', 'SIDE_LOWER', 'SIDE_UPPER', 'NO_PREFERENCE']).default('NO_PREFERENCE'),
})).min(1).max(100) });

router.get('/stations', async (req, res, next) => {
  try {
    const { q } = stationSchema.parse(req.query);
    const stations = await prisma.railStation.findMany({
      where: q ? { OR: [{ code: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }, { city: { contains: q, mode: 'insensitive' } }] } : undefined,
      orderBy: { code: 'asc' }, take: 30,
    });
    res.json(success(stations));
  } catch (error) { next(error); }
});

router.get('/search', async (req, res, next) => {
  try {
    const args = searchSchema.parse(req.query);
    if (!isDateInsideTrainScheduleWindow(args.date)) {
      throw new AppError(400, 'DATE_OUT_OF_RANGE', `JoJo's sample timetable supports dates from today through ${TRAIN_SCHEDULE_HORIZON_DAYS} days ahead. Please choose a date in that window.`);
    }
    const origin = await prisma.railStation.findFirst({ where: stationWhere(args.from) });
    const destination = await prisma.railStation.findFirst({ where: stationWhere(args.to) });
    if (!origin || !destination) return res.status(404).json({ success: false, data: null, error: { code: 'STATION_NOT_FOUND', message: 'I could not match one of those stations. Search by station name or code.' } });
    const rows = await prisma.trainInventory.findMany({
      where: { originId: origin.id, destinationId: destination.id, journeyDate: new Date(`${args.date}T00:00:00.000Z`), train: { active: true } },
      include: { train: true, origin: true, destination: true }, orderBy: { departureAt: 'asc' },
    });
    res.json(success({ demo: true, notice: `Class-specific sample fares and inventory; dates are seeded up to ${TRAIN_SCHEDULE_HORIZON_DAYS} days ahead. Not live railway availability.`, journeys: rows.map(row => ({ inventoryId: row.id, train: row.train, origin: row.origin, destination: row.destination, journeyDate: row.journeyDate, departureAt: row.departureAt, arrivalAt: row.arrivalAt, durationMinutes: Math.round((row.arrivalAt.getTime() - row.departureAt.getTime()) / 60000), classCode: row.classCode, totalSeats: row.totalSeats, availableSeats: row.availableSeats, requestedPassengers: args.passengers, availabilityStatus: trainAvailabilityStatus(row.availableSeats, args.passengers), farePerPassenger: Number(row.farePerPassenger) })) }));
  } catch (error) { next(error); }
});

router.post('/bookings', async (req, res, next) => {
  try {
    const input = bookingSchema.parse(req.body);
    const existing = await prisma.trainBooking.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing && existing.sessionId === input.sessionId) return res.json(success({ bookingId: existing.id, reference: existing.reference, status: existing.status, totalFare: Number(existing.totalFare) }));
    if (existing) throw new AppError(409, 'IDEMPOTENCY_CONFLICT', 'That booking request key has already been used. Please try again.');
    const result = await prisma.$transaction(async tx => {
      const inventory = await tx.trainInventory.findUnique({ where: { id: input.inventoryId }, include: { train: true, origin: true, destination: true } });
      if (!inventory || !inventory.train.active) throw new AppError(409, 'TRAIN_UNAVAILABLE', 'Selected train option is no longer available.');
      const decrement = await tx.trainInventory.updateMany({ where: { id: inventory.id, availableSeats: { gte: input.passengers.length } }, data: { availableSeats: { decrement: input.passengers.length } } });
      if (!decrement.count) throw new AppError(409, 'INVENTORY_UNAVAILABLE', 'Not enough seats remain in this class. Search again for current options.');
      const reference = `JJ${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const booking = await tx.trainBooking.create({ data: { reference, idempotencyKey: input.idempotencyKey, sessionId: input.sessionId, inventoryId: inventory.id, passengerCount: input.passengers.length, passengers: input.passengers, totalFare: Number(inventory.farePerPassenger) * input.passengers.length } });
      return { booking, inventory };
    });
    res.status(201).json(success({ bookingId: result.booking.id, reference: result.booking.reference, status: result.booking.status, totalFare: Number(result.booking.totalFare), inventory: { train: result.inventory.train, origin: result.inventory.origin, destination: result.inventory.destination, journeyDate: result.inventory.journeyDate, classCode: result.inventory.classCode } }));
  } catch (error) { next(error); }
});

router.post('/bookings/:bookingId/cancel', async (req, res, next) => {
  try {
    const bookingId = z.string().uuid().parse(req.params.bookingId);
    const { sessionId } = z.object({ sessionId: z.string().min(1).max(120) }).parse(req.body);
    const booking = await prisma.trainBooking.findFirst({ where: { id: bookingId, sessionId } });
    if (!booking) return res.status(404).json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Train booking not found for this session.' } });
    if (booking.status !== 'PENDING_PAYMENT') return res.status(409).json({ success: false, data: null, error: { code: 'BOOKING_NOT_CANCELLABLE', message: 'Only a pending demo booking can be cancelled.' } });
    const cancelled = await prisma.$transaction(async tx => {
      const updated = await tx.trainBooking.updateMany({ where: { id: booking.id, sessionId, status: 'PENDING_PAYMENT' }, data: { status: 'CANCELLED' } });
      if (!updated.count) return false;
      await tx.trainInventory.update({ where: { id: booking.inventoryId }, data: { availableSeats: { increment: booking.passengerCount } } });
      return true;
    });
    if (!cancelled) return res.status(409).json({ success: false, data: null, error: { code: 'BOOKING_NOT_CANCELLABLE', message: 'This booking has already been completed or cancelled.' } });
    res.json(success({ reference: booking.reference, status: 'CANCELLED' }));
  } catch (error) { next(error); }
});

router.post('/bookings/:bookingId/pay-demo', async (req, res, next) => {
  try {
    const bookingId = z.string().uuid().parse(req.params.bookingId);
    const body = z.object({ outcome: z.enum(['SUCCESS', 'FAILED']), sessionId: z.string().min(1).max(120) }).parse(req.body);
    const booking = await prisma.trainBooking.findUnique({ where: { id: bookingId }, include: { inventory: true, payment: true } });
    if (!booking) return res.status(404).json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Train booking not found.' } });
    if (booking.sessionId !== body.sessionId) return res.status(404).json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Train booking not found for this session.' } });
    if (booking.status !== 'PENDING_PAYMENT') return res.json(success({ reference: booking.reference, status: booking.status, totalFare: Number(booking.totalFare) }));
    const nextStatus = body.outcome === 'SUCCESS' ? 'CONFIRMED' : 'PAYMENT_FAILED';
    const updated = await prisma.$transaction(async tx => {
      const row = await tx.trainBooking.update({ where: { id: bookingId, status: 'PENDING_PAYMENT' }, data: { status: nextStatus } });
      await tx.trainPayment.upsert({ where: { bookingId }, create: { bookingId, status: body.outcome, outcome: body.outcome }, update: { status: body.outcome, outcome: body.outcome } });
      if (body.outcome === 'FAILED') await tx.trainInventory.update({ where: { id: booking.inventoryId }, data: { availableSeats: { increment: booking.passengerCount } } });
      return row;
    });
    res.json(success({ reference: booking.reference, status: updated.status, totalFare: Number(updated.totalFare), demoPayment: true }));
  } catch (error) { next(error); }
});

router.get('/bookings/:bookingId', async (req, res, next) => {
  try {
    const bookingId = z.string().uuid().parse(req.params.bookingId);
    const sessionId = z.string().min(1).parse(req.query.sessionId);
    const booking = await prisma.trainBooking.findFirst({ where: { id: bookingId, sessionId }, include: { inventory: { include: { train: true, origin: true, destination: true } }, payment: true } });
    if (!booking) return res.status(404).json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Train booking not found for this session.' } });
    res.json(success({ ...booking, totalFare: Number(booking.totalFare), inventory: { ...booking.inventory, farePerPassenger: Number(booking.inventory.farePerPassenger) } }));
  } catch (error) { next(error); }
});

export default router;
