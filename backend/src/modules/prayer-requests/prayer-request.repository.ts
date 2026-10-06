import type { PrayerRequest } from './prayer-request.types.js';

export interface FindEligibleRequestsInput {
  collectionEndAt: Date;
  now: Date;
}

export interface MarkPublishedInput {
  requestIds: string[];
  dispatchId: string;
  publishedAt: Date;
}

export interface PrayerRequestRepository {
  create(request: Omit<PrayerRequest, 'id'>): Promise<PrayerRequest>;
  findEligibleForDispatch(input: FindEligibleRequestsInput): Promise<PrayerRequest[]>;
  markPublished(input: MarkPublishedInput): Promise<number>;
  deleteExpired(now: Date): Promise<number>;
}
