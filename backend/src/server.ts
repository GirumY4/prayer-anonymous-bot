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

// Phase 8 Additions
import { SecureRequestRandomizer } from './modules/dispatch/request-randomizer.js';
import { StandardDigestBuilder } from './modules/dispatch/digest-builder.js';
import { TelegramMessageSplitter } from './modules/dispatch/message-splitter.js';
import { WeeklyDispatchService } from './modules/dispatch/weekly-dispatch.service.js';
import { NodeCronScheduler } from './infrastructure/scheduler/scheduler.js';

const app = createApp();

async function startServer(): Promise<void> {
  try {
    await connectDatabase(env.MONGODB_URI);

    // 1. Initialize Core Services
    const i18n = new StaticLocalizationService();
    const sessionStore = new InMemorySessionStore();
    const conversationService = new DefaultConversationService(
      sessionStore,
      15,
      i18n.getDefaultLanguage(),
    );
    const keyboards = new TelegramKeyboards(i18n);

    // 2. Initialize Security & Persistence
    const encryptionKeyBuffer = Buffer.from(env.ENCRYPTION_KEY, 'hex');
    const encryptionService = new AesGcmEncryptionService(encryptionKeyBuffer);
    const prayerRequestRepository = new MongoPrayerRequestRepository();
    const dispatchRepository = new MongoDispatchRepository();

    const prayerRequestService = new PrayerRequestService(
      prayerRequestRepository,
      encryptionService,
      env.MAX_PRAYER_REQUEST_LENGTH,
      env.REQUEST_RETENTION_DAYS,
      env.ENCRYPTION_KEY_VERSION,
    );

    // 3. Initialize Telegram Bot & Adapter
    const bot = new Bot(env.TELEGRAM_BOT_TOKEN);
    const telegramMessenger = new GrammyBotClient(bot);
    const telegramAdapter = new TelegramAdapter(
      conversationService,
      i18n,
      keyboards,
      prayerRequestService,
    );

    bot.on('message', async (ctx) => telegramAdapter.handleUpdate(ctx));
    bot.on('callback_query', async (ctx) => telegramAdapter.handleUpdate(ctx));

    // 4. Initialize Phase 8 Dispatch Pipeline
    const randomizer = new SecureRequestRandomizer();
    const digestBuilder = new StandardDigestBuilder();
    const messageSplitter = new TelegramMessageSplitter();

    const weeklyDispatchService = new WeeklyDispatchService(
      dispatchRepository,
      prayerRequestRepository,
      encryptionService,
      telegramMessenger,
      randomizer,
      digestBuilder,
      messageSplitter,
      env.TIMEZONE,
    );

    const scheduler = new NodeCronScheduler(
      weeklyDispatchService,
      env.WEEKLY_DISPATCH_CRON,
      env.TIMEZONE,
    );

    // 5. Mount Routes & Start Services
    app.use('/webhooks', createTelegramRouter(bot));

    const server: Server = app.listen(env.PORT, () => {
      logger.info({ event: 'http_server_started', port: env.PORT }, 'HTTP server started');
    });

    // Start the background scheduler
    scheduler.start();

    // 6. Graceful Shutdown
    const shutdown = async (signal: string): Promise<void> => {
      logger.info({ event: 'shutdown_started', signal }, 'Shutdown initiated');

      // Stop accepting new cron triggers
      scheduler.stop();

      server.close(async (error) => {
        if (error) logger.error({ event: 'http_shutdown_failed' }, 'HTTP server shutdown failed');
        else logger.info({ event: 'http_shutdown_completed' }, 'HTTP server closed');

        try {
          await bot.stop();
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
