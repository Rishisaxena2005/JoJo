import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../middleware/validate';
import { movieQuerySchema, movieIdSchema } from '../validators/schemas';
import { getMovies, getMovieById } from '../services/movieService';
import { success } from '../types/api';
import prisma from '../config/database';

const router = Router();

// GET /api/movies
router.get('/', validate(movieQuerySchema, 'query'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await getMovies(req.query as any);
    res.json(success(result));
  } catch (e) { next(e); }
});

// GET /api/movies/cities — list all cities
router.get('/cities', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const cities = await prisma.city.findMany({ orderBy: { name: 'asc' } });
    res.json(success(cities));
  } catch (e) { next(e); }
});

// GET /api/movies/:movieId
router.get('/:movieId', validate(movieIdSchema, 'params'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const movie = await getMovieById(req.params.movieId as string);
    res.json(success(movie));
  } catch (e) { next(e); }
});

export default router;
