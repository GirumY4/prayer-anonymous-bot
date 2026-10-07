import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { EncryptionService } from '../../modules/security/encryption.service.js';
import type { EncryptedContent } from '../../modules/prayer-requests/prayer-request.types.js';
import { ApplicationError } from '../../shared/errors/application-error.js';
import { ErrorCode } from '../../shared/errors/error-codes.js';

export class AesGcmEncryptionService implements EncryptionService {
  constructor(private readonly key: Buffer) {}

  encrypt(plaintext: string, keyVersion: number): EncryptedContent {
    try {
      // 12 bytes (96 bits) is the standard IV size for AES-GCM
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', this.key, iv);

      const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

      const authTag = cipher.getAuthTag();

      return {
        ciphertext: encrypted.toString('hex'),
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        keyVersion,
      };
    } catch {
      throw new ApplicationError(
        ErrorCode.ENCRYPTION_FAILED,
        'Failed to encrypt prayer content',
        500,
      );
    }
  }

  decrypt(content: EncryptedContent): string {
    try {
      const iv = Buffer.from(content.iv, 'hex');
      const ciphertext = Buffer.from(content.ciphertext, 'hex');
      const authTag = Buffer.from(content.authTag, 'hex');

      const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

      return decrypted.toString('utf8');
    } catch {
      throw new ApplicationError(
        ErrorCode.ENCRYPTION_FAILED,
        'Failed to decrypt prayer content',
        500,
      );
    }
  }
}
