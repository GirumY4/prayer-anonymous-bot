import { z } from 'zod';

const envSchema = z.object({
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

  MAX_PRAYER_REQUEST_LENGTH: z.coerce.number().int().positive().default(3000),
  REQUEST_RETENTION_DAYS: z.coerce.number().int().positive().default(14),

  // Phase 8 Additions
  // Example: "0 18 * * 5" means Every Friday at 18:00
  WEEKLY_DISPATCH_CRON: z.string().min(1),
  TIMEZONE: z.string().min(1).default('Africa/Addis_Ababa'),
});

export type Env = z.infer<typeof envSchema>;
export const env: Env = envSchema.parse(process.env);
