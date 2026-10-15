import { Schema, model, type HydratedDocument } from 'mongoose';
import type {
  DispatchRecord,
  SentDispatchChunk,
} from '../../../modules/dispatch/dispatch.types.js';

export type DispatchRecordAttrs = Omit<DispatchRecord, 'id'>;
export type DispatchRecordDocument = HydratedDocument<DispatchRecordAttrs>;

const sentChunkSchema = new Schema<SentDispatchChunk>(
  {
    telegramMessageId: {
      type: Number,
      required: true,
    },
    requestIds: {
      type: [String],
      required: true,
    },
    sentAt: {
      type: Date,
      required: true,
    },
  },
  {
    _id: false,
    strict: 'throw',
  },
);

const dispatchRecordSchema = new Schema<DispatchRecordAttrs>(
  {
    dispatchId: {
      type: String,
      required: true,
      unique: true,
    },
    occurrenceKey: {
      type: String,
      required: true,
      unique: true,
    },
    weekKey: {
      type: String,
      required: false,
    },
    collectionStartAt: {
      type: Date,
      required: true,
    },
    collectionEndAt: {
      type: Date,
      required: true,
    },
    scheduledAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'running', 'completed', 'skipped_no_requests', 'failed'],
      required: true,
      default: 'scheduled',
      index: true,
    },
    eligibleRequestCount: {
      type: Number,
      required: true,
      default: 0,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    sentChunks: {
      type: [sentChunkSchema],
      default: [],
    },
  },
  {
    timestamps: false,
    strict: 'throw',
    strictQuery: 'throw',
    versionKey: false,
  },
);

export const DispatchRecordModel = model<DispatchRecordAttrs>(
  'DispatchRecord',
  dispatchRecordSchema,
);
