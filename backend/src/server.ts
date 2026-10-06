import type { Server } from 'node:http';

import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './shared/logging/logger.js';

const app = createApp();

const server: Server = app.listen(env.PORT, () => {
  logger.info(
    {
      event: 'http_server_started',
      port: env.PORT,
    },
    'HTTP server started',
  );
});

function shutdown(signal: string): void {
  logger.info(
    {
      event: 'shutdown_started',
      signal,
    },
    'Shutdown started',
  );

  server.close((error) => {
    if (error) {
      logger.error(
        {
          event: 'shutdown_failed',
        },
        'HTTP server shutdown failed',
      );

      process.exit(1);
    }

    logger.info(
      {
        event: 'shutdown_completed',
      },
      'Shutdown completed',
    );

    process.exit(0);
  });
}

process.once('SIGINT', () => {
  shutdown('SIGINT');
});

process.once('SIGTERM', () => {
  shutdown('SIGTERM');
});
