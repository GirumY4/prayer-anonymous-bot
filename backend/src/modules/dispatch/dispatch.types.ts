export type DispatchStatus =
  'scheduled' | 'running' | 'completed' | 'skipped_no_requests' | 'failed';

export interface DispatchRecord {
  id: string;
  dispatchId: string;
  weekKey: string;
  collectionStartAt: Date;
  collectionEndAt: Date;
  scheduledAt: Date;
  status: DispatchStatus;
  eligibleRequestCount: number;
  startedAt: Date | null;
  completedAt: Date | null;
}
