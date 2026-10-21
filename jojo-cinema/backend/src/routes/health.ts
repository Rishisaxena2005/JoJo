import { Router } from 'express';
import prisma from '../config/database';
import { success } from '../types/api';

const router = Router();

router.get('/', async (_req, res) => {
  res.json(success({ status: 'ok', timestamp: new Date().toISOString() }));
});

router.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json(success({ status: 'ready', database: 'connected', timestamp: new Date().toISOString() }));
  } catch {
    res.status(503).json({ success: false, data: null, error: { code: 'DB_UNAVAILABLE', message: 'Database not ready' } });
  }
});

export default router;
