import type { Server } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './shared/logging/logger.js';
import { connectDatabase, disconnectDatabase } from './infrastructure/database/mongoose.js';

const app = createApp();

async function startServer(): Promise<void> {
  try {
    // 1. Connect to Database
    await connectDatabase(env.MONGODB_URI);

    // 2. Start HTTP Server
    const server: Server = app.listen(env.PORT, () => {
      logger.info({ event: 'http_server_started', port: env.PORT }, 'HTTP server started');
    });

    // 3. Graceful Shutdown Handler
    const shutdown = async (signal: string): Promise<void> => {
      logger.info({ event: 'shutdown_started', signal }, 'Shutdown initiated');

      server.close(async (error) => {
        if (error) {
          logger.error({ event: 'http_shutdown_failed' }, 'HTTP server shutdown failed');
        } else {
          logger.info({ event: 'http_shutdown_completed' }, 'HTTP server closed');
        }

        try {
          await disconnectDatabase();
          logger.info({ event: 'shutdown_completed' }, 'Shutdown completed successfully');
          process.exit(error ? 1 : 0);
        } catch {
          logger.error({ event: 'db_shutdown_failed' }, 'Database disconnect failed');
          process.exit(1);
        }
      });
    };

    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));
  } catch {
    logger.error({ event: 'startup_failed' }, 'Application failed to start');
    process.exit(1);
  }
}

startServer();
