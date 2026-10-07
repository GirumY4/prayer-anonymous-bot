import type { RequestHandler } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { logger } from '../shared/logging/logger.js';

export function createWebhookAuthMiddleware(expectedSecret: string): RequestHandler {
  const expectedSecretBuffer = Buffer.from(expectedSecret, 'utf8');

  return (req, res, next) => {
    const headerSecret = req.header('x-telegram-bot-api-secret-token');

    if (!headerSecret) {
      logger.warn({ event: 'webhook_missing_secret' }, 'Webhook request missing secret token');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const headerSecretBuffer = Buffer.from(headerSecret, 'utf8');

    // Constant-time comparison to prevent timing attacks
    if (
      headerSecretBuffer.length !== expectedSecretBuffer.length ||
      !timingSafeEqual(headerSecretBuffer, expectedSecretBuffer)
    ) {
      logger.warn({ event: 'webhook_invalid_secret' }, 'Webhook request with invalid secret token');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    next();
  };
}
