import cron, { type ScheduledTask } from 'node-cron';
import { logger } from '../../shared/logging/logger.js';
import type { WeeklyDispatchService } from '../../modules/dispatch/weekly-dispatch.service.js';
import type { ExpirationCleanupService } from '../../modules/prayer-requests/expiration.service.js';
import type { SessionStore } from '../../modules/conversation/session.store.js';

export interface SchedulerConfig {
  weeklyDispatchCron: string;
  retentionCleanupCron: string;
  sessionCleanupCron?: string;
  timezone: string;
}

export class ApplicationScheduler {
  private tasks: ScheduledTask[] = [];

  private static readonly DEFAULT_SESSION_CLEANUP_CRON = '*/10 * * * *';

  constructor(
    private readonly weeklyDispatchService: WeeklyDispatchService,
    private readonly expirationService: ExpirationCleanupService,
    private readonly config: SchedulerConfig,
    private readonly sessionStore?: SessionStore,
  ) {}

  start(): void {
    if (this.tasks.length > 0) return;

    // Job 1: Weekly Dispatch
    const dispatchTask = cron.schedule(
      this.config.weeklyDispatchCron,
      async () => {
        try {
          await this.weeklyDispatchService.execute();
        } catch {
          logger.error(
            { event: 'scheduler_dispatch_execution_failed' },
            'Weekly dispatch execution failed',
          );
        }
      },
      { timezone: this.config.timezone },
    );
    this.tasks.push(dispatchTask);

    // Job 2: Retention Cleanup
    const cleanupTask = cron.schedule(
      this.config.retentionCleanupCron,
      async () => {
        try {
          await this.expirationService.execute(new Date());
        } catch {
          logger.error(
            { event: 'scheduler_cleanup_execution_failed' },
            'Retention cleanup execution failed',
          );
        }
      },
      { timezone: this.config.timezone },
    );
    this.tasks.push(cleanupTask);

    // Job 3: Session Sweep
    // Expired in-memory sessions may still hold prayer draft text, so they are
    // evicted on a schedule instead of lingering until the user returns.
    const sessionCleanupTask = cron.schedule(
      this.config.sessionCleanupCron ?? ApplicationScheduler.DEFAULT_SESSION_CLEANUP_CRON,
      async () => {
        try {
          const clearedSessions = (await this.sessionStore?.clearExpired(new Date())) ?? 0;

          logger.info(
            {
              event: 'scheduler_session_sweep_completed',
              clearedSessions,
            },
            'Expired conversation sessions swept',
          );
        } catch {
          logger.error(
            { event: 'scheduler_session_sweep_failed' },
            'Session sweep execution failed',
          );
        }
      },
      { timezone: this.config.timezone },
    );
    this.tasks.push(sessionCleanupTask);

    logger.info(
      {
        event: 'scheduler_started',
        weeklyDispatchCron: this.config.weeklyDispatchCron,
        retentionCleanupCron: this.config.retentionCleanupCron,
        sessionCleanupCron:
          this.config.sessionCleanupCron ?? ApplicationScheduler.DEFAULT_SESSION_CLEANUP_CRON,
        timezone: this.config.timezone,
      },
      'Application scheduler started',
    );
  }

  stop(): void {
    for (const task of this.tasks) {
      task.stop();
    }
    this.tasks = [];
    logger.info({ event: 'scheduler_stopped' }, 'Application scheduler stopped');
  }
}
