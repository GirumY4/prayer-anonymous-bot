import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  MONGODB_URI: z.string().url({ message: 'MONGODB_URI must be a valid URL' }),

  // Phase 3 Additions
  ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, {
    message: 'ENCRYPTION_KEY must be a 64-character hex string (32 bytes)',
  }),
  ENCRYPTION_KEY_VERSION: z.coerce.number().int().positive().default(1),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(1).max(256),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
