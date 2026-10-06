export type PrayerRequestStatus = 'pending' | 'published';

export interface EncryptedContent {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: number;
}

export interface PrayerRequest {
  id: string;
  requestId: string;
  content: EncryptedContent;
  status: PrayerRequestStatus;
  createdAt: Date;
  expiresAt: Date;
  dispatchId: string | null;
  publishedAt: Date | null;
}
