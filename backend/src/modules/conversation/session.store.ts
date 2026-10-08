import type { ConversationSession } from './conversation.types.js';

export interface SessionStore {
  get(chatId: string): Promise<ConversationSession | null>;
  set(session: ConversationSession): Promise<void>;
  delete(chatId: string): Promise<void>;
  clearExpired(now: Date): Promise<number>;
}
