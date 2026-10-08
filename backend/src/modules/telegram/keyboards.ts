import { InlineKeyboard, Keyboard } from 'grammy';
import type { LocalizationService, SupportedLanguage } from '../localization/localization.types.js';
import { TranslationKey } from '../localization/translation-keys.js';

export class TelegramKeyboards {
  constructor(private readonly i18n: LocalizationService) {}

  languageSelection(lang: SupportedLanguage) {
    return new InlineKeyboard()
      .text(this.i18n.translate(TranslationKey.LANGUAGE_AMHARIC, lang), 'lang:am')
      .row()
      .text(this.i18n.translate(TranslationKey.LANGUAGE_ENGLISH, lang), 'lang:en');
  }

  privacyNotice(lang: SupportedLanguage) {
    return new InlineKeyboard()
      .text(this.i18n.translate(TranslationKey.PRIVACY_ACKNOWLEDGE, lang), 'privacy:ack')
      .row()
      .text(this.i18n.translate(TranslationKey.PRIVACY_DETAILS, lang), 'privacy:details');
  }

  mainMenu(lang: SupportedLanguage) {
    return new Keyboard()
      .text(this.i18n.translate(TranslationKey.MENU_SUBMIT, lang))
      .row()
      .text(this.i18n.translate(TranslationKey.MENU_CHANGE_LANGUAGE, lang))
      .row()
      .text(this.i18n.translate(TranslationKey.MENU_PRIVACY, lang))
      .row()
      .text(this.i18n.translate(TranslationKey.MENU_HELP, lang))
      .resized();
  }

  reviewRequest(lang: SupportedLanguage) {
    return new InlineKeyboard()
      .text(this.i18n.translate(TranslationKey.REVIEW_SUBMIT, lang), 'review:submit')
      .row()
      .text(this.i18n.translate(TranslationKey.REVIEW_EDIT, lang), 'review:edit')
      .row()
      .text(this.i18n.translate(TranslationKey.REVIEW_CANCEL, lang), 'review:cancel');
  }

  cancelAction(lang: SupportedLanguage) {
    return new InlineKeyboard().text(
      this.i18n.translate(TranslationKey.SUBMISSION_CANCEL, lang),
      'review:cancel',
    );
  }
}
