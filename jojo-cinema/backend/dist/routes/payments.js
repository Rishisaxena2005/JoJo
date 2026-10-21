"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const validate_1 = require("../middleware/validate");
const schemas_1 = require("../validators/schemas");
const paymentService_1 = require("../services/paymentService");
const api_1 = require("../types/api");
const env_1 = require("../config/env");
const errorHandler_1 = require("../middleware/errorHandler");
const api_2 = require("../types/api");
const router = (0, express_1.Router)();
// POST /api/payments/checkout
router.post('/checkout', (0, validate_1.validate)(schemas_1.checkoutSchema), async (req, res, next) => {
    try {
        const payment = await (0, paymentService_1.checkout)(req.body);
        res.status(201).json((0, api_1.success)({
            paymentId: payment.id,
            bookingId: payment.bookingId,
            status: payment.status,
            amount: Number(payment.amount),
            currency: payment.currency,
            checkoutUrl: `/demo-payment/${payment.id}`,
        }));
    }
    catch (e) {
        next(e);
    }
});
// GET /api/payments/:paymentId/status
router.get('/:paymentId/status', (0, validate_1.validate)(schemas_1.paymentIdSchema, 'params'), async (req, res, next) => {
    try {
        const payment = await (0, paymentService_1.getPaymentStatus)(req.params.paymentId);
        res.json((0, api_1.success)({
            paymentId: payment.id,
            bookingId: payment.bookingId,
            bookingReference: payment.booking.bookingReference,
            status: payment.status,
            amount: Number(payment.amount),
            currency: payment.currency,
            provider: payment.provider,
            updatedAt: payment.updatedAt,
        }));
    }
    catch (e) {
        next(e);
    }
});
// POST /api/payments/:paymentId/simulate — demo mode only
router.post('/:paymentId/simulate', (0, validate_1.validate)(schemas_1.paymentIdSchema, 'params'), (0, validate_1.validate)(schemas_1.simulatePaymentSchema), async (req, res, next) => {
    try {
        if (!env_1.env.DEMO_MODE) {
            throw new errorHandler_1.AppError(403, api_2.ErrorCodes.DEMO_MODE_ONLY, 'Simulation only available in demo mode');
        }
        const payment = await (0, paymentService_1.simulatePayment)(req.params.paymentId, req.body.outcome);
        res.json((0, api_1.success)({
            paymentId: payment.id,
            status: payment.status,
            bookingId: payment.bookingId,
        }));
    }
    catch (e) {
        next(e);
    }
});
// POST /api/payments/webhook
router.post('/webhook', async (req, res, next) => {
    try {
        const signature = req.headers['x-webhook-signature'];
        const result = await (0, paymentService_1.processWebhook)(req.body, signature);
        res.json((0, api_1.success)(result));
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=payments.js.map