import type { Bot } from 'grammy';
import { logger } from '../../shared/logging/logger.js';

export interface TelegramWebhookConfig {
  baseUrl: string;
  pathSecret: string;
  webhookSecret: string;
}

export async function registerTelegramWebhook(
  bot: Bot,
  config: TelegramWebhookConfig,
): Promise<void> {
  const normalizedBaseUrl = config.baseUrl.replace(/\/+$/, '');
  const webhookUrl = `${normalizedBaseUrl}/webhooks/${config.pathSecret}`;

  await bot.api.setWebhook(webhookUrl, {
    secret_token: config.webhookSecret,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: false,
  });

  // Important: do not log webhookUrl, pathSecret, or webhookSecret.
  logger.info({ event: 'telegram_webhook_registered' }, 'Telegram webhook registered successfully');
}

export async function deleteTelegramWebhookForPolling(bot: Bot): Promise<void> {
  await bot.api.deleteWebhook({
    drop_pending_updates: false,
  });

  logger.info(
    { event: 'telegram_webhook_deleted_for_polling' },
    'Telegram webhook cleared for development polling',
  );
}
