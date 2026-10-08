import type { DispatchRecord, DispatchStatus } from './dispatch.types.js';

export interface DispatchRepository {
  create(dispatch: Omit<DispatchRecord, 'id'>): Promise<DispatchRecord>;
  getByWeekKey(weekKey: string): Promise<DispatchRecord | null>;
  claim(dispatchId: string, startedAt?: Date): Promise<boolean>;
  claimDispatch(dispatchId: string, startedAt?: Date): Promise<boolean>;
  claimRunning(dispatchId: string): Promise<boolean>;
  updateStatus(
    dispatchId: string,
    status: DispatchStatus,
    updates?: Partial<Pick<DispatchRecord, 'eligibleRequestCount' | 'startedAt' | 'completedAt'>>,
  ): Promise<void>;
}
