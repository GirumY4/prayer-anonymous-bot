import cron, { type ScheduledTask } from 'node-cron';
import { logger } from '../../shared/logging/logger.js';
import type { WeeklyDispatchService } from '../../modules/dispatch/weekly-dispatch.service.js';

export class NodeCronScheduler {
  private task: ScheduledTask | null = null;

  constructor(
    private readonly dispatchService: WeeklyDispatchService,
    private readonly cronExpression: string,
    private readonly timezone: string,
  ) {}

  start(): void {
    if (this.task) return;

    this.task = cron.schedule(
      this.cronExpression,
      async () => {
        try {
          await this.dispatchService.execute();
        } catch {
          logger.error({ event: 'scheduler_execution_failed' }, 'Scheduler execution failed');
        }
      },
      {
        timezone: this.timezone,
      },
    );

    logger.info(
      { event: 'scheduler_started', cron: this.cronExpression, timezone: this.timezone },
      'Scheduler started',
    );
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info({ event: 'scheduler_stopped' }, 'Scheduler stopped');
    }
  }
}
