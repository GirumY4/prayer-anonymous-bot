import express, { type Express, type Router } from 'express';
import helmet from 'helmet';

import { healthRouter } from './routes/health.routes.js';
import { notFoundHandler } from './middleware/not-found.middleware.js';
import { errorHandler } from './middleware/error-handler.middleware.js';

export interface AppOptions {
  telegramRouter?: Router;
}

export function createApp(options?: AppOptions): Express {
  const app = express();

  app.disable('x-powered-by');

  app.use(helmet());
  app.use(express.json({ limit: '64kb' }));

  app.use('/health', healthRouter);

  if (options.telegramRouter) {
    app.use('/webhooks', options.telegramRouter);
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
