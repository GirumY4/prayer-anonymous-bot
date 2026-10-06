import { DispatchRecordModel } from '../models/dispatch.model.js';
import type { DispatchRecord, DispatchStatus } from '../../../modules/dispatch/dispatch.types.js';
import type { DispatchRepository } from '../../../modules/dispatch/dispatch.repository.js';

export type DispatchRecordDocument = InstanceType<typeof DispatchRecordModel>;

export class MongoDispatchRepository implements DispatchRepository {
  async create(dispatch: Omit<DispatchRecord, 'id'>): Promise<DispatchRecord> {
    const doc = await DispatchRecordModel.create(dispatch);
    return this.mapToDomain(doc);
  }

  async getByWeekKey(weekKey: string): Promise<DispatchRecord | null> {
    const doc = await DispatchRecordModel.findOne({ weekKey }).exec();
    return doc ? this.mapToDomain(doc) : null;
  }

  async claim(dispatchId: string, startedAt: Date = new Date()): Promise<boolean> {
    const result = await DispatchRecordModel.updateOne(
      { dispatchId, status: 'scheduled' },
      { $set: { status: 'running', startedAt } },
    ).exec();

    return result.modifiedCount > 0;
  }

  async claimDispatch(dispatchId: string, startedAt: Date = new Date()): Promise<boolean> {
    return this.claim(dispatchId, startedAt);
  }

  async updateStatus(
    dispatchId: string,
    status: DispatchStatus,
    updates?: Partial<Pick<DispatchRecord, 'eligibleRequestCount' | 'startedAt' | 'completedAt'>>,
  ): Promise<void> {
    await DispatchRecordModel.updateOne({ dispatchId }, { $set: { status, ...updates } }).exec();
  }

  private mapToDomain(doc: DispatchRecordDocument): DispatchRecord {
    return {
      id: doc._id.toString(),
      dispatchId: doc.dispatchId,
      weekKey: doc.weekKey,
      collectionStartAt: doc.collectionStartAt,
      collectionEndAt: doc.collectionEndAt,
      scheduledAt: doc.scheduledAt,
      status: doc.status as DispatchStatus,
      eligibleRequestCount: doc.eligibleRequestCount,
      startedAt: doc.startedAt ?? null,
      completedAt: doc.completedAt ?? null,
    };
  }
}
