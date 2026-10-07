import type { TranslationKey } from './translation-keys.js';

export type SupportedLanguage = 'am' | 'en';

export interface LocalizationService {
  /**
   * Translates a specific key into the requested language.
   */
  translate(key: TranslationKey, language: SupportedLanguage): string;

  /**
   * Returns the default language for new users.
   * MUST be 'am' (Amharic) according to project requirements.
   */
  getDefaultLanguage(): SupportedLanguage;
}
