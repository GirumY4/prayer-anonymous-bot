export interface TelegramDestination {
  type: 'pray_team_group';
}

export interface OutgoingMessage {
  text: string;
}

export interface SentMessage {
  telegramMessageId: number;
}

export interface TelegramMessenger {
  sendText(destination: TelegramDestination, message: OutgoingMessage): Promise<SentMessage>;
}
