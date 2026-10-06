import { Schema, model } from 'mongoose';

const dispatchRecordSchema = new Schema(
  {
    dispatchId: { type: String, required: true, unique: true },
    weekKey: { type: String, required: true, unique: true },
    collectionStartAt: { type: Date, required: true },
    collectionEndAt: { type: Date, required: true },
    scheduledAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['scheduled', 'running', 'completed', 'skipped_no_requests', 'failed'],
      required: true,
      default: 'scheduled',
      index: true,
    },
    eligibleRequestCount: { type: Number, required: true, default: 0 },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  {
    timestamps: false,
    strict: 'throw',
    strictQuery: 'throw',
    versionKey: false,
  },
);

export const DispatchRecordModel = model('DispatchRecord', dispatchRecordSchema);
