"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lockSeats = lockSeats;
exports.releaseLock = releaseLock;
exports.getLockById = getLockById;
const database_1 = __importDefault(require("../config/database"));
const errorHandler_1 = require("../middleware/errorHandler");
const api_1 = require("../types/api");
const env_1 = require("../config/env");
async function lockSeats(input) {
    const { showId, seatIds, sessionId } = input;
    if (seatIds.length > env_1.env.MAX_SEATS_PER_BOOKING) {
        throw new errorHandler_1.AppError(400, api_1.ErrorCodes.SEAT_LIMIT_EXCEEDED, `Maximum ${env_1.env.MAX_SEATS_PER_BOOKING} seats per booking`);
    }
    const expiresAt = new Date(Date.now() + env_1.env.SEAT_LOCK_DURATION_SECONDS * 1000);
    // Use a transaction to atomically check and lock all seats
    return await database_1.default.$transaction(async (tx) => {
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
            throw new errorHandler_1.AppError(404, api_1.ErrorCodes.NOT_FOUND, `Seats not found: ${missing.join(', ')}`);
        }
        // Verify all seats are AVAILABLE
        const unavailable = showSeats.filter(s => s.status !== 'AVAILABLE');
        if (unavailable.length > 0) {
            throw new errorHandler_1.AppError(409, api_1.ErrorCodes.SEAT_UNAVAILABLE, 'One or more selected seats are no longer available', {
                unavailableSeats: unavailable.map(s => ({
                    showSeatId: s.id,
                    seatLabel: s.seat.seatLabel,
                    status: s.status,
                })),
            });
        }
        // Mark seats as LOCKED
        await tx.showSeat.updateMany({
            where: { id: { in: seatIds } },
            data: { status: 'LOCKED' },
        });
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
async function releaseLock(lockId, sessionId) {
    const lock = await database_1.default.seatLock.findUnique({
        where: { id: lockId },
        include: { seats: true },
    });
    if (!lock) {
        throw new errorHandler_1.AppError(404, api_1.ErrorCodes.LOCK_NOT_FOUND, `Lock not found: ${lockId}`);
    }
    // Already released/expired — idempotent
    if (lock.status !== 'ACTIVE') {
        return { lockId, status: lock.status, message: 'Lock already released or expired' };
    }
    // Authorization check
    if (lock.sessionId !== sessionId) {
        throw new errorHandler_1.AppError(403, api_1.ErrorCodes.LOCK_UNAUTHORIZED, 'Not authorized to release this lock');
    }
    const showSeatIds = lock.seats.map(s => s.showSeatId);
    await database_1.default.$transaction(async (tx) => {
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
async function getLockById(lockId) {
    const lock = await database_1.default.seatLock.findUnique({
        where: { id: lockId },
        include: {
            seats: {
                include: { showSeat: { include: { seat: true } } },
            },
        },
    });
    if (!lock) {
        throw new errorHandler_1.AppError(404, api_1.ErrorCodes.LOCK_NOT_FOUND, `Lock not found: ${lockId}`);
    }
    // Check if the active lock has expired
    if (lock.status === 'ACTIVE' && lock.expiresAt < new Date()) {
        return { ...lock, status: 'EXPIRED' };
    }
    return lock;
}
//# sourceMappingURL=seatLockService.js.map