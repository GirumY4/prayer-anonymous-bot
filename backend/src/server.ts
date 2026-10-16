import type { Server } from 'node:http';
import { Bot } from 'grammy';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './shared/logging/logger.js';
import { connectDatabase, disconnectDatabase } from './infrastructure/database/mongoose.js';

// Infrastructure & Modules
import { InMemorySessionStore } from './infrastructure/conversation/in-memory-session.store.js';
import { DefaultConversationService } from './modules/conversation/conversation.service.js';
import { StaticLocalizationService } from './infrastructure/localization/static-localization.service.js';
import { TelegramKeyboards } from './modules/telegram/keyboards.js';
import { TelegramAdapter } from './modules/telegram/telegram.adapter.js';
import { createTelegramRouter } from './routes/telegram.routes.js';
import { AesGcmEncryptionService } from './infrastructure/security/aes-gcm-encryption.service.js';
import { MongoPrayerRequestRepository } from './infrastructure/database/repositories/mongo-prayer-request.repository.js';
import { PrayerRequestService } from './modules/prayer-requests/prayer-request.service.js';
import { GrammyBotClient } from './infrastructure/telegram/grammy-bot.client.js';
import { MongoDispatchRepository } from './infrastructure/database/repositories/mongo-dispatch.repository.js';

// Phase 8 Imports
import { SecureRequestRandomizer } from './modules/dispatch/request-randomizer.js';
import { StandardDigestChunker } from './modules/dispatch/digest-chunker.js';
import { WeeklyDispatchService } from './modules/dispatch/weekly-dispatch.service.js';

// Phase 9 Additions
import { ExpirationCleanupService } from './modules/prayer-requests/expiration.service.js';
import { ApplicationScheduler } from './infrastructure/scheduler/scheduler.js';
import { PrayerRequestValidator } from './modules/prayer-requests/prayer-request.validation.js';

import {
  deleteTelegramWebhookForPolling,
  registerTelegramWebhook,
} from './infrastructure/telegram/telegram-webhook.registrar.js';
import { ApplicationError } from './shared/errors/application-error.js';
import { ErrorCode } from './shared/errors/error-codes.js';
import { serializeSafeError } from './shared/logging/safe-error.js';

