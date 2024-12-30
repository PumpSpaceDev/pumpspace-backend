import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import readline from 'readline';
import { Logger } from '@nestjs/common';

interface ChatData {
  chatId: string;
  username: string;
  entityId: bigInt.BigInteger;
  title: string;
  description: string;
  logo: string;
  lastMessage: Api.Message[];
  participants: number;
}

export class TelegramClientService {
  private readonly logger: Logger = new Logger(TelegramClientService.name);
  private client: TelegramClient;
  private stringSession: string = '';
  private readonly phoneNumber: string = '';

  constructor(
    apiId: number,
    apiHash: string,
    phoneNumber: string,
    session: string,
  ) {
    this.phoneNumber = phoneNumber;
    this.stringSession = session;
    // Initialize Telegram client with StringSession
    this.client = new TelegramClient(
      new StringSession(this.stringSession),
      apiId,
      apiHash,
      {
        connectionRetries: 5,
      },
    );
  }

  async start() {
    if (!this.stringSession) {
      try {
        this.logger.log('Starting Telegram client...');
        const readlineInterface: readline.Interface = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        await this.client.start({
          phoneNumber: this.phoneNumber!,
          phoneCode: async () => {
            const code = await new Promise<string>((resolve) =>
              readlineInterface.question(
                `Login phone number is ${this.phoneNumber}, please enter the code you received: `,
                resolve,
              ),
            );
            return code;
          },
          onError: (err) => {
            this.logger.error('Error during login:', err.stack);
          },
        });

        // Save the session
        console.log('login session is : ', this.client.session.save());
        readlineInterface.close();
      } catch (err) {
        this.logger.error('Error in start method:', err);
      }
    }
    if (!this.client.connected) {
      await this.client.connect();
    }
  }

  /**
   * Get dialogs (groups and channels)
   */
  async getAllGroupAndChannel(): Promise<ChatData[]> {
    const dialogs = await this.client.getDialogs();
    const chatDataList: ChatData[] = dialogs
      .map((dialog) => {
        const isGroup = dialog.isGroup;
        const isChannel = dialog.isChannel;
        if (!isChannel && !isGroup) {
          return null;
        }
        const entity: any = dialog.entity!;
        return {
          chatId: dialog.id!.toString(),
          entityId: dialog.entity!.id,
          username: entity!.username || '',
          title: entity!.title || dialog.title,
          description: '',
          logo: '',
          lastMessage: [],
          participants: entity!.participantsCount || 0,
        } as ChatData;
      })
      .filter((chatData): chatData is ChatData => chatData !== null);

    return chatDataList;
  }

  /**
   * Get latest dialogs (groups and channels) and their latest message
   */
  async getLatestMessage(
    chatId: string,
    offsetDate: number = 0,
    limit: number = 600,
  ): Promise<Api.Message[]> {
    if (!this.client.connected) {
      await this.client.connect();
    }
    return await this.client.getMessages(chatId, {
      offsetDate,
      limit,
      reverse: true,
    });
  }
}
