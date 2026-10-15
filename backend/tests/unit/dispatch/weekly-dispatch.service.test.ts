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
import type {
  DispatchRecord,
  DispatchStatus,
  SentDispatchChunk,
} from '../../../src/modules/dispatch/dispatch.types.js';
import type { PrayerRequest } from '../../../src/modules/prayer-requests/prayer-request.types.js';

describe('WeeklyDispatchService', () => {
  let mockDispatchRepo: DispatchRepository;
  let mockPrayerRepo: PrayerRequestRepository;
  let mockEncryptionService: EncryptionService;
  let mockTelegramMessenger: TelegramMessenger;
  let mockRandomizer: RequestRandomizer;
  let mockDigestChunker: DigestChunker;
  let service: WeeklyDispatchService;
  let createdDispatches: Map<string, DispatchRecord>;

  const createMockPrayerRequest = (
    requestId: string,
    overrides?: Partial<PrayerRequest>,
  ): PrayerRequest => ({
    id: `db-${requestId}`,
    requestId,
    content: {
      ciphertext: `cipher-${requestId}`,
      iv: 'iv',
      authTag: 'authTag',
      keyVersion: 1,
    },
    status: 'pending',
    createdAt: new Date('2026-10-15T10:00:00Z'),
    expiresAt: new Date('2026-10-29T10:00:00Z'),
    dispatchId: null,
    publishedAt: null,
    ...overrides,
  });

  beforeEach(() => {
    createdDispatches = new Map<string, DispatchRecord>();

    mockDispatchRepo = {
      create: vi.fn().mockImplementation(async (d: Omit<DispatchRecord, 'id'>) => {
        const record: DispatchRecord = {
          id: `dispatch-id-${d.occurrenceKey}`,
          ...d,
          sentChunks: [...d.sentChunks],
        };
        createdDispatches.set(d.occurrenceKey, record);
        return record;
      }),
      getByOccurrenceKey: vi.fn().mockImplementation(async (key: string) => {
        return createdDispatches.get(key) ?? null;
      }),
      getByWeekKey: vi.fn().mockImplementation(async (key: string) => {
        return createdDispatches.get(key) ?? null;
      }),
      claimRunning: vi.fn().mockResolvedValue(true),
      recordSentChunk: vi
        .fn()
        .mockImplementation(async (dispatchId: string, chunk: SentDispatchChunk) => {
          for (const record of createdDispatches.values()) {
            if (record.dispatchId === dispatchId) {
              record.sentChunks.push(chunk);
            }
          }
        }),
      updateStatus: vi
        .fn()
        .mockImplementation(
          async (
            dispatchId: string,
            status: DispatchStatus,
            updates?: Partial<
              Pick<DispatchRecord, 'eligibleRequestCount' | 'startedAt' | 'completedAt'>
            >,
          ) => {
            for (const record of createdDispatches.values()) {
              if (record.dispatchId === dispatchId) {
                record.status = status;
                if (updates) {
                  Object.assign(record, updates);
                }
              }
            }
          },
        ),
    };

    mockPrayerRepo = {
      create: vi.fn(),
      findEligibleForDispatch: vi.fn().mockResolvedValue([]),
      markPublished: vi.fn().mockResolvedValue(0),
      deleteExpired: vi.fn().mockResolvedValue(0),
    };

    mockEncryptionService = {
      encrypt: vi.fn(),
      decrypt: vi.fn().mockImplementation((c) => `Decrypted ${c.ciphertext}`),
    };

    mockTelegramMessenger = {
      sendText: vi.fn().mockResolvedValue({ telegramMessageId: 999 }),
    };

    mockRandomizer = {
      randomize: vi.fn().mockImplementation((items) => items),
    };

    // Mirrors the production chunker contract: one chunk per request
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

  describe('Required Scheduling & Occurrence Scenarios', () => {
    /**
     * Test 1: Multiple dispatch occurrences in the same ISO week
     * Sunday (2026-10-18), Wednesday (2026-10-21), and Friday (2026-10-23)
     * all fall into ISO week 2026-W42.
     * The service must create three distinct dispatch records with date-based IDs
     * and must not skip Wednesday or Friday as already processed.
     */
    it('Test 1: Multiple dispatch occurrences in the same ISO week (Sunday, Wednesday, Friday)', async () => {
      const sunday = new Date('2026-10-18T15:00:00Z'); // 18:00 Addis Ababa
      const wednesday = new Date('2026-10-21T15:00:00Z');
      const friday = new Date('2026-10-23T15:00:00Z');

      const reqSun = createMockPrayerRequest('PR-SUN');
      const reqWed = createMockPrayerRequest('PR-WED');
      const reqFri = createMockPrayerRequest('PR-FRI');

      // Sunday execution
      vi.mocked(mockPrayerRepo.findEligibleForDispatch).mockResolvedValueOnce([reqSun]);
      await service.execute(sunday);

      expect(createdDispatches.has('2026-10-18')).toBe(true);
      expect(createdDispatches.get('2026-10-18')?.dispatchId).toBe('DISPATCH-2026-10-18');
      expect(createdDispatches.get('2026-10-18')?.status).toBe('completed');
      expect(mockTelegramMessenger.sendText).toHaveBeenCalledTimes(1);

      // Wednesday execution (must NOT be treated as already processed)
      vi.mocked(mockPrayerRepo.findEligibleForDispatch).mockResolvedValueOnce([reqWed]);
      await service.execute(wednesday);

      expect(createdDispatches.has('2026-10-21')).toBe(true);
      expect(createdDispatches.get('2026-10-21')?.dispatchId).toBe('DISPATCH-2026-10-21');
      expect(createdDispatches.get('2026-10-21')?.status).toBe('completed');
      expect(mockTelegramMessenger.sendText).toHaveBeenCalledTimes(2);

      // Friday execution (must NOT be treated as already processed)
      vi.mocked(mockPrayerRepo.findEligibleForDispatch).mockResolvedValueOnce([reqFri]);
      await service.execute(friday);

      expect(createdDispatches.has('2026-10-23')).toBe(true);
      expect(createdDispatches.get('2026-10-23')?.dispatchId).toBe('DISPATCH-2026-10-23');
      expect(createdDispatches.get('2026-10-23')?.status).toBe('completed');
      expect(mockTelegramMessenger.sendText).toHaveBeenCalledTimes(3);

      // Verify all three distinct dispatch records exist
      expect(mockDispatchRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          dispatchId: 'DISPATCH-2026-10-18',
          occurrenceKey: '2026-10-18',
        }),
      );
      expect(mockDispatchRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          dispatchId: 'DISPATCH-2026-10-21',
          occurrenceKey: '2026-10-21',
        }),
      );
      expect(mockDispatchRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          dispatchId: 'DISPATCH-2026-10-23',
          occurrenceKey: '2026-10-23',
        }),
      );
    });

    /**
     * Test 2: Same-day duplicate execution prevention
     * Given a dispatch occurrence for a specific date has completed,
     * running again on the same date must not republish or send duplicate messages.
     */
    it('Test 2: Same-day duplicate execution prevention', async () => {
      const date = new Date('2026-10-18T15:00:00Z');
      const req = createMockPrayerRequest('PR-DUP-1');

      vi.mocked(mockPrayerRepo.findEligibleForDispatch).mockResolvedValueOnce([req]);

      // First run: completes successfully
      await service.execute(date);
      expect(mockTelegramMessenger.sendText).toHaveBeenCalledTimes(1);
      expect(createdDispatches.get('2026-10-18')?.status).toBe('completed');

      // Reset spy call counts to isolate the second run
      vi.mocked(mockTelegramMessenger.sendText).mockClear();
      vi.mocked(mockPrayerRepo.markPublished).mockClear();
      vi.mocked(mockDispatchRepo.claimRunning).mockClear();

      // Second run on the same date
      await service.execute(date);

      // Verification: no claiming, no queries, no Telegram messages sent
      expect(mockDispatchRepo.claimRunning).not.toHaveBeenCalled();
      expect(mockTelegramMessenger.sendText).not.toHaveBeenCalled();
      expect(mockPrayerRepo.markPublished).not.toHaveBeenCalled();
    });

    /**
     * Test 3: Empty-day silence
     * If there are zero eligible pending prayer requests, the system must send
     * nothing to the Pray Team Telegram group and update status to skipped_no_requests.
     */
    it('Test 3: Empty-day silence (sendText never called on zero eligible requests)', async () => {
      const date = new Date('2026-10-18T15:00:00Z');
      vi.mocked(mockPrayerRepo.findEligibleForDispatch).mockResolvedValue([]);

      await service.execute(date);

      // TelegramMessenger.sendText is NEVER called
      expect(mockTelegramMessenger.sendText).not.toHaveBeenCalled();

      // Dispatch status is set to skipped_no_requests
      expect(createdDispatches.get('2026-10-18')?.status).toBe('skipped_no_requests');
      expect(mockDispatchRepo.updateStatus).toHaveBeenCalledWith(
        'DISPATCH-2026-10-18',
        'skipped_no_requests',
        expect.objectContaining({ eligibleRequestCount: 0 }),
      );
    });

    /**
     * Test 4: Pending requests survive a missed dispatch
     * A pending request that was not published during a previous dispatch
     * is eligible again during a later dispatch and is published only once.
     */
    it('Test 4: Pending requests survive a missed dispatch and publish only once', async () => {
      const survivorRequest = createMockPrayerRequest('PR-SURVIVOR');
      let isPublished = false;

      // Mock repository behavior where request is returned while pending,
      // and filtered out once published.
      vi.mocked(mockPrayerRepo.findEligibleForDispatch).mockImplementation(async () => {
        return isPublished ? [] : [survivorRequest];
      });

      vi.mocked(mockPrayerRepo.markPublished).mockImplementation(async () => {
        isPublished = true;
        survivorRequest.status = 'published';
        return 1;
      });

      // Wednesday execution (after Sunday was missed)
      const wednesday = new Date('2026-10-21T15:00:00Z');
      await service.execute(wednesday);

      expect(mockTelegramMessenger.sendText).toHaveBeenCalledTimes(1);
      expect(mockPrayerRepo.markPublished).toHaveBeenCalledWith(
        expect.objectContaining({
          requestIds: ['PR-SURVIVOR'],
          dispatchId: 'DISPATCH-2026-10-21',
        }),
      );

      // Friday execution
      const friday = new Date('2026-10-23T15:00:00Z');
      await service.execute(friday);

      // survivorRequest is now published, so Friday sends nothing (empty-day silence)
      expect(mockTelegramMessenger.sendText).toHaveBeenCalledTimes(1); // Still 1 from Wednesday
      expect(createdDispatches.get('2026-10-23')?.status).toBe('skipped_no_requests');
    });

    /**
     * Test 5: Expired requests are not published
     * A request that has expired is not selected and not published.
     */
    it('Test 5: Expired requests are not selected or published', async () => {
      const executionDate = new Date('2026-10-18T15:00:00Z');

      const expiredRequest = createMockPrayerRequest('PR-EXPIRED', {
        expiresAt: new Date('2026-10-17T12:00:00Z'), // Expired prior to execution
      });

      // The repository contract filters: expiresAt > input.now
      vi.mocked(mockPrayerRepo.findEligibleForDispatch).mockImplementation(async ({ now }) => {
        const pool = [expiredRequest];
        return pool.filter((r) => r.status === 'pending' && r.expiresAt > now);
      });

      await service.execute(executionDate);

      expect(mockTelegramMessenger.sendText).not.toHaveBeenCalled();
      expect(mockPrayerRepo.markPublished).not.toHaveBeenCalled();
      expect(createdDispatches.get('2026-10-18')?.status).toBe('skipped_no_requests');
    });

    /**
     * Test 6: Partial dispatch failure recovery
     * When a multi-chunk digest partially succeeds and then fails,
     * retrying must not duplicate the already journaled chunk and only send remaining chunks.
     */
    it('Test 6: Partial dispatch failure recovery with chunk journaling', async () => {
      const executionDate = new Date('2026-10-18T15:00:00Z');
      const req1 = createMockPrayerRequest('PR-1');
      const req2 = createMockPrayerRequest('PR-2');

      // Chunker returns 2 separate chunks (one for each request)
      vi.mocked(mockDigestChunker.chunk).mockImplementation(
        (requests: PublishablePrayerRequest[]) =>
          requests.map((r) => ({
            requestIds: [r.requestId],
            text: `chunk:${r.requestId}`,
          })),
      );

      // First run: chunk 1 succeeds (telegramMessageId: 101), chunk 2 fails with network error
      vi.mocked(mockPrayerRepo.findEligibleForDispatch).mockResolvedValue([req1, req2]);
      vi.mocked(mockTelegramMessenger.sendText)
        .mockResolvedValueOnce({ telegramMessageId: 101 })
        .mockRejectedValueOnce(new Error('Network error on message 2'));

      await expect(service.execute(executionDate)).rejects.toThrow('Network error on message 2');

      const failedRecord = createdDispatches.get('2026-10-18');
      expect(failedRecord?.status).toBe('failed');
      expect(failedRecord?.sentChunks).toHaveLength(1);
      expect(failedRecord?.sentChunks[0]?.requestIds).toEqual(['PR-1']);
      expect(mockTelegramMessenger.sendText).toHaveBeenCalledTimes(2);

      // Reset sendText spy to observe retry behavior
      vi.mocked(mockTelegramMessenger.sendText).mockReset();
      vi.mocked(mockTelegramMessenger.sendText).mockResolvedValue({ telegramMessageId: 102 });

      // Retry run on the same dispatch occurrence
      await service.execute(executionDate);

      // Reconciles PR-1 from journal so it's not sent again
      expect(mockPrayerRepo.markPublished).toHaveBeenCalledWith(
        expect.objectContaining({ requestIds: ['PR-1'], dispatchId: 'DISPATCH-2026-10-18' }),
      );

      // Only PR-2 should be chunked and sent in the retry
      expect(mockTelegramMessenger.sendText).toHaveBeenCalledTimes(1);
      expect(mockTelegramMessenger.sendText).toHaveBeenCalledWith(
        { type: 'pray_team_group' },
        { text: 'chunk:PR-2' },
      );

      // Dispatch completes with both chunks journaled and eligibleRequestCount = 2
      const completedRecord = createdDispatches.get('2026-10-18');
      expect(completedRecord?.status).toBe('completed');
      expect(completedRecord?.eligibleRequestCount).toBe(2);
      expect(completedRecord?.sentChunks).toHaveLength(2);
    });
  });

  describe('Concurrency & Failure Invariants', () => {
    it('exits safely if another worker claimed the scheduled dispatch', async () => {
      vi.mocked(mockDispatchRepo.claimRunning).mockResolvedValue(false);

      await service.execute();

      expect(mockPrayerRepo.findEligibleForDispatch).not.toHaveBeenCalled();
      expect(mockTelegramMessenger.sendText).not.toHaveBeenCalled();
    });

    it('updates dispatch status to failed if an unhandled error occurs during execution', async () => {
      const mockRequests = [createMockPrayerRequest('PR-FAIL')];

      vi.mocked(mockPrayerRepo.findEligibleForDispatch).mockResolvedValue(mockRequests);
      vi.mocked(mockTelegramMessenger.sendText).mockRejectedValue(new Error('Unexpected error'));

      await expect(service.execute()).rejects.toThrow('Unexpected error');

      expect(mockDispatchRepo.updateStatus).toHaveBeenCalledWith(
        expect.stringContaining('DISPATCH-'),
        'failed',
        expect.objectContaining({ completedAt: expect.any(Date) }),
      );
    });
  });
});
