import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { AesGcmEncryptionService } from '../../../src/infrastructure/security/aes-gcm-encryption.service.js';
import { ApplicationError } from '../../../src/shared/errors/application-error.js';

describe('AesGcmEncryptionService', () => {
  const key = randomBytes(32);
  const service = new AesGcmEncryptionService(key);

  it('encrypts and decrypts prayer content successfully', () => {
    const plaintext = 'Please pray for my upcoming exams and family peace.';
    const keyVersion = 1;

    const encrypted = service.encrypt(plaintext, keyVersion);

    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.iv).toHaveLength(24); // 12 bytes = 24 hex characters
    expect(encrypted.authTag).toHaveLength(32); // 16 bytes = 32 hex characters
    expect(encrypted.keyVersion).toBe(1);

    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('supports unicode and Amharic text encryption and decryption', () => {
    const plaintext = 'እባካችሁ ስለ ትምህርቴ እና ስለ ቤተሰቤ ሰላም ጸልዩልኝ።';
    const encrypted = service.encrypt(plaintext, 1);
    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('throws ApplicationError when authentication tag is tampered with', () => {
    const encrypted = service.encrypt('Sensitive prayer', 1);
    // Tamper with authentication tag
    const tamperedTag = encrypted.authTag.startsWith('00')
      ? 'ff' + encrypted.authTag.slice(2)
      : '00' + encrypted.authTag.slice(2);

    expect(() =>
      service.decrypt({
        ...encrypted,
        authTag: tamperedTag,
      }),
    ).toThrow(ApplicationError);
  });

  it('throws ApplicationError when ciphertext is corrupted', () => {
    const encrypted = service.encrypt('Sensitive prayer', 1);
    const corruptedCiphertext = encrypted.ciphertext.startsWith('aa')
      ? 'bb' + encrypted.ciphertext.slice(2)
      : 'aa' + encrypted.ciphertext.slice(2);

    expect(() =>
      service.decrypt({
        ...encrypted,
        ciphertext: corruptedCiphertext,
      }),
    ).toThrow(ApplicationError);
  });

  it('throws ApplicationError when wrong key is used for decryption', () => {
    const encrypted = service.encrypt('Sensitive prayer', 1);
    const otherKey = randomBytes(32);
    const otherService = new AesGcmEncryptionService(otherKey);

    expect(() => otherService.decrypt(encrypted)).toThrow(ApplicationError);
  });
});
