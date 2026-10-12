import { DispatchRecordModel, type DispatchRecordDocument } from '../models/dispatch.model.js';
import type {
  DispatchRecord,
  DispatchStatus,
  SentDispatchChunk,
} from '../../../modules/dispatch/dispatch.types.js';
import type { DispatchRepository } from '../../../modules/dispatch/dispatch.repository.js';

export class MongoDispatchRepository implements DispatchRepository {
  async create(dispatch: Omit<DispatchRecord, 'id'>): Promise<DispatchRecord> {
    const doc = await DispatchRecordModel.create(dispatch);
    return this.mapToDomain(doc);
  }

  async getByWeekKey(weekKey: string): Promise<DispatchRecord | null> {
    const doc = await DispatchRecordModel.findOne({ weekKey }).exec();
    return doc ? this.mapToDomain(doc) : null;
  }

  async claimRunning(dispatchId: string, staleBefore: Date): Promise<boolean> {
    const result = await DispatchRecordModel.updateOne(
      {
        dispatchId,
        $or: [
          {
            status: {
              $in: ['scheduled', 'failed'],
            },
          },
          {
            status: 'running',
            startedAt: {
              $lt: staleBefore,
            },
          },
        ],
      },
      {
        $set: {
          status: 'running',
          startedAt: new Date(),
        },
      },
    ).exec();

    return result.modifiedCount === 1;
  }

  async recordSentChunk(dispatchId: string, chunk: SentDispatchChunk): Promise<void> {
    await DispatchRecordModel.updateOne(
      { dispatchId },
      {
        $push: {
          sentChunks: {
            telegramMessageId: chunk.telegramMessageId,
            requestIds: chunk.requestIds,
            sentAt: chunk.sentAt,
          },
        },
      },
    ).exec();
  }

  async updateStatus(
    dispatchId: string,
    status: DispatchStatus,
    updates?: Partial<Pick<DispatchRecord, 'eligibleRequestCount' | 'startedAt' | 'completedAt'>>,
  ): Promise<void> {
    await DispatchRecordModel.updateOne(
      { dispatchId },
      {
        $set: {
          status,
          ...updates,
        },
      },
    ).exec();
  }

  private mapToDomain(doc: DispatchRecordDocument): DispatchRecord {
    return {
      id: doc._id.toString(),
      dispatchId: doc.dispatchId,
      weekKey: doc.weekKey,
      collectionStartAt: doc.collectionStartAt,
      collectionEndAt: doc.collectionEndAt,
      scheduledAt: doc.scheduledAt,
      status: doc.status,
      eligibleRequestCount: doc.eligibleRequestCount,
      startedAt: doc.startedAt ?? null,
      completedAt: doc.completedAt ?? null,
      sentChunks: doc.sentChunks.map((chunk) => ({
        telegramMessageId: chunk.telegramMessageId,
        requestIds: [...chunk.requestIds],
        sentAt: chunk.sentAt,
      })),
    };
  }
}
