import { z } from 'zod';

const booleanFromString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    PORT: z.coerce.number().int().positive().default(3000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

    MONGODB_URI: z.string().url({ message: 'MONGODB_URI must be a valid URL' }),

    ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, {
      message: 'ENCRYPTION_KEY must be a 64-character hex string (32 bytes)',
    }),
    ENCRYPTION_KEY_VERSION: z.coerce.number().int().positive().default(1),

    TELEGRAM_BOT_TOKEN: z.string().min(1),
    TELEGRAM_WEBHOOK_SECRET: z.string().min(1).max(256),
    TELEGRAM_WEBHOOK_PATH_SECRET: z.string().min(1),
    PRAY_TEAM_CHAT_ID: z.string().min(1),

    TELEGRAM_REGISTER_WEBHOOK: booleanFromString,
    PUBLIC_BASE_URL: z.string().url().optional(),

    DISPATCH_STALE_MINUTES: z.coerce.number().int().positive().default(15),

    SESSION_TTL_MINUTES: z.coerce.number().int().positive().default(15),

    // Keep this safely below Telegram's 4096-character limit.
    // The digest header, footer, separators, and request ID also consume space.
    MAX_PRAYER_REQUEST_LENGTH: z.coerce.number().int().min(1).max(3000).default(3000),

    REQUEST_RETENTION_DAYS: z.coerce.number().int().positive().default(14),

    WEEKLY_DISPATCH_CRON: z.string().min(1),
    RETENTION_CLEANUP_CRON: z.string().min(1).default('0 * * * *'),
    // Sweeps expired in-memory conversation sessions (which can hold prayer drafts).
    SESSION_CLEANUP_CRON: z.string().min(1).default('*/10 * * * *'),
    TIMEZONE: z.string().min(1).default('Africa/Addis_Ababa'),
  })
  .refine((data) => !data.TELEGRAM_REGISTER_WEBHOOK || Boolean(data.PUBLIC_BASE_URL), {
    message: 'PUBLIC_BASE_URL is required when TELEGRAM_REGISTER_WEBHOOK=true',
    path: ['PUBLIC_BASE_URL'],
  });

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
