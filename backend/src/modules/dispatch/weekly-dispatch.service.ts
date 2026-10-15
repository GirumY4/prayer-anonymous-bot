import { DateTime } from 'luxon';
import type { DispatchRepository } from './dispatch.repository.js';
import type { PrayerRequestRepository } from '../prayer-requests/prayer-request.repository.js';
import type { EncryptionService } from '../security/encryption.service.js';
import type { TelegramMessenger } from '../telegram/telegram.types.js';
import type { RequestRandomizer } from './request-randomizer.js';
import type { DigestChunker } from './digest-chunker.js';
import { logger } from '../../shared/logging/logger.js';

export class WeeklyDispatchService {
  constructor(
    private readonly dispatchRepo: DispatchRepository,
    private readonly prayerRepo: PrayerRequestRepository,
    private readonly encryptionService: EncryptionService,
    private readonly telegramMessenger: TelegramMessenger,
    private readonly randomizer: RequestRandomizer,
    private readonly digestChunker: DigestChunker,
    private readonly timezone: string,
    private readonly dispatchStaleMinutes: number,
    private readonly telegramMaxLength: number = 4096,
  ) {}

  async execute(executionDate?: Date | DateTime): Promise<void> {
    const now = (
      executionDate
        ? executionDate instanceof DateTime
          ? executionDate
          : DateTime.fromJSDate(executionDate)
        : DateTime.now()
    ).setZone(this.timezone);

    // Use date-based occurrence key (yyyy-LL-dd) to allow multiple dispatches
    // per ISO calendar week (e.g. Sunday, Wednesday, Friday) without collision.
    const occurrenceKey = now.toFormat('yyyy-LL-dd');
    const dispatchId = `DISPATCH-${occurrenceKey}`;

    logger.info(
      { event: 'weekly_dispatch_started', occurrenceKey, dispatchId },
      'Weekly dispatch started',
    );

    // 1. Create or fetch dispatch record
    let dispatch = await this.dispatchRepo.getByOccurrenceKey(occurrenceKey);

    if (!dispatch) {
      try {
        dispatch = await this.dispatchRepo.create({
          dispatchId,
          occurrenceKey,
          weekKey: occurrenceKey,
          collectionStartAt: now.minus({ days: 7 }).toJSDate(),
          collectionEndAt: now.toJSDate(),
          scheduledAt: now.toJSDate(),
          status: 'scheduled',
          eligibleRequestCount: 0,
          startedAt: null,
          completedAt: null,
          sentChunks: [],
        });
      } catch {
        dispatch = await this.dispatchRepo.getByOccurrenceKey(occurrenceKey);
      }
    }

    if (!dispatch) {
      logger.error(
        { event: 'weekly_dispatch_record_unavailable', occurrenceKey, dispatchId },
        'Dispatch record could not be created or loaded',
      );
      return;
    }

    if (dispatch.status === 'completed' || dispatch.status === 'skipped_no_requests') {
      logger.info(
        {
          event: 'weekly_dispatch_already_finalized',
          occurrenceKey,
          dispatchId: dispatch.dispatchId,
          status: dispatch.status,
        },
        'Weekly dispatch already finalized',
      );
      return;
    }

    // 2. Atomic claim
    const staleBefore = new Date(Date.now() - this.dispatchStaleMinutes * 60 * 1000);

    const claimed = await this.dispatchRepo.claimRunning(dispatch.dispatchId, staleBefore);

    if (!claimed) {
      logger.info(
        { event: 'weekly_dispatch_claim_failed', occurrenceKey, dispatchId: dispatch.dispatchId },
        'Failed to claim running state',
      );
      return;
    }

    try {
      // 3. Reconcile previously journaled chunks
      const journaledRequestIds = new Set(dispatch.sentChunks.flatMap((chunk) => chunk.requestIds));

      if (journaledRequestIds.size > 0) {
        await this.prayerRepo.markPublished({
          requestIds: Array.from(journaledRequestIds),
          dispatchId: dispatch.dispatchId,
          publishedAt: new Date(),
        });

        logger.info(
          {
            event: 'weekly_dispatch_journal_reconciled',
            occurrenceKey,
            dispatchId: dispatch.dispatchId,
            count: journaledRequestIds.size,
          },
          'Previously journaled dispatch chunks reconciled',
        );
      }

      // 4. Find eligible requests using the original collection cutoff
      const eligibleRequests = await this.prayerRepo.findEligibleForDispatch({
        collectionEndAt: dispatch.collectionEndAt,
        now: now.toJSDate(),
      });

      const remainingRequests = eligibleRequests.filter(
        (request) => !journaledRequestIds.has(request.requestId),
      );

      // 5. CRITICAL EMPTY-WEEK RULE
      if (remainingRequests.length === 0) {
        if (journaledRequestIds.size > 0) {
          await this.dispatchRepo.updateStatus(dispatch.dispatchId, 'completed', {
            eligibleRequestCount: journaledRequestIds.size,
            completedAt: new Date(),
          });

          logger.info(
            {
              event: 'weekly_dispatch_completed_from_journal',
              occurrenceKey,
              dispatchId: dispatch.dispatchId,
              count: journaledRequestIds.size,
            },
            'Weekly dispatch completed from journal without new sends',
          );
        } else {
          await this.dispatchRepo.updateStatus(dispatch.dispatchId, 'skipped_no_requests', {
            eligibleRequestCount: 0,
            completedAt: new Date(),
          });

          logger.info(
            {
              event: 'weekly_dispatch_skipped_no_requests',
              occurrenceKey,
              dispatchId: dispatch.dispatchId,
            },
            'No eligible requests. Nothing sent to Pray Team group.',
          );
        }

        return;
      }

      // 6. Decrypt temporarily in memory
      const publishable = remainingRequests.map((request) => ({
        requestId: request.requestId,
        plaintext: this.encryptionService.decrypt(request.content),
      }));

      // 7. Randomize order
      const randomized = this.randomizer.randomize(publishable);

      // 8. Build request-aware chunks
      const chunks = this.digestChunker.chunk(randomized, this.telegramMaxLength);

      const publishedRequestIds = new Set(journaledRequestIds);

      // 9. Send and journal each chunk
      for (const chunk of chunks) {
        const sent = await this.telegramMessenger.sendText(
          { type: 'pray_team_group' },
          { text: chunk.text },
        );

        await this.dispatchRepo.recordSentChunk(dispatch.dispatchId, {
          telegramMessageId: sent.telegramMessageId,
          requestIds: chunk.requestIds,
          sentAt: new Date(),
        });

        await this.prayerRepo.markPublished({
          requestIds: chunk.requestIds,
          dispatchId: dispatch.dispatchId,
          publishedAt: new Date(),
        });

        for (const requestId of chunk.requestIds) {
          publishedRequestIds.add(requestId);
        }

        logger.info(
          {
            event: 'weekly_dispatch_chunk_sent',
            occurrenceKey,
            dispatchId: dispatch.dispatchId,
            requestCount: chunk.requestIds.length,
          },
          'Weekly dispatch chunk sent',
        );
      }

      // 10. Complete dispatch
      await this.dispatchRepo.updateStatus(dispatch.dispatchId, 'completed', {
        eligibleRequestCount: publishedRequestIds.size,
        completedAt: new Date(),
      });

      logger.info(
        {
          event: 'weekly_dispatch_completed',
          occurrenceKey,
          dispatchId: dispatch.dispatchId,
          count: publishedRequestIds.size,
        },
        'Weekly dispatch completed',
      );
    } catch (error) {
      try {
        await this.dispatchRepo.updateStatus(dispatch.dispatchId, 'failed', {
          completedAt: new Date(),
        });
      } catch {
        logger.error(
          {
            event: 'weekly_dispatch_status_update_failed',
            occurrenceKey,
            dispatchId: dispatch.dispatchId,
          },
          'Failed to update dispatch status after error',
        );
      }

      logger.error(
        { event: 'weekly_dispatch_failed', occurrenceKey, dispatchId: dispatch.dispatchId },
        'Weekly dispatch failed',
      );

      throw error;
    }
  }
}