async function startServer(): Promise<void> {
  let isPolling = false;

  try {
    await connectDatabase(env.MONGODB_URI);

    // 1. Initialize Core Services
    const i18n = new StaticLocalizationService();
    const sessionStore = new InMemorySessionStore();
    const conversationService = new DefaultConversationService(
      sessionStore,
      env.SESSION_TTL_MINUTES,
      i18n.getDefaultLanguage(),
    );
    const keyboards = new TelegramKeyboards(i18n);

    // 2. Initialize Security & Persistence
    const encryptionKeyBuffer = Buffer.from(env.ENCRYPTION_KEY, 'hex');
    const encryptionService = new AesGcmEncryptionService(encryptionKeyBuffer);
    const prayerRequestRepository = new MongoPrayerRequestRepository();
    const dispatchRepository = new MongoDispatchRepository();
    const prayerRequestValidator = new PrayerRequestValidator(env.MAX_PRAYER_REQUEST_LENGTH);

    const prayerRequestService = new PrayerRequestService(
      prayerRequestRepository,
      encryptionService,
      env.MAX_PRAYER_REQUEST_LENGTH,
      env.REQUEST_RETENTION_DAYS,
      env.ENCRYPTION_KEY_VERSION,
    );

    // 3. Initialize Telegram Bot & Adapter
    const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

    bot.catch((err) => {
      // Content-free. Do not log err.error directly: it may carry the update.
      logger.error(
        {
          event: 'telegram_bot_error',
          ...serializeSafeError(err.error),
        },
        'Error occurred in Telegram bot handler',
      );
    });

    const telegramMessenger = new GrammyBotClient(bot);
    const telegramAdapter = new TelegramAdapter(
      conversationService,
      i18n,
      keyboards,
      prayerRequestService,
      prayerRequestValidator,
    );

    bot.on('message', async (ctx) => telegramAdapter.handleUpdate(ctx));
    bot.on('callback_query', async (ctx) => telegramAdapter.handleUpdate(ctx));

    // 4. Initialize Dispatch Pipeline
    const randomizer = new SecureRequestRandomizer();
    const digestChunker = new StandardDigestChunker();

    const weeklyDispatchService = new WeeklyDispatchService(
      dispatchRepository,
      prayerRequestRepository,
      encryptionService,
      telegramMessenger,
      randomizer,
      digestChunker,
      env.TIMEZONE,
      env.DISPATCH_STALE_MINUTES,
      4096,
    );

    // 5. Initialize Retention Cleanup
    const expirationService = new ExpirationCleanupService(prayerRequestRepository);

    // 6. Initialize Multi-Job Scheduler
    const scheduler = new ApplicationScheduler(
      weeklyDispatchService,
      expirationService,
      {
        weeklyDispatchCron: env.WEEKLY_DISPATCH_CRON,
        retentionCleanupCron: env.RETENTION_CLEANUP_CRON,
        sessionCleanupCron: env.SESSION_CLEANUP_CRON,
        timezone: env.TIMEZONE,
      },
      sessionStore,
    );

    // 7. Mount Routes & Create HTTP App
    const telegramRouter = createTelegramRouter(bot);
    const app = createApp({ telegramRouter });

    // 8. Configure Telegram update delivery
    const shouldUsePolling = env.NODE_ENV === 'development' && !env.TELEGRAM_REGISTER_WEBHOOK;

    if (shouldUsePolling) {
      try {
        await deleteTelegramWebhookForPolling(bot);
        isPolling = true;

        void bot
          .start({
            onStart: (botInfo) => {
              logger.info(
                {
                  event: 'long_polling_started',
                  username: botInfo.username,
                },
                'Bot started in long polling mode for local development',
              );
            },
          })
          .catch((err) => {
            logger.error(
              {
                event: 'long_polling_error',
                err,
              },
              'Long polling error encountered',
            );
          });
      } catch (err) {
        logger.error(
          {
            event: 'delete_webhook_failed',
            err,
          },
          'Failed to clear active webhook prior to development polling',
        );
        throw new ApplicationError(
          ErrorCode.TELEGRAM_WEBHOOK_REGISTRATION_FAILED,
          'Failed to configure Telegram polling mode',
          500,
        );
      }
    } else if (env.TELEGRAM_REGISTER_WEBHOOK) {
      if (!env.PUBLIC_BASE_URL) {
        throw new ApplicationError(
          ErrorCode.TELEGRAM_WEBHOOK_REGISTRATION_FAILED,
          'PUBLIC_BASE_URL is required when TELEGRAM_REGISTER_WEBHOOK is enabled',
          500,
        );
      }

      try {
        await registerTelegramWebhook(bot, {
          baseUrl: env.PUBLIC_BASE_URL,
          pathSecret: env.TELEGRAM_WEBHOOK_PATH_SECRET,
          webhookSecret: env.TELEGRAM_WEBHOOK_SECRET,
        });
      } catch (err) {
        logger.error(
          {
            event: 'telegram_webhook_registration_failed',
            err,
          },
          'Failed to register Telegram webhook',
        );

        throw new ApplicationError(
          ErrorCode.TELEGRAM_WEBHOOK_REGISTRATION_FAILED,
          'Failed to register Telegram webhook',
          500,
        );
      }
    } else {
      const message =
        'Telegram webhook is not registered automatically. Configure it externally before production traffic is accepted.';

      // In production this is fatal to the bot's function (it receives no
      // updates at all), so it must not be buried as a warning.
      if (env.NODE_ENV === 'production') {
        logger.error({ event: 'telegram_webhook_not_registered' }, message);
      } else {
        logger.warn({ event: 'telegram_webhook_not_registered' }, message);
      }
    }

    const server: Server = app.listen(env.PORT, () => {
      logger.info({ event: 'http_server_started', port: env.PORT }, 'HTTP server started');
    });

    // Start background scheduler
    scheduler.start();

    // 9. Graceful Shutdown
    const shutdown = async (signal: string): Promise<void> => {
      logger.info({ event: 'shutdown_started', signal }, 'Shutdown initiated');

      // Stop all scheduled jobs
      scheduler.stop();

      server.close(async (error) => {
        if (error) logger.error({ event: 'http_shutdown_failed' }, 'HTTP server shutdown failed');
        else logger.info({ event: 'http_shutdown_completed' }, 'HTTP server closed');

        try {
          if (isPolling) {
            await bot.stop();
          }
          await disconnectDatabase();
          logger.info({ event: 'shutdown_completed' }, 'Shutdown completed successfully');
          process.exit(error ? 1 : 0);
        } catch {
          logger.error({ event: 'db_shutdown_failed' }, 'Database/Bot disconnect failed');
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
