import mongoose from 'mongoose';
import { logger } from '../../shared/logging/logger.js';

export async function connectDatabase(uri: string): Promise<void> {
  try {
    await mongoose.connect(uri);
    logger.info({ event: 'database_connected' }, 'MongoDB connected successfully');
  } catch (error) {
    logger.error({ event: 'database_connection_failed', err: error }, 'Failed to connect to MongoDB');
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  logger.info({ event: 'database_disconnected' }, 'MongoDB disconnected safely');
}
