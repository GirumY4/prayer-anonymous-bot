import type { SessionStore } from './session.store.js';
import type { ConversationSession, ConversationAction } from './conversation.types.js';
import { ConversationState } from './conversation.state.js';
import type { SupportedLanguage } from '../localization/localization.types.js';

export interface ConversationService {
  handleAction(chatId: string, action: ConversationAction): Promise<ConversationSession>;
  getDraft(chatId: string): Promise<string | null>;
  clearSession(chatId: string): Promise<void>;
  getSession(chatId: string): Promise<ConversationSession | null>;
}

export class DefaultConversationService implements ConversationService {
  constructor(
    private readonly sessionStore: SessionStore,
    private readonly sessionTtlMinutes: number,
    private readonly defaultLanguage: SupportedLanguage,
  ) {}

  async handleAction(chatId: string, action: ConversationAction): Promise<ConversationSession> {
    let session = await this.sessionStore.get(chatId);
    const now = new Date();

    // 1. Handle Expiration
    if (session && session.expiresAt <= now) {
      session = null; // Force reset to initial state
    }

    // 2. Initialize if new or expired
    if (!session) {
      session = this.createDefaultSession(chatId);
    }

    // 3. Process State Transition
    session = this.transition(session, action);

    // 4. Refresh TTL on valid activity
    session.expiresAt = this.calculateExpiration(now);

    // 5. Persist
    await this.sessionStore.set(session);
    return session;
  }

  async getDraft(chatId: string): Promise<string | null> {
    const session = await this.sessionStore.get(chatId);
    return session?.draftText ?? null;
  }

  async clearSession(chatId: string): Promise<void> {
    await this.sessionStore.delete(chatId);
  }

  private createDefaultSession(chatId: string): ConversationSession {
    return {
      chatId,
      state: ConversationState.LANGUAGE_SELECTION,
      language: this.defaultLanguage,
      expiresAt: this.calculateExpiration(new Date()),
    };
  }

  private calculateExpiration(now: Date): Date {
    return new Date(now.getTime() + this.sessionTtlMinutes * 60 * 1000);
  }

