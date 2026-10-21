import './config/env'; // Validate env first
import app from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import prisma from './config/database';

const PORT = env.PORT;

async function startServer() {
  try {
    // Verify DB connection
    try {
      await prisma.$connect();
      logger.info('✅ Supabase PostgreSQL connected');
    } catch (dbErr: any) {
      logger.warn('⚠️  Could not connect to Supabase PostgreSQL: ' + (dbErr?.message || dbErr));
      logger.warn('👉 Please update DATABASE_URL & DIRECT_URL in backend/.env with your Supabase credentials.');
      logger.warn('   Once updated, run: npm run db:push && npm run db:seed');
    }

    const server = app.listen(PORT, () => {
      logger.info(`🎬 JoJo Cinema API running on port ${PORT}`);
      logger.info(`   Environment: ${env.NODE_ENV}`);
      logger.info(`   Demo mode: ${env.DEMO_MODE}`);
      logger.info(`   API docs & endpoints: http://localhost:${PORT}/api`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received — shutting down gracefully`);
      server.close(async () => {
        await prisma.$disconnect();
        logger.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (err) {
    logger.error('Failed to start server', { error: err });
    await prisma.$disconnect();
    process.exit(1);
  }
}

startServer();
