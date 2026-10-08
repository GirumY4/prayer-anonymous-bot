import type { OutgoingMessage } from '../telegram/telegram.types.js';

export interface MessageSplitter {
  split(text: string, limit?: number): OutgoingMessage[];
}

export class TelegramMessageSplitter implements MessageSplitter {
  split(text: string, limit: number = 4096): OutgoingMessage[] {
    if (text.length <= limit) {
      return [{ text }];
    }

    const messages: OutgoingMessage[] = [];
    const separator = '\n────────────────────\n';
    const parts = text.split(separator);

    let currentChunk = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;

      // Fallback: If a single prayer request somehow exceeds the limit, hard-split it
      if (part.length > limit) {
        if (currentChunk) {
          messages.push({ text: currentChunk });
          currentChunk = '';
        }
        for (let j = 0; j < part.length; j += limit) {
          messages.push({ text: part.slice(j, j + limit) });
        }
        continue;
      }

      const potentialChunk = currentChunk ? currentChunk + separator + part : part;

      if (potentialChunk.length <= limit) {
        currentChunk = potentialChunk;
      } else {
        messages.push({ text: currentChunk });
        currentChunk = part;
      }
    }

    if (currentChunk) {
      messages.push({ text: currentChunk });
    }

    return messages;
  }
}
