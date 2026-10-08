export type ValidationResult = { valid: true } | { valid: false; reason: 'EMPTY' | 'TOO_LONG' };

export class PrayerRequestValidator {
  constructor(private readonly maxLength: number) {}

  validate(text: string): ValidationResult {
    const trimmed = text.trim();

    if (trimmed.length === 0) {
      return { valid: false, reason: 'EMPTY' };
    }

    if (trimmed.length > this.maxLength) {
      return { valid: false, reason: 'TOO_LONG' };
    }

    return { valid: true };
  }
}
