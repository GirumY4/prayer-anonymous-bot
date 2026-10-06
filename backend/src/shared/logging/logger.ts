import pino from 'pino';
import { env } from '../../config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["x-telegram-bot-api-secret-token"]',
      '*.telegramUserId',
      '*.telegramChatId',
      '*.username',
      '*.firstName',
      '*.lastName',
      '*.phoneNumber',
      '*.prayerText',
      '*.encryptedContent',
      '*.password',
      '*.token',
      '*.secret',
      '*.apiKey',
      '*.authorization',
      '*.cookie',
    ],
    censor: '[REDACTED]',
  },
});
