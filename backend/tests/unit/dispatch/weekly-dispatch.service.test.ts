import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WeeklyDispatchService } from '../../../src/modules/dispatch/weekly-dispatch.service.js';
import type { DispatchRepository } from '../../../src/modules/dispatch/dispatch.repository.js';
import type { PrayerRequestRepository } from '../../../src/modules/prayer-requests/prayer-request.repository.js';
import type { EncryptionService } from '../../../src/modules/security/encryption.service.js';
import type { TelegramMessenger } from '../../../src/modules/telegram/telegram.types.js';
import type { RequestRandomizer } from '../../../src/modules/dispatch/request-randomizer.js';
import type {
  DigestChunker,
  PublishablePrayerRequest,
} from '../../../src/modules/dispatch/digest-chunker.js';
import type { DispatchRecord } from '../../../src/modules/dispatch/dispatch.types.js';
import type { PrayerRequest } from '../../../src/modules/prayer-requests/prayer-request.types.js';

describe('WeeklyDispatchService', () => {
  let mockDispatchRepo: DispatchRepository;
  let mockPrayerRepo: PrayerRequestRepository;
  let mockEncryptionService: EncryptionService;
  let mockTelegramMessenger: TelegramMessenger;
  let mockRandomizer: RequestRandomizer;
  let mockDigestChunker: DigestChunker;
  let service: WeeklyDispatchService;

  beforeEach(() => {
    mockDispatchRepo = {
      create: vi.fn().mockImplementation(async (d: Omit<DispatchRecord, 'id'>) => ({
        id: 'dispatch-id-1',
        ...d,
      })),
      getByWeekKey: vi.fn().mockResolvedValue(null),
      claimRunning: vi.fn().mockResolvedValue(true),
      recordSentChunk: vi.fn().mockResolvedValue(undefined),
      updateStatus: vi.fn().mockResolvedValue(undefined),
    };

    mockPrayerRepo = {
      create: vi.fn(),
      findEligibleForDispatch: vi.fn().mockResolvedValue([]),
      markPublished: vi.fn().mockResolvedValue(0),
      deleteExpired: vi.fn().mockResolvedValue(0),
    };

    mockEncryptionService = {
      encrypt: vi.fn(),
      decrypt: vi.fn().mockReturnValue('Decrypted prayer content'),
    };

    mockTelegramMessenger = {
      sendText: vi.fn().mockResolvedValue({ telegramMessageId: 999 }),
    };

    mockRandomizer = {
      randomize: vi.fn().mockImplementation((items) => items),
    };

    // Mirrors the production chunker contract: one chunk per request, chunk text
    // is derived only from the anonymous request id and the decrypted text.
    mockDigestChunker = {
      chunk: vi.fn().mockImplementation((requests: PublishablePrayerRequest[]) =>
        requests.map((request) => ({
          requestIds: [request.requestId],
          text: `digest:${request.plaintext}`,
        })),
      ),
    };

    service = new WeeklyDispatchService(
      mockDispatchRepo,
      mockPrayerRepo,
      mockEncryptionService,
      mockTelegramMessenger,
      mockRandomizer,
      mockDigestChunker,
      'Africa/Addis_Ababa',
      15,
      4096,
    );
  });

  it('CRITICAL EMPTY-WEEK INVARIANT: If eligibleRequestCount === 0, TelegramMessenger.sendText MUST NOT be called', async () => {
    // Return 0 eligible requests
    vi.mocked(mockPrayerRepo.findEligibleForDispatch).mockResolvedValue([]);

    await service.execute();

    // Verify TelegramMessenger.sendText was NEVER called
    expect(mockTelegramMessenger.sendText).not.toHaveBeenCalled();

    // Verify dispatch status updated to skipped_no_requests
    expect(mockDispatchRepo.updateStatus).toHaveBeenCalledWith(
      expect.stringContaining('DISPATCH-'),
      'skipped_no_requests',
      expect.objectContaining({ eligibleRequestCount: 0 }),
    );
  });

  it('publishes weekly digest successfully when eligible requests exist', async () => {
    const mockRequests: PrayerRequest[] = [
      {
        id: '1',
        requestId: 'PR-A1A1A1A1',
        content: {
          ciphertext: 'c1',
          iv: 'iv1',
          authTag: 'tag1',
          keyVersion: 1,
        },
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        dispatchId: null,
        publishedAt: null,
      },
    ];

    vi.mocked(mockPrayerRepo.findEligibleForDispatch).mockResolvedValue(mockRequests);
    vi.mocked(mockPrayerRepo.markPublished).mockResolvedValue(1);

    await service.execute();

    // 1. Decrypted in memory
    expect(mockEncryptionService.decrypt).toHaveBeenCalledWith(mockRequests[0]?.content);

    // 2. Chunked with the configured Telegram maximum length
    expect(mockDigestChunker.chunk).toHaveBeenCalledWith(
      [{ requestId: 'PR-A1A1A1A1', plaintext: 'Decrypted prayer content' }],
      4096,
    );

    // 3. Sent to Pray Team group
    expect(mockTelegramMessenger.sendText).toHaveBeenCalledTimes(1);
    expect(mockTelegramMessenger.sendText).toHaveBeenCalledWith(
      { type: 'pray_team_group' },
      { text: 'digest:Decrypted prayer content' },
    );

    // 4. Chunk journaled so a re-run cannot re-send it
    expect(mockDispatchRepo.recordSentChunk).toHaveBeenCalledWith(
      expect.stringContaining('DISPATCH-'),
      expect.objectContaining({ telegramMessageId: 999, requestIds: ['PR-A1A1A1A1'] }),
    );

    // 5. Marked as published
    expect(mockPrayerRepo.markPublished).toHaveBeenCalledWith(
      expect.objectContaining({
        requestIds: ['PR-A1A1A1A1'],
      }),
    );

    // 6. Completed
    expect(mockDispatchRepo.updateStatus).toHaveBeenCalledWith(
      expect.stringContaining('DISPATCH-'),
      'completed',
      expect.objectContaining({
        eligibleRequestCount: 1,
      }),
    );
  });

  it('exits safely if dispatch for the week was already processed', async () => {
    vi.mocked(mockDispatchRepo.getByWeekKey).mockResolvedValue({
      id: 'existing-id',
      dispatchId: 'DISPATCH-EXISTING',
      weekKey: '2026-W41',
      collectionStartAt: new Date(),
      collectionEndAt: new Date(),
      scheduledAt: new Date(),
      status: 'completed',
      eligibleRequestCount: 5,
      startedAt: new Date(),
      completedAt: new Date(),
      sentChunks: [],
    });

    await service.execute();

    expect(mockDispatchRepo.claimRunning).not.toHaveBeenCalled();
    expect(mockTelegramMessenger.sendText).not.toHaveBeenCalled();
  });

  it('exits safely if another worker claimed the scheduled dispatch', async () => {
    vi.mocked(mockDispatchRepo.claimRunning).mockResolvedValue(false);

    await service.execute();

    expect(mockPrayerRepo.findEligibleForDispatch).not.toHaveBeenCalled();
    expect(mockTelegramMessenger.sendText).not.toHaveBeenCalled();
  });

  it('does not re-send requests that were already journaled for this week', async () => {
    vi.mocked(mockDispatchRepo.getByWeekKey).mockResolvedValue({
      id: 'existing-id',
      dispatchId: 'DISPATCH-EXISTING',
      weekKey: '2026-W41',
      collectionStartAt: new Date(),
      collectionEndAt: new Date(),
      scheduledAt: new Date(),
      status: 'failed',
      eligibleRequestCount: 1,
      startedAt: new Date(),
      completedAt: null,
      sentChunks: [
        {
          telegramMessageId: 42,
          requestIds: ['PR-ALREADYSENT'],
          sentAt: new Date(),
        },
      ],
    });

    const pending: PrayerRequest[] = [
      {
        id: '1',
        requestId: 'PR-ALREADYSENT',
        content: { ciphertext: 'c1', iv: 'iv1', authTag: 'tag1', keyVersion: 1 },
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        dispatchId: null,
        publishedAt: null,
      },
    ];

    vi.mocked(mockPrayerRepo.findEligibleForDispatch).mockResolvedValue(pending);

    await service.execute();

    // Reconciled from the journal, never sent again
    expect(mockPrayerRepo.markPublished).toHaveBeenCalledWith(
      expect.objectContaining({ requestIds: ['PR-ALREADYSENT'] }),
    );
    expect(mockTelegramMessenger.sendText).not.toHaveBeenCalled();
    expect(mockDispatchRepo.updateStatus).toHaveBeenCalledWith(
      expect.stringContaining('DISPATCH-'),
      'completed',
      expect.objectContaining({ eligibleRequestCount: 1 }),
    );
  });

  it('updates dispatch status to failed if an error occurs during execution', async () => {
    const mockRequests: PrayerRequest[] = [
      {
        id: '1',
        requestId: 'PR-FAIL',
        content: { ciphertext: 'c', iv: 'i', authTag: 't', keyVersion: 1 },
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        dispatchId: null,
        publishedAt: null,
      },
    ];

    vi.mocked(mockPrayerRepo.findEligibleForDispatch).mockResolvedValue(mockRequests);
    vi.mocked(mockTelegramMessenger.sendText).mockRejectedValue(new Error('Network error'));

    await expect(service.execute()).rejects.toThrow('Network error');

    expect(mockDispatchRepo.updateStatus).toHaveBeenCalledWith(
      expect.stringContaining('DISPATCH-'),
      'failed',
      expect.objectContaining({ completedAt: expect.any(Date) }),
    );
  });
});
