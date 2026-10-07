import type {
  LocalizationService,
  SupportedLanguage,
} from '../../modules/localization/localization.types.js';
import type { TranslationKey } from '../../modules/localization/translation-keys.js';
import { enMessages } from '../../modules/localization/locales/en/messages.js';
import { amMessages } from '../../modules/localization/locales/am/messages.js';

export class StaticLocalizationService implements LocalizationService {
  /**
   * Enforces the core product requirement:
   * "AMHARIC IS THE DEFAULT INITIAL LANGUAGE."
   */
  getDefaultLanguage(): SupportedLanguage {
    return 'am';
  }

  translate(key: TranslationKey, language: SupportedLanguage): string {
    if (language === 'am') {
      // Fallback to English if an Amharic key is somehow missing, then fallback to the key itself
      return amMessages[key] ?? enMessages[key] ?? key;
    }

    return enMessages[key] ?? key;
  }
}
