import { Router } from 'express';
import type { Bot } from 'grammy';
import { createWebhookAuthMiddleware } from '../middleware/webhook-auth.middleware.js';
import { env } from '../config/env.js';
import { logger } from '../shared/logging/logger.js';
import { serializeSafeError } from '../shared/logging/safe-error.js';

export function createTelegramRouter(bot: Bot): Router {
  const router = Router();

  // Verify the Telegram secret BEFORE processing anything.
  router.use(createWebhookAuthMiddleware(env.TELEGRAM_WEBHOOK_SECRET));

  router.post(`/${env.TELEGRAM_WEBHOOK_PATH_SECRET}`, async (req, res) => {
    try {
      await bot.handleUpdate(req.body);
    } catch (err) {
      // Content-free diagnostic. Never log req.body or the update.
      logger.error(
        {
          event: 'telegram_webhook_update_failed',
          ...serializeSafeError(err),
        },
        'Failed to process Telegram update',
      );
    }

    // Always acknowledge to Telegram.
    //
    // Returning 500 makes Telegram retry the same update indefinitely. On a
    // free-tier host that produces a retry storm which wastes wake cycles and
    // inflates pending_update_count without ever succeeding when the failure
    // is deterministic. We therefore acknowledge receipt (200) and rely on the
    // logged diagnostic above to drive the real fix.
    //
    // Tradeoff: if the failure was transient, this update is consumed without
    // a reply and the user must resend. During diagnosis that is acceptable
    // and strictly better than an unbounded retry loop on free infrastructure.
    res.sendStatus(200);
  });

  return router;
}
