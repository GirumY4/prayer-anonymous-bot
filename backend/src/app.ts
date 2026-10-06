import express, { type Express } from 'express';
import helmet from 'helmet';

import { healthRouter } from './routes/health.routes.js';
import { notFoundHandler } from './middleware/not-found.middleware.js';
import { errorHandler } from './middleware/error-handler.middleware.js';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');

  app.use(helmet());
  app.use(express.json({ limit: '64kb' }));

  app.use('/health', healthRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
