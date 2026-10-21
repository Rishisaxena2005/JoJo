import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../middleware/validate';
import { showQuerySchema, showIdSchema } from '../validators/schemas';
import { getShows, getShowById, getShowSeats } from '../services/showService';
import { success } from '../types/api';

const router = Router();

// GET /api/shows
router.get('/', validate(showQuerySchema, 'query'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shows = await getShows(req.query as any);
    res.json(success(shows));
  } catch (e) { next(e); }
});

// GET /api/shows/:showId
router.get('/:showId', validate(showIdSchema, 'params'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const show = await getShowById(req.params.showId as string);
    res.json(success(show));
  } catch (e) { next(e); }
});

// GET /api/shows/:showId/seats
router.get('/:showId/seats', validate(showIdSchema, 'params'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const seats = await getShowSeats(req.params.showId as string);
    res.json(success(seats));
  } catch (e) { next(e); }
});

export default router;
