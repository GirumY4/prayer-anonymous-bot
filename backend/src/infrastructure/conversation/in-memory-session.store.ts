import type { SessionStore } from '../../modules/conversation/session.store.js';
import type { ConversationSession } from '../../modules/conversation/conversation.types.js';

export class InMemorySessionStore implements SessionStore {
  private sessions = new Map<string, ConversationSession>();

  async get(chatId: string): Promise<ConversationSession | null> {
    return this.sessions.get(chatId) ?? null;
  }

  async set(session: ConversationSession): Promise<void> {
    this.sessions.set(session.chatId, session);
  }

  async delete(chatId: string): Promise<void> {
    this.sessions.delete(chatId);
  }

  async clearExpired(now: Date): Promise<number> {
    let cleared = 0;
    for (const [chatId, session] of this.sessions.entries()) {
      if (session.expiresAt <= now) {
        this.sessions.delete(chatId);
        cleared++;
      }
    }
    return cleared;
  }
}
