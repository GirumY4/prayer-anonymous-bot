import type { PrayerRequestRepository } from './prayer-request.repository.js';
import type { EncryptionService } from '../security/encryption.service.js';
import { PrayerRequestValidator } from './prayer-request.validation.js';
import { generateRequestId } from '../../shared/utils/random-id.js';
import { ApplicationError } from '../../shared/errors/application-error.js';
import { ErrorCode } from '../../shared/errors/error-codes.js';
import { logger } from '../../shared/logging/logger.js';

export interface SubmitPrayerRequestResult {
  requestId: string;
}

export class PrayerRequestService {
  private readonly validator: PrayerRequestValidator;

  constructor(
    private readonly repository: PrayerRequestRepository,
    private readonly encryptionService: EncryptionService,
    maxLength: number,
    private readonly retentionDays: number,
    private readonly keyVersion: number,
  ) {
    this.validator = new PrayerRequestValidator(maxLength);
  }

  async submit(text: string): Promise<SubmitPrayerRequestResult> {
    // 1. Validate Input
    const validation = this.validator.validate(text);
    if (!validation.valid) {
      throw new ApplicationError(
        ErrorCode.INVALID_INPUT,
        `Validation failed: ${validation.reason}`,
        400,
      );
    }

    // 2. Generate Anonymous ID
    const requestId = generateRequestId();

    // 3. Encrypt Content
    const encryptedContent = this.encryptionService.encrypt(text, this.keyVersion);

    // 4. Calculate Expiration
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.retentionDays * 24 * 60 * 60 * 1000);

    // 5. Persist
    try {
      await this.repository.create({
        requestId,
        content: encryptedContent,
        status: 'pending',
        createdAt: now,
        expiresAt,
        dispatchId: null,
        publishedAt: null,
      });

      logger.info(
        { event: 'prayer_request_stored', requestId },
        'Prayer request successfully stored',
      );

      return { requestId };
    } catch {
      logger.error({ event: 'prayer_request_storage_failed' }, 'Failed to persist prayer request');
      throw new ApplicationError(ErrorCode.DATABASE_ERROR, 'Failed to store prayer request', 500);
    }
  }
}
