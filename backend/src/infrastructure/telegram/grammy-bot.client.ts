import { Bot } from 'grammy';
import type {
  TelegramMessenger,
  TelegramDestination,
  OutgoingMessage,
  SentMessage,
} from '../../modules/telegram/telegram.types.js';
import { env } from '../../config/env.js';

export class GrammyBotClient implements TelegramMessenger {
  constructor(private readonly bot: Bot) {}

  async sendText(destination: TelegramDestination, message: OutgoingMessage): Promise<SentMessage> {
    if (destination.type === 'pray_team_group') {
      // protect_content: true prevents forwarding/saving, adding defense-in-depth
      const result = await this.bot.api.sendMessage(env.PRAY_TEAM_CHAT_ID, message.text, {
        protect_content: true,
      });
      return { telegramMessageId: result.message_id };
    }
    throw new Error('Unknown Telegram destination type');
  }
}
