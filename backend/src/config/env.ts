import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  MONGODB_URI: z.string().url({ message: 'MONGODB_URI must be a valid URL' }),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