  private transition(
    session: ConversationSession,
    action: ConversationAction,
  ): ConversationSession {
    const nextState = { ...session };

    switch (session.state) {
      case ConversationState.LANGUAGE_SELECTION:
        if (action.type === 'SELECT_LANGUAGE') {
          nextState.language = action.language;
          if (session.previousState === ConversationState.WAITING_FOR_PRAYER) {
            nextState.state = ConversationState.WAITING_FOR_PRAYER;
          } else if (
            session.previousState === ConversationState.MAIN_MENU ||
            session.privacyAcknowledged
          ) {
            nextState.state = ConversationState.MAIN_MENU;
          } else {
            nextState.state = ConversationState.PRIVACY_NOTICE;
          }
          delete nextState.previousState;
        }
        break;

      case ConversationState.PRIVACY_NOTICE:
        if (action.type === 'ACKNOWLEDGE_PRIVACY') {
          nextState.privacyAcknowledged = true;
          nextState.state = ConversationState.MAIN_MENU;
        } else if (action.type === 'SELECT_LANGUAGE') {
          // Language may still be corrected while the notice is displayed,
          // but the notice itself must never be skipped.
          nextState.language = action.language;
        } else if (action.type === 'SHOW_PRIVACY_DETAILS') {
          nextState.previousState = ConversationState.PRIVACY_NOTICE;
          nextState.state = ConversationState.PRIVACY_DETAILS;
        }
        break;

      case ConversationState.MAIN_MENU:
        if (action.type === 'START_SUBMISSION') {
          nextState.state = ConversationState.WAITING_FOR_PRAYER;
        } else if (action.type === 'CHANGE_LANGUAGE') {
          nextState.previousState = ConversationState.MAIN_MENU;
          nextState.state = ConversationState.LANGUAGE_SELECTION;
        } else if (action.type === 'SHOW_PRIVACY_DETAILS') {
          nextState.previousState = ConversationState.MAIN_MENU;
          nextState.state = ConversationState.PRIVACY_DETAILS;
        } else if (action.type === 'SHOW_HELP') {
          nextState.previousState = ConversationState.MAIN_MENU;
          nextState.state = ConversationState.HELP;
        }
        break;

      case ConversationState.PRIVACY_DETAILS:
        if (
          action.type === 'NAV_BACK' ||
          action.type === 'SHOW_MAIN_MENU' ||
          action.type === 'CANCEL'
        ) {
          if (session.previousState === ConversationState.PRIVACY_NOTICE) {
            nextState.state = ConversationState.PRIVACY_NOTICE;
          } else if (session.previousState === ConversationState.LANGUAGE_SELECTION) {
            // Returning from onboarding must not skip the language/privacy flow
            nextState.state = ConversationState.LANGUAGE_SELECTION;
          } else {
            nextState.state = ConversationState.MAIN_MENU;
          }
          delete nextState.previousState;
        } else if (action.type === 'CHANGE_LANGUAGE') {
          nextState.previousState = ConversationState.PRIVACY_DETAILS;
          nextState.state = ConversationState.LANGUAGE_SELECTION;
        }
        break;

      case ConversationState.HELP:
        if (
          action.type === 'NAV_BACK' ||
          action.type === 'SHOW_MAIN_MENU' ||
          action.type === 'CANCEL'
        ) {
          // Return to the screen help was opened from so onboarding and drafts
          // are never lost, falling back to the main menu.
          nextState.state = session.previousState ?? ConversationState.MAIN_MENU;
          delete nextState.previousState;
        } else if (action.type === 'CHANGE_LANGUAGE') {
          nextState.previousState = ConversationState.HELP;
          nextState.state = ConversationState.LANGUAGE_SELECTION;
        }
        break;

      case ConversationState.WAITING_FOR_PRAYER:
        if (action.type === 'SUBMIT_DRAFT_TEXT') {
          nextState.draftText = action.text;
          nextState.state = ConversationState.REVIEWING_REQUEST;
        } else if (action.type === 'CANCEL') {
          delete nextState.draftText;
          nextState.state = ConversationState.MAIN_MENU;
        } else if (action.type === 'CHANGE_LANGUAGE') {
          nextState.previousState = ConversationState.WAITING_FOR_PRAYER;
          nextState.state = ConversationState.LANGUAGE_SELECTION;
        }
        break;

      case ConversationState.REVIEWING_REQUEST:
        if (action.type === 'CONFIRM_SUBMISSION') {
          nextState.state = ConversationState.SUBMISSION_PROCESSING;
        } else if (action.type === 'EDIT_DRAFT') {
          nextState.state = ConversationState.WAITING_FOR_PRAYER;
        } else if (action.type === 'CANCEL') {
          delete nextState.draftText;
          nextState.state = ConversationState.MAIN_MENU;
        }
        break;

      case ConversationState.SUBMISSION_PROCESSING:
        if (action.type === 'COMPLETE_SUBMISSION' || action.type === 'CANCEL') {
          delete nextState.draftText;
          nextState.state = ConversationState.MAIN_MENU;
        } else if (action.type === 'EDIT_DRAFT') {
          nextState.state = ConversationState.REVIEWING_REQUEST;
        }
        break;
    }

    // Global Override: /start command behavior
    if (action.type === 'START') {
      delete nextState.draftText;
      // If they haven't acknowledged privacy yet, restart onboarding
      if (
        session.state === ConversationState.LANGUAGE_SELECTION ||
        session.state === ConversationState.PRIVACY_NOTICE
      ) {
        nextState.state = ConversationState.LANGUAGE_SELECTION;
      } else {
        nextState.state = ConversationState.MAIN_MENU;
      }
    }

    // Global Override: informational commands must work from every state,
    // including onboarding, where they used to be silently ignored.
    if (action.type === 'SHOW_HELP' && session.state !== ConversationState.HELP) {
      nextState.previousState = session.state;
      nextState.state = ConversationState.HELP;
    } else if (
      action.type === 'SHOW_PRIVACY_DETAILS' &&
      session.state !== ConversationState.PRIVACY_DETAILS
    ) {
      nextState.previousState = session.state;
      nextState.state = ConversationState.PRIVACY_DETAILS;
    }

    return nextState;
  }

  async getSession(chatId: string): Promise<ConversationSession | null> {
    const session = await this.sessionStore.get(chatId);
    if (session && session.expiresAt <= new Date()) {
      return null; // Treat expired as null for reading
    }
    return session;
  }
}
