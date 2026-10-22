"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkout = checkout;
exports.getPaymentStatus = getPaymentStatus;
exports.simulatePayment = simulatePayment;
exports.processWebhook = processWebhook;
const uuid_1 = require("uuid");
const qrcode_1 = __importDefault(require("qrcode"));
const database_1 = __importDefault(require("../config/database"));
const errorHandler_1 = require("../middleware/errorHandler");
const api_1 = require("../types/api");
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
function generateTicketReference() {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `TKT-${ts}-${rand}`;
}
async function checkout(input) {
    const { bookingId, sessionId, idempotencyKey } = input;
    // Check idempotency — return existing payment if same key
    const existing = await database_1.default.payment.findUnique({ where: { idempotencyKey } });
    if (existing) {
        if (existing.bookingId !== bookingId) {
            throw new errorHandler_1.AppError(409, api_1.ErrorCodes.DUPLICATE_IDEMPOTENCY, 'Idempotency key used for a different booking');
        }
        return existing;
    }
    // Fetch and validate booking
    const booking = await database_1.default.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
        throw new errorHandler_1.AppError(404, api_1.ErrorCodes.BOOKING_NOT_FOUND, `Booking not found: ${bookingId}`);
    }
    if (booking.sessionId !== sessionId) {
        throw new errorHandler_1.AppError(403, api_1.ErrorCodes.FORBIDDEN, 'Access denied');
    }
    if (booking.status === 'CONFIRMED') {
        throw new errorHandler_1.AppError(409, api_1.ErrorCodes.BOOKING_ALREADY_CONFIRMED, 'Booking already confirmed');
    }
    if (booking.status === 'EXPIRED') {
        throw new errorHandler_1.AppError(409, api_1.ErrorCodes.BOOKING_EXPIRED, 'Booking has expired');
    }
    if (!['PENDING_PAYMENT', 'PAYMENT_FAILED'].includes(booking.status)) {
        throw new errorHandler_1.AppError(409, api_1.ErrorCodes.BOOKING_INVALID_STATE, `Cannot checkout booking in ${booking.status} state`);
    }
    // Check booking expiry
    if (booking.expiresAt < new Date()) {
        await database_1.default.booking.update({ where: { id: bookingId }, data: { status: 'EXPIRED' } });
        throw new errorHandler_1.AppError(409, api_1.ErrorCodes.BOOKING_EXPIRED, 'Booking has expired. Please select seats again');
    }
    // Idempotency: return existing payment if already created
    const existingPayment = await database_1.default.payment.findUnique({
        where: { idempotencyKey },
    });
    if (existingPayment) {
        return existingPayment;
    }
    // Create payment record with concurrent idempotency handling
    try {
        const payment = await database_1.default.payment.create({
            data: {
                bookingId,
                provider: 'MOCK',
                providerPaymentId: `mock_pay_${(0, uuid_1.v4)()}`,
                amount: booking.totalAmount,
                currency: booking.currency,
                status: 'PENDING',
                idempotencyKey,
            },
        });
        return payment;
    }
    catch (err) {
        if (err?.code === 'P2002') {
            const existing = await database_1.default.payment.findUnique({
                where: { idempotencyKey },
            });
            if (existing)
                return existing;
        }
        throw err;
    }
}
async function getPaymentStatus(paymentId) {
    const payment = await database_1.default.payment.findUnique({
        where: { id: paymentId },
        include: {
            booking: { select: { bookingReference: true, sessionId: true, status: true } },
        },
    });
    if (!payment) {
        throw new errorHandler_1.AppError(404, api_1.ErrorCodes.PAYMENT_NOT_FOUND, `Payment not found: ${paymentId}`);
    }
    return payment;
}
async function simulatePayment(paymentId, outcome) {
    if (!env_1.env.DEMO_MODE) {
        throw new errorHandler_1.AppError(403, api_1.ErrorCodes.DEMO_MODE_ONLY, 'Payment simulation only available in demo mode');
    }
    const payment = await database_1.default.payment.findUnique({
        where: { id: paymentId },
        include: { booking: true },
    });
    if (!payment) {
        throw new errorHandler_1.AppError(404, api_1.ErrorCodes.PAYMENT_NOT_FOUND, `Payment not found: ${paymentId}`);
    }
    if (payment.status === 'SUCCESS') {
        throw new errorHandler_1.AppError(409, api_1.ErrorCodes.PAYMENT_ALREADY_PROCESSED, 'Payment already processed successfully');
    }
    if (payment.booking.status === 'EXPIRED') {
        throw new errorHandler_1.AppError(409, api_1.ErrorCodes.BOOKING_EXPIRED, 'Booking has expired');
    }
    if (outcome === 'failure') {
        const updated = await database_1.default.$transaction(async (tx) => {
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
async function confirmBookingAfterPayment(paymentId, bookingId) {
    return await database_1.default.$transaction(async (tx) => {
        // Re-read booking with lock to prevent race conditions
        const booking = await tx.booking.findUnique({ where: { id: bookingId } });
        if (!booking)
            throw new errorHandler_1.AppError(404, api_1.ErrorCodes.BOOKING_NOT_FOUND, 'Booking not found');
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
            throw new errorHandler_1.AppError(409, api_1.ErrorCodes.BOOKING_EXPIRED, 'Booking expired before payment completed. Reconciliation required');
        }
        // Update payment to SUCCESS
        const payment = await tx.payment.update({
            where: { id: paymentId },
            data: {
                status: 'SUCCESS',
                providerEventId: `evt_${(0, uuid_1.v4)()}`,
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
        const qrToken = `${ticketRef}:${bookingId}:${(0, uuid_1.v4)()}`;
        let qrDataUrl = '';
        try {
            qrDataUrl = await qrcode_1.default.toDataURL(qrToken, { width: 256, margin: 2 });
        }
        catch (e) {
            logger_1.logger.warn('QR generation failed', { error: e });
            qrDataUrl = qrToken;
        }
        await tx.ticket.create({
            data: {
                bookingId,
                ticketReference: ticketRef,
                qrToken: qrDataUrl,
            },
        });
        logger_1.logger.info('Booking confirmed', { bookingId, ticketRef });
        return payment;
    });
}
async function processWebhook(body, signature) {
    // Mock webhook processing
    const { paymentId, outcome, eventId } = body;
    // Deduplication check
    if (eventId) {
        const existing = await database_1.default.payment.findFirst({
            where: { providerEventId: eventId },
        });
        if (existing) {
            logger_1.logger.info('Duplicate webhook event ignored', { eventId });
            return { deduplicated: true };
        }
    }
    if (!paymentId) {
        throw new errorHandler_1.AppError(400, api_1.ErrorCodes.VALIDATION_ERROR, 'Missing paymentId in webhook body');
    }
    const payment = await database_1.default.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
        throw new errorHandler_1.AppError(404, api_1.ErrorCodes.PAYMENT_NOT_FOUND, `Payment not found: ${paymentId}`);
    }
    if (outcome === 'success' && payment.status === 'PENDING') {
        return confirmBookingAfterPayment(paymentId, payment.bookingId);
    }
    else if (outcome === 'failure') {
        return database_1.default.$transaction(async (tx) => {
            const p = await tx.payment.update({ where: { id: paymentId }, data: { status: 'FAILED' } });
            await tx.booking.update({ where: { id: payment.bookingId }, data: { status: 'PAYMENT_FAILED' } });
            return p;
        });
    }
    return payment;
}
//# sourceMappingURL=paymentService.js.map