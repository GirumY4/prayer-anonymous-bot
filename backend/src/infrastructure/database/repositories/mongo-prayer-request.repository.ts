import { PrayerRequestModel } from '../models/prayer-request.model.js';
import type {
  PrayerRequest,
  PrayerRequestStatus,
} from '../../../modules/prayer-requests/prayer-request.types.js';
import type {
  PrayerRequestRepository,
  FindEligibleRequestsInput,
  MarkPublishedInput,
} from '../../../modules/prayer-requests/prayer-request.repository.js';

export type PrayerRequestDocument = InstanceType<typeof PrayerRequestModel>;

export class MongoPrayerRequestRepository implements PrayerRequestRepository {
  async create(request: Omit<PrayerRequest, 'id'>): Promise<PrayerRequest> {
    const doc = await PrayerRequestModel.create(request);
    return this.mapToDomain(doc);
  }

  async findEligibleForDispatch(input: FindEligibleRequestsInput): Promise<PrayerRequest[]> {
    const docs = await PrayerRequestModel.find({
      status: 'pending',
      createdAt: { $lt: input.collectionEndAt },
      expiresAt: { $gt: input.now },
    }).exec();

    return docs.map((doc) => this.mapToDomain(doc));
  }

  async markPublished(input: MarkPublishedInput): Promise<number> {
    const result = await PrayerRequestModel.updateMany(
      {
        requestId: { $in: input.requestIds },
        status: 'pending', // Prevent duplicate publication
      },
      {
        $set: {
          status: 'published',
          dispatchId: input.dispatchId,
          publishedAt: input.publishedAt,
        },
      },
    ).exec();

    return result.modifiedCount;
  }

  async deleteExpired(now: Date): Promise<number> {
    const result = await PrayerRequestModel.deleteMany({
      expiresAt: { $lte: now },
    }).exec();

    return result.deletedCount ?? 0;
  }

  private mapToDomain(doc: PrayerRequestDocument): PrayerRequest {
    if (!doc.content) {
      throw new Error(`Prayer request ${doc.requestId} is missing content`);
    }

    return {
      id: doc._id.toString(),
      requestId: doc.requestId,
      content: {
        ciphertext: doc.content.ciphertext,
        iv: doc.content.iv,
        authTag: doc.content.authTag,
        keyVersion: doc.content.keyVersion,
      },
      status: doc.status as PrayerRequestStatus,
      createdAt: doc.createdAt,
      expiresAt: doc.expiresAt,
      dispatchId: doc.dispatchId ?? null,
      publishedAt: doc.publishedAt ?? null,
    };
  }
}
