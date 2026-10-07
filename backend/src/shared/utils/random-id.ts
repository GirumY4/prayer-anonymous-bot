import { randomBytes } from 'node:crypto';

/**
 * Generates a cryptographically random, opaque prayer request ID.
 * Example output: PR-A83C4E11
 */
export function generateRequestId(): string {
  // 4 bytes = 8 hexadecimal characters
  const bytes = randomBytes(4);
  return `PR-${bytes.toString('hex').toUpperCase()}`;
}
