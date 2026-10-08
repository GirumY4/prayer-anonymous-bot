import { DateTime } from 'luxon';
import type { DispatchRepository } from './dispatch.repository.js';
import type { PrayerRequestRepository } from '../prayer-requests/prayer-request.repository.js';
import type { EncryptionService } from '../security/encryption.service.js';
import type { TelegramMessenger } from '../telegram/telegram.types.js';
import type { RequestRandomizer } from './request-randomizer.js';
import type { DigestBuilder } from './digest-builder.js';
import type { MessageSplitter } from './message-splitter.js';
import { logger } from '../../shared/logging/logger.js';

export class WeeklyDispatchService {
  constructor(
    private readonly dispatchRepo: DispatchRepository,
    private readonly prayerRepo: PrayerRequestRepository,
    private readonly encryptionService: EncryptionService,
    private readonly telegramMessenger: TelegramMessenger,
    private readonly randomizer: RequestRandomizer,
    private readonly digestBuilder: DigestBuilder,
    private readonly messageSplitter: MessageSplitter,
    private readonly timezone: string,
  ) {}

  async execute(): Promise<void> {
    const now = DateTime.now().setZone(this.timezone);
    const weekKey = `${now.year}-W${String(now.weekNumber).padStart(2, '0')}`;

    const collectionEndAt = now.toJSDate();
    // For MVP, we consider the collection period to be the last 7 days or start of ISO week
    const collectionStartAt = now.minus({ days: 7 }).toJSDate();
    const scheduledAt = now.toJSDate();

    logger.info({ event: 'weekly_dispatch_started', weekKey }, 'Weekly dispatch started');

    // 1. Create or fetch dispatch record
    let dispatch = await this.dispatchRepo.getByWeekKey(weekKey);

    if (!dispatch) {
      dispatch = await this.dispatchRepo.create({
        dispatchId: `DISPATCH-${weekKey}`,
        weekKey,
        collectionStartAt,
        collectionEndAt,
        scheduledAt,
        status: 'scheduled',
        eligibleRequestCount: 0,
        startedAt: null,
        completedAt: null,
      });
    }

    if (dispatch.status !== 'scheduled') {
      logger.info(
        { event: 'weekly_dispatch_already_processed', weekKey, status: dispatch.status },
        'Dispatch already processed',
      );
      return;
    }

    // 2. Atomic Claim
    const claimed = await this.dispatchRepo.claimRunning(dispatch.dispatchId);
    if (!claimed) {
      logger.info(
        { event: 'weekly_dispatch_claim_failed', weekKey },
        'Failed to claim running state',
      );
      return;
    }

    try {
      // 3. Find eligible requests
      const eligibleRequests = await this.prayerRepo.findEligibleForDispatch({
        collectionEndAt,
        now: scheduledAt,
      });

      // 4. CRITICAL EMPTY-WEEK RULE
      if (eligibleRequests.length === 0) {
        await this.dispatchRepo.updateStatus(dispatch.dispatchId, 'skipped_no_requests', {
          eligibleRequestCount: 0,
        });
        logger.info(
          { event: 'weekly_dispatch_skipped_no_requests', weekKey },
          'No eligible requests',
        );
        return; // SEND NOTHING
      }

      // 5. Decrypt and Randomize
      const publishable = eligibleRequests.map((req) => ({
        requestId: req.requestId,
        plaintext: this.encryptionService.decrypt(req.content),
      }));

      const randomized = this.randomizer.randomize(publishable);

      // 6. Build & Split Digest
      const digestText = this.digestBuilder.build(randomized);
      const messages = this.messageSplitter.split(digestText);

      // 7. Send to Telegram Group
      for (const msg of messages) {
        await this.telegramMessenger.sendText({ type: 'pray_team_group' }, msg);
      }

      // 8. Mark requests as published
      const requestIds = randomized.map((r) => r.requestId);
      await this.prayerRepo.markPublished({
        requestIds,
        dispatchId: dispatch.dispatchId,
        publishedAt: new Date(),
      });

      // 9. Complete dispatch
      await this.dispatchRepo.updateStatus(dispatch.dispatchId, 'completed', {
        eligibleRequestCount: eligibleRequests.length,
        completedAt: new Date(),
      });

      logger.info(
        { event: 'weekly_dispatch_completed', weekKey, count: eligibleRequests.length },
        'Weekly dispatch completed',
      );
    } catch (error) {
      await this.dispatchRepo.updateStatus(dispatch.dispatchId, 'failed');
      logger.error({ event: 'weekly_dispatch_failed', weekKey }, 'Weekly dispatch failed');
      throw error;
    }
  }
}
