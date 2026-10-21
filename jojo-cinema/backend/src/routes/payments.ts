import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../middleware/validate';
import { checkoutSchema, paymentIdSchema, simulatePaymentSchema } from '../validators/schemas';
import { checkout, getPaymentStatus, simulatePayment, processWebhook } from '../services/paymentService';
import { success } from '../types/api';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { ErrorCodes } from '../types/api';

const router = Router();

// POST /api/payments/checkout
router.post('/checkout', validate(checkoutSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payment = await checkout(req.body);
    res.status(201).json(success({
      paymentId: payment.id,
      bookingId: payment.bookingId,
      status: payment.status,
      amount: Number(payment.amount),
      currency: payment.currency,
      checkoutUrl: `/demo-payment/${payment.id}`,
    }));
  } catch (e) { next(e); }
});

// GET /api/payments/:paymentId/status
router.get('/:paymentId/status', validate(paymentIdSchema, 'params'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payment = await getPaymentStatus(req.params.paymentId as string);
    res.json(success({
      paymentId: payment.id,
      bookingId: payment.bookingId,
      bookingReference: payment.booking.bookingReference,
      status: payment.status,
      amount: Number(payment.amount),
      currency: payment.currency,
      provider: payment.provider,
      updatedAt: payment.updatedAt,
    }));
  } catch (e) { next(e); }
});

// POST /api/payments/:paymentId/simulate — demo mode only
router.post('/:paymentId/simulate', validate(paymentIdSchema, 'params'), validate(simulatePaymentSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!env.DEMO_MODE) {
      throw new AppError(403, ErrorCodes.DEMO_MODE_ONLY, 'Simulation only available in demo mode');
    }
    const payment = await simulatePayment(req.params.paymentId as string, req.body.outcome);
    res.json(success({
      paymentId: payment!.id,
      status: payment!.status,
      bookingId: payment!.bookingId,
    }));
  } catch (e) { next(e); }
});

// POST /api/payments/webhook
router.post('/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-webhook-signature'] as string | undefined;
    const result = await processWebhook(req.body, signature);
    res.json(success(result));
  } catch (e) { next(e); }
});

export default router;
