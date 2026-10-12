import { describe, it, expect, vi } from 'vitest';
import { ExpirationCleanupService } from '../../../src/modules/prayer-requests/expiration.service.js';
import type { PrayerRequestRepository } from '../../../src/modules/prayer-requests/prayer-request.repository.js';
import { ApplicationError } from '../../../src/shared/errors/application-error.js';

describe('ExpirationCleanupService', () => {
  it('calls deleteExpired with provided date and returns deleted count', async () => {
    const mockRepo = {
      create: vi.fn(),
      findEligibleForDispatch: vi.fn(),
      markPublished: vi.fn(),
      deleteExpired: vi.fn().mockResolvedValue(5),
    } as unknown as PrayerRequestRepository;

    const service = new ExpirationCleanupService(mockRepo);
    const now = new Date();
    const result = await service.execute(now);

    expect(mockRepo.deleteExpired).toHaveBeenCalledWith(now);
    expect(result.deletedCount).toBe(5);
  });

  it('throws ApplicationError when database operation fails', async () => {
    const mockRepo = {
      deleteExpired: vi.fn().mockRejectedValue(new Error('Mongo connection down')),
    } as unknown as PrayerRequestRepository;

    const service = new ExpirationCleanupService(mockRepo);

    await expect(service.execute(new Date())).rejects.toThrow(ApplicationError);
  });
});
