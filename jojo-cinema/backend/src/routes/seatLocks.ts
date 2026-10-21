import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../middleware/validate';
import { seatLockSchema, releaseLockSchema, releaseLockBodySchema } from '../validators/schemas';
import { lockSeats, releaseLock, getLockById } from '../services/seatLockService';
import { success } from '../types/api';

const router = Router();

// POST /api/seat-locks
router.post('/', validate(seatLockSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await lockSeats(req.body);
    res.status(201).json(success(result));
  } catch (e) { next(e); }
});

// GET /api/seat-locks/:lockId
router.get('/:lockId', validate(releaseLockSchema, 'params'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lock = await getLockById(req.params.lockId as string);
    res.json(success(lock));
  } catch (e) { next(e); }
});

// POST /api/seat-locks/:lockId/release
router.post('/:lockId/release', validate(releaseLockSchema, 'params'), validate(releaseLockBodySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await releaseLock(req.params.lockId as string, req.body.sessionId);
    res.json(success(result));
  } catch (e) { next(e); }
});

export default router;
