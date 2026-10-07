import type { EncryptedContent } from '../prayer-requests/prayer-request.types.js';

export interface EncryptionService {
  encrypt(plaintext: string, keyVersion: number): EncryptedContent;
  decrypt(content: EncryptedContent): string;
}
