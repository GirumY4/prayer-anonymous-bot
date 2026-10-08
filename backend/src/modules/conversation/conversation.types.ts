import type { SupportedLanguage } from '../localization/localization.types.js';
import type { ConversationStateType } from './conversation.state.js';

export interface ConversationSession {
  chatId: string;
  state: ConversationStateType;
  language: SupportedLanguage;
  draftText?: string;
  expiresAt: Date;
}

export type ConversationAction =
  | { type: 'START' }
  | { type: 'SELECT_LANGUAGE'; language: SupportedLanguage }
  | { type: 'ACKNOWLEDGE_PRIVACY' }
  | { type: 'SHOW_MAIN_MENU' }
  | { type: 'SHOW_PRIVACY_DETAILS' }
  | { type: 'SHOW_HELP' }
  | { type: 'START_SUBMISSION' }
  | { type: 'SUBMIT_DRAFT_TEXT'; text: string }
  | { type: 'CONFIRM_SUBMISSION' }
  | { type: 'COMPLETE_SUBMISSION' }
  | { type: 'EDIT_DRAFT' }
  | { type: 'CANCEL' }
  | { type: 'CHANGE_LANGUAGE' };
