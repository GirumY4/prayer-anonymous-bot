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
      '*.chatId',
      '*.username',
      '*.firstName',
      '*.lastName',
      '*.phoneNumber',
      '*.prayerText',
      '*.draftText',
      '*.plaintext',
      '*.encryptedContent',
      '*.ciphertext',
      '*.iv',
      '*.authTag',
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
