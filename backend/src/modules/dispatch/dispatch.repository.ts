import type { DispatchRecord, DispatchStatus, SentDispatchChunk } from './dispatch.types.js';

export interface DispatchRepository {
  create(dispatch: Omit<DispatchRecord, 'id'>): Promise<DispatchRecord>;

  getByWeekKey(weekKey: string): Promise<DispatchRecord | null>;

  claimRunning(dispatchId: string, staleBefore: Date): Promise<boolean>;

  recordSentChunk(dispatchId: string, chunk: SentDispatchChunk): Promise<void>;

  updateStatus(
    dispatchId: string,
    status: DispatchStatus,
    updates?: Partial<Pick<DispatchRecord, 'eligibleRequestCount' | 'startedAt' | 'completedAt'>>,
  ): Promise<void>;
}
