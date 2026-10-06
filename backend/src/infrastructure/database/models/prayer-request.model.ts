import { Schema, model } from 'mongoose';

const prayerRequestSchema = new Schema(
  {
    requestId: { type: String, required: true, unique: true },
    content: {
      ciphertext: { type: String, required: true },
      iv: { type: String, required: true },
      authTag: { type: String, required: true },
      keyVersion: { type: Number, required: true },
    },
    status: {
      type: String,
      enum: ['pending', 'published'],
      required: true,
      default: 'pending',
      index: true,
    },
    createdAt: { type: Date, required: true, default: Date.now, index: true },
    expiresAt: { type: Date, required: true, index: true },
    dispatchId: { type: String, default: null },
    publishedAt: { type: Date, default: null },
  },
  {
    timestamps: false, // We manage createdAt explicitly
    strict: 'throw',
    strictQuery: 'throw',
    versionKey: false, // Disables __v
  },
);

// Compound index for weekly dispatch eligibility queries
prayerRequestSchema.index({ status: 1, createdAt: 1, expiresAt: 1 });

// TTL safety index (MongoDB background deletion)
prayerRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PrayerRequestModel = model('PrayerRequest', prayerRequestSchema);
