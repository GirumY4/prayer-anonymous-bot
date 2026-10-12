import type { PrayerRequestRepository } from './prayer-request.repository.js';
import { logger } from '../../shared/logging/logger.js';
import { ApplicationError } from '../../shared/errors/application-error.js';
import { ErrorCode } from '../../shared/errors/error-codes.js';

export interface ExpirationCleanupResult {
  deletedCount: number;
}

export class ExpirationCleanupService {
  constructor(private readonly prayerRepo: PrayerRequestRepository) {}

  async execute(now: Date): Promise<ExpirationCleanupResult> {
    try {
      const deletedCount = await this.prayerRepo.deleteExpired(now);

      if (deletedCount > 0) {
        logger.info(
          { event: 'prayer_request_expired', deletedCount },
          'Expired prayer requests deleted',
        );
      } else {
        logger.info(
          { event: 'retention_cleanup_completed', deletedCount: 0 },
          'Retention cleanup completed with no expired requests',
        );
      }

      return { deletedCount };
    } catch {
      logger.error(
        { event: 'retention_cleanup_failed' },
        'Failed to delete expired prayer requests',
      );

      throw new ApplicationError(ErrorCode.DATABASE_ERROR, 'Retention cleanup failed', 500);
    }
  }
}
