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
import { PrayerRequestValidator } from '../prayer-requests/prayer-request.validation.js';
import { ApplicationError } from '../../shared/errors/application-error.js';
import { ErrorCode } from '../../shared/errors/error-codes.js';
import { logger } from '../../shared/logging/logger.js';

export class TelegramAdapter {
  /**
   * Chats with a submission currently in flight. JavaScript's single-threaded
   * execution makes the check-and-set below atomic, which is what closes the
   * gap between reading the session state and locking it.
   */
  private readonly submissionsInProgress = new Set<string>();

  constructor(
    private readonly conversationService: ConversationService,
    private readonly i18n: LocalizationService,
    private readonly keyboards: TelegramKeyboards,
    private readonly prayerRequestService: PrayerRequestService,
    private readonly validator: PrayerRequestValidator,
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
      else if (data === 'nav:back') action = { type: 'NAV_BACK' };
      else if (data === 'review:submit') action = { type: 'CONFIRM_SUBMISSION' };
      else if (data === 'review:edit') action = { type: 'EDIT_DRAFT' };
      else if (data === 'review:cancel') action = { type: 'CANCEL' };
      else {
        logger.warn(
          { event: 'telegram_unknown_callback_data' },
          'Received unrecognized callback data',
        );
        await ctx.answerCallbackQuery({
          text: this.i18n.translate(TranslationKey.ERROR_INVALID_CALLBACK, lang),
        });
        return;
      }

      await ctx.answerCallbackQuery();
    }
    // 2. Handle Text Messages
    else if (ctx.message?.text) {
      const text = ctx.message.text.trim();

      // Commands
      if (text.startsWith('/start')) action = { type: 'START' };
      else if (text.startsWith('/cancel')) action = { type: 'CANCEL' };
      else if (text.startsWith('/help')) action = { type: 'SHOW_HELP' };
      else if (text.startsWith('/privacy')) action = { type: 'SHOW_PRIVACY_DETAILS' };
      else if (text.startsWith('/language')) action = { type: 'CHANGE_LANGUAGE' };
      else if (text.startsWith('/')) {
        await ctx.reply(this.i18n.translate(TranslationKey.COMMAND_UNKNOWN, lang));
        return;
      } else {
        // --- GLOBAL MENU BUTTON INTERCEPTION ---
        // Because the ReplyKeyboard remains visible during text-input states,
        // users will naturally tap these buttons. We intercept them globally
        // to prevent them from being captured as prayer draft text.
        const submitLabel = this.i18n.translate(TranslationKey.MENU_SUBMIT, lang);
        const langLabel = this.i18n.translate(TranslationKey.MENU_CHANGE_LANGUAGE, lang);
        const privacyLabel = this.i18n.translate(TranslationKey.MENU_PRIVACY, lang);
        const helpLabel = this.i18n.translate(TranslationKey.MENU_HELP, lang);

        let menuAction: ConversationAction | null = null;
        if (text === submitLabel) menuAction = { type: 'START_SUBMISSION' };
        else if (text === langLabel) menuAction = { type: 'CHANGE_LANGUAGE' };
        else if (text === privacyLabel) menuAction = { type: 'SHOW_PRIVACY_DETAILS' };
        else if (text === helpLabel) menuAction = { type: 'SHOW_HELP' };

        if (menuAction && session?.state !== ConversationState.SUBMISSION_PROCESSING) {
          // If they tap "Submit" while already waiting for prayer, just ignore it
          if (
            menuAction.type === 'START_SUBMISSION' &&
            session?.state === ConversationState.WAITING_FOR_PRAYER
          ) {
            action = null;
          } else {
            action = menuAction;
          }
        }
        // --- CONTEXT-AWARE STATE HANDLING ---
        else if (session?.state === ConversationState.WAITING_FOR_PRAYER) {
          // Validate text immediately upon receipt
          const validation = this.validator.validate(text);
          if (!validation.valid) {
            const errorKey =
              validation.reason === 'EMPTY'
                ? TranslationKey.ERROR_EMPTY_REQUEST
                : TranslationKey.ERROR_TOO_LONG;
            await ctx.reply(this.i18n.translate(errorKey, lang), {
              reply_markup: this.keyboards.cancelAction(lang),
            });
            return;
          }

          action = { type: 'SUBMIT_DRAFT_TEXT', text };
        } else if (session?.state === ConversationState.MAIN_MENU) {
          // Fallback for unknown text in main menu
          action = { type: 'SHOW_MAIN_MENU' };
        } else if (session?.state === ConversationState.REVIEWING_REQUEST) {
          // In review state, remind user to use review buttons
          await ctx.reply(this.i18n.translate(TranslationKey.REVIEW_WARNING, lang), {
            reply_markup: this.keyboards.reviewRequest(lang),
          });
          return;
        }
      }
    }
    // 3. Handle Unsupported Media
    else {
      if (session?.state === ConversationState.WAITING_FOR_PRAYER) {
        await ctx.reply(this.i18n.translate(TranslationKey.ERROR_UNSUPPORTED_MEDIA, lang), {
          reply_markup: this.keyboards.cancelAction(lang),
        });
      }
      return;
    }

    if (!action) return;

    // --- Submission Processing with Duplicate Click Prevention ---
    if (action.type === 'CONFIRM_SUBMISSION') {
      // Guard 1: Prevent duplicate submission if already processing
      if (session?.state === ConversationState.SUBMISSION_PROCESSING) {
        logger.info(
          { event: 'duplicate_submission_attempt_ignored' },
          'Duplicate submission click ignored',
        );
        return;
      }

      // Guard 2: Require valid review state
      if (session?.state !== ConversationState.REVIEWING_REQUEST) {
        await ctx.reply(this.i18n.translate(TranslationKey.ERROR_INVALID_CALLBACK, lang));
        return;
      }

      // Guard 3: Reject concurrent duplicate clicks within this process
      if (this.submissionsInProgress.has(chatId)) {
        logger.info(
          { event: 'duplicate_submission_attempt_ignored' },
          'Duplicate submission click ignored',
        );
        return;
      }

      this.submissionsInProgress.add(chatId);

      try {
        const draft = await this.conversationService.getDraft(chatId);

        if (!draft) {
          await ctx.reply(this.i18n.translate(TranslationKey.ERROR_SESSION_EXPIRED, lang));
          await this.conversationService.handleAction(chatId, { type: 'CANCEL' });
          return;
        }

        // Lock state to processing immediately to block rapid repeat clicks
        await this.conversationService.handleAction(chatId, { type: 'CONFIRM_SUBMISSION' });

        // Execute the core business use case (validation + encryption + persistence)
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
        return;
      } catch (error) {
        if (error instanceof ApplicationError) {
          let errorKey = TranslationKey.ERROR_GENERAL;
          if (error.code === ErrorCode.INVALID_INPUT) {
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

        // Revert to reviewing state so user can retry or cancel without losing draft
        await this.conversationService.handleAction(chatId, { type: 'EDIT_DRAFT' });
        return;
      } finally {
        this.submissionsInProgress.delete(chatId);
      }
    }

    // Cancellation Feedback
    const hadActiveDraft =
      Boolean(session?.draftText) || session?.state === ConversationState.WAITING_FOR_PRAYER;

    // Execute standard action and render resulting state
    const newSession = await this.conversationService.handleAction(chatId, action);

    if (action.type === 'CANCEL' && hadActiveDraft) {
      await ctx.reply(this.i18n.translate(TranslationKey.CANCELLATION_SUCCESS, lang));
    }

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
          reply_markup: this.keyboards.backAction(lang),
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
        break;
    }
  }
}
