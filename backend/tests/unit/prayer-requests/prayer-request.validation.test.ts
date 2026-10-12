import { describe, it, expect } from 'vitest';
import { PrayerRequestValidator } from '../../../src/modules/prayer-requests/prayer-request.validation.js';

describe('PrayerRequestValidator', () => {
  const validator = new PrayerRequestValidator(3000);

  it('accepts valid prayer text', () => {
    const result = validator.validate('Please pray for healing and strength.');
    expect(result.valid).toBe(true);
  });

  it('rejects empty text', () => {
    const result = validator.validate('');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('EMPTY');
    }
  });

  it('rejects whitespace-only text', () => {
    const result = validator.validate('   \n\t   ');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('EMPTY');
    }
  });

  it('rejects text exceeding max length', () => {
    const shortValidator = new PrayerRequestValidator(50);
    const oversizedText = 'A'.repeat(51);
    const result = shortValidator.validate(oversizedText);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('TOO_LONG');
    }
  });

  it('accepts text at exactly max length', () => {
    const shortValidator = new PrayerRequestValidator(50);
    const exactText = 'A'.repeat(50);
    const result = shortValidator.validate(exactText);
    expect(result.valid).toBe(true);
  });
});
