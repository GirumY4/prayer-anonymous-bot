import type { Context } from 'grammy';
import type { ConversationService } from '../conversation/conversation.service.js';
import type { LocalizationService } from '../localization/localization.types.js';
import { TranslationKey } from '../localization/translation-keys.js';
import type {
  ConversationSession,
  ConversationAction,
} from '../conversation/conversation.types.js';
import { ConversationState } from '../conversation/conversation.state.js';
import { TelegramKeyboards } from './keyboards.js';
import type { PrayerRequestService } from '../prayer-requests/prayer-request.service.js';
import { ApplicationError } from '../../shared/errors/application-error.js';
import { ErrorCode } from '../../shared/errors/error-codes.js';
import { logger } from '../../shared/logging/logger.js';

export class TelegramAdapter {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly i18n: LocalizationService,
    private readonly keyboards: TelegramKeyboards,
    private readonly prayerRequestService: PrayerRequestService, // Phase 7 Addition
  ) {}

  async handleUpdate(ctx: Context): Promise<void> {
    const chatId = ctx.chat?.id.toString();
    if (!chatId) return;

    const session = await this.conversationService.getSession(chatId);
    const lang = session?.language ?? this.i18n.getDefaultLanguage();
    let action: ConversationAction | null = null;

    // 1. Handle Callback Queries (Inline Buttons)
    if (ctx.callbackQuery?.data) {
      const data = ctx.callbackQuery.data;
      if (data === 'lang:am') action = { type: 'SELECT_LANGUAGE', language: 'am' };
      else if (data === 'lang:en') action = { type: 'SELECT_LANGUAGE', language: 'en' };
      else if (data === 'privacy:ack') action = { type: 'ACKNOWLEDGE_PRIVACY' };
      else if (data === 'privacy:details') action = { type: 'SHOW_PRIVACY_DETAILS' };
      else if (data === 'review:submit') action = { type: 'CONFIRM_SUBMISSION' };
      else if (data === 'review:edit') action = { type: 'EDIT_DRAFT' };
      else if (data === 'review:cancel') action = { type: 'CANCEL' };

      await ctx.answerCallbackQuery();
    }
    // 2. Handle Text Messages
    else if (ctx.message?.text) {
      const text = ctx.message.text;

      // Commands
      if (text.startsWith('/start')) action = { type: 'START' };
      else if (text.startsWith('/cancel')) action = { type: 'CANCEL' };
      else if (text.startsWith('/help')) action = { type: 'SHOW_HELP' };
      else if (text.startsWith('/privacy')) action = { type: 'SHOW_PRIVACY_DETAILS' };
      else if (text.startsWith('/language')) action = { type: 'CHANGE_LANGUAGE' };
      else {
        // Context-aware text handling
        if (session?.state === ConversationState.WAITING_FOR_PRAYER) {
          action = { type: 'SUBMIT_DRAFT_TEXT', text };
        } else if (session?.state === ConversationState.MAIN_MENU) {
          const submitText = this.i18n.translate(TranslationKey.MENU_SUBMIT, lang);
          const langText = this.i18n.translate(TranslationKey.MENU_CHANGE_LANGUAGE, lang);
          const privacyText = this.i18n.translate(TranslationKey.MENU_PRIVACY, lang);
          const helpText = this.i18n.translate(TranslationKey.MENU_HELP, lang);

          if (text === submitText) action = { type: 'START_SUBMISSION' };
          else if (text === langText) action = { type: 'CHANGE_LANGUAGE' };
          else if (text === privacyText) action = { type: 'SHOW_PRIVACY_DETAILS' };
          else if (text === helpText) action = { type: 'SHOW_HELP' };
          else action = { type: 'SHOW_MAIN_MENU' }; // Unknown text in menu
        }
      }
    }
    // 3. Handle Unsupported Media
    else {
      if (session?.state === ConversationState.WAITING_FOR_PRAYER) {
        await ctx.reply(this.i18n.translate(TranslationKey.ERROR_UNSUPPORTED_MEDIA, lang));
      }
      return;
    }

    if (!action) return;

    // --- Phase 7: Intercept Submission Processing ---
    if (action.type === 'CONFIRM_SUBMISSION') {
      const draft = await this.conversationService.getDraft(chatId);

      if (!draft) {
        await ctx.reply(this.i18n.translate(TranslationKey.ERROR_SESSION_EXPIRED, lang));
        await this.conversationService.handleAction(chatId, { type: 'CANCEL' });
        return;
      }

      try {
        // Execute the core business use case
        const result = await this.prayerRequestService.submit(draft);

        // Transition state to clear draft and return to menu
        await this.conversationService.handleAction(chatId, { type: 'COMPLETE_SUBMISSION' });

        // Render Success Confirmation
        const successMsg =
          this.i18n.translate(TranslationKey.CONFIRMATION_SUCCESS, lang) +
          `\n\n${this.i18n.translate(TranslationKey.CONFIRMATION_REQUEST_ID, lang)} ${result.requestId}`;

        await ctx.reply(successMsg);

        // Render Main Menu
        const mainMenuMsg = this.i18n.translate(TranslationKey.MENU_TITLE, lang);
        await ctx.reply(mainMenuMsg, {
          reply_markup: this.keyboards.mainMenu(lang),
        });
        return; // Stop further processing
      } catch (error) {
        if (error instanceof ApplicationError) {
          let errorKey = TranslationKey.ERROR_GENERAL;
          if (error.code === ErrorCode.INVALID_INPUT) {
            // Map specific validation reasons if needed, defaulting to general for safety
            errorKey = TranslationKey.ERROR_GENERAL;
          }
          await ctx.reply(this.i18n.translate(errorKey, lang));
        } else {
          logger.error(
            { event: 'unexpected_submission_error' },
            'Unexpected error during submission',
          );
          await ctx.reply(this.i18n.translate(TranslationKey.ERROR_GENERAL, lang));
        }

        // Revert to reviewing state so they can try again or cancel
        await this.conversationService.handleAction(chatId, { type: 'EDIT_DRAFT' });
        return;
      }
    }

    // Execute standard action and render resulting state
    const newSession = await this.conversationService.handleAction(chatId, action);
    await this.renderState(ctx, newSession);
  }

  private async renderState(ctx: Context, session: ConversationSession): Promise<void> {
    const lang = session.language;
    const t = (key: TranslationKey) => this.i18n.translate(key, lang);

    switch (session.state) {
      case ConversationState.LANGUAGE_SELECTION:
        await ctx.reply(
          t(TranslationKey.WELCOME_TITLE) + '\n\n' + t(TranslationKey.LANGUAGE_CHOOSE),
          {
            reply_markup: this.keyboards.languageSelection(lang),
          },
        );
        break;

      case ConversationState.PRIVACY_NOTICE:
        await ctx.reply(
          t(TranslationKey.PRIVACY_TITLE) + '\n\n' + t(TranslationKey.PRIVACY_NOTICE),
          {
            reply_markup: this.keyboards.privacyNotice(lang),
          },
        );
        break;

      case ConversationState.MAIN_MENU:
        await ctx.reply(t(TranslationKey.MENU_TITLE), {
          reply_markup: this.keyboards.mainMenu(lang),
        });
        break;

      case ConversationState.PRIVACY_DETAILS:
        await ctx.reply(t(TranslationKey.PRIVACY_NOTICE), {
          reply_markup: { inline_keyboard: [[{ text: '🔙 Back', callback_data: 'nav:back' }]] },
        });
        break;

      case ConversationState.HELP:
        await ctx.reply(
          t(TranslationKey.HELP_TITLE) +
            '\n\n' +
            t(TranslationKey.HELP_CONTENT) +
            '\n\n' +
            t(TranslationKey.SAFETY_WARNING),
        );
        break;

      case ConversationState.SUBMISSION_INSTRUCTIONS:
      case ConversationState.WAITING_FOR_PRAYER:
        await ctx.reply(t(TranslationKey.SUBMISSION_INSTRUCTIONS), {
          reply_markup: this.keyboards.cancelAction(lang),
        });
        break;

      case ConversationState.REVIEWING_REQUEST:
        const draft = session.draftText ?? '';
        const reviewText = `${t(TranslationKey.REVIEW_TITLE)}\n\n"${draft}"\n\n${t(TranslationKey.REVIEW_WARNING)}`;
        await ctx.reply(reviewText, {
          reply_markup: this.keyboards.reviewRequest(lang),
        });
        break;

      case ConversationState.SUBMISSION_PROCESSING:
        // Placeholder for Phase 7 (Prayer Submission Logic)
        await ctx.reply('Processing submission...');
        break;
    }
  }
}
