import { Router } from 'express';
import type { Bot } from 'grammy';
import { createWebhookAuthMiddleware } from '../middleware/webhook-auth.middleware.js';
import { env } from '../config/env.js';
import { logger } from '../shared/logging/logger.js';

export function createTelegramRouter(bot: Bot): Router {
  const router = Router();

  // Apply webhook secret verification
  router.use(createWebhookAuthMiddleware(env.TELEGRAM_WEBHOOK_SECRET));

  router.post(`/${env.TELEGRAM_WEBHOOK_PATH_SECRET}`, async (req, res) => {
    try {
      await bot.handleUpdate(req.body);
      res.sendStatus(200);
    } catch {
      logger.error(
        { event: 'telegram_webhook_processing_failed' },
        'Failed to process Telegram update',
      );
      res.sendStatus(500);
    }
  });

  return router;
}
