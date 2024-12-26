import { Injectable, Logger } from '@nestjs/common';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Api } from 'telegram';

@Injectable()
export class TelegramClientService {
  private readonly logger: Logger = new Logger(TelegramClientService.name);
  private readonly client: TelegramClient;

  constructor(
    apiId: number,
    apiHash: string,
    phoneNumber: string,
    session: string,
  ) {
    const stringSession = new StringSession(session);
    this.client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
    });
  }

  async start() {
    if (!this.client.connected) {
      await this.client.connect();
      this.logger.log('Connected to Telegram');
    }
  }

  async getLatestMessage(
    chatId: string,
    startTimestamp: number = 0,
  ): Promise<Api.Message[]> {
    try {
      const result = await this.client.getMessages(chatId, {
        limit: 100,
        offsetDate: startTimestamp,
      });
      return result;
    } catch (e) {
      this.logger.error(`Get latest message error: ${e}`);
      return [];
    }
  }
}
