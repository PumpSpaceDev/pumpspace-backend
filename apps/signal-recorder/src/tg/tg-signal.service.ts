import * as fs from 'fs';
import * as path from 'path';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Signal } from '@app/shared/entities';
import { Network } from '@app/interfaces/enums/network.enum';
import { SignalType } from '@app/interfaces/enums/signal-type.enum';
import { TelegramClientService } from './telegram-client.service';
import { MessageFormat, TokenRecommond } from './message.format';

const TGCHANNELLASTSYNCTIME_PATH = path.resolve(
  __dirname,
  '../../../.tgChannelLastSyncTime',
);

@Injectable()
export class TgSignalService implements OnModuleInit {
  private readonly logger: Logger = new Logger(TgSignalService.name);
  private readonly telegramClientService: TelegramClientService;
  private readonly messageFormat = new MessageFormat();
  private isSyncing = false;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Signal)
    private readonly signalRepository: Repository<Signal>,
  ) {
    const telegramConfig = this.configService.get('telegram');
    const { apiId, apiHash, phoneNumber, session } = telegramConfig;
    if (session) {
      this.telegramClientService = new TelegramClientService(
        apiId,
        apiHash,
        phoneNumber,
        session,
      );
    }
  }

  async onModuleInit() {
    this.syncLatestMessage();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async syncLatestMessage() {
    if (this.isSyncing) {
      this.logger.warn('Syncing is in progress');
      return;
    }
    this.isSyncing = true;
    try {
      this.logger.log('Start sync latest message');
      if (this.telegramClientService) {
        await this.syncLatestMessageFromTg();
      } else {
        this.logger.warn('No telegram client, may be session is empty');
      }
    } catch (e) {
      this.logger.error(`Sync latest message error: ${e}`);
    }

    this.isSyncing = false;
  }

  async syncLatestMessageFromTg(): Promise<void> {
    const handleMessageChannel: string[] =
      this.configService.get('telegram.channels');
    if (handleMessageChannel.length === 0) {
      this.logger.warn('No channel to sync');
      return;
    }
    await this.telegramClientService.start();

    const startTimestamp = await this.loadTgChannelLastSyncTime();
    this.logger.debug(
      `Sync from channels: ${handleMessageChannel.join(
        ',',
      )}, startTimestamp: ${new Date(startTimestamp * 1000).toLocaleString()}`,
    );
    const endTimestamp = Math.floor(Date.now() / 1000);

    const tokenRecommondResult = await this.getTokenFromChannel(
      handleMessageChannel,
      startTimestamp,
      endTimestamp,
    );

    const signals = tokenRecommondResult.map((item) => {
      const signal: DeepPartial<Signal> = {
        uniqueCode: item.uniqueCode,
        address: item.token.address,
        symbol: item.token.symbol || '',
        signal: SignalType.BUY, // Default to BUY signal for now
        network:
          Network[item.network.toUpperCase() as keyof typeof Network] ||
          Network.SOLANA,
        recommondTime: new Date(item.timestamp * 1000),
        done: false,
      };

      if (typeof item.token.price === 'number') {
        signal.price = item.token.price;
      }

      if (typeof item.token.reserve === 'number') {
        signal.reserve = item.token.reserve;
      }

      return signal;
    });

    await this.signalRepository.save(signals);
    this.logger.log(`Save signals: ${signals.length}`);
    await this.saveTgChannelLastSyncTime(endTimestamp + 1);
  }

  async getTokenFromChannel(
    chatIds: string[],
    startTimestamp: number = 0,
    endTimestamp: number = 0,
  ): Promise<TokenRecommond[]> {
    const tokens = await Promise.all(
      chatIds.map(async (chatId) => {
        let finalFormatTokens: TokenRecommond[] = [];
        let chatStarttimestamp = startTimestamp;
        for (let i = 0; i < 1000; i++) {
          this.logger.debug(
            `Start sync chatId: ${chatId}, i: ${i}, startTimestamp: ${new Date(
              chatStarttimestamp * 1000,
            ).toLocaleString()}`,
          );
          const latestMessages =
            await this.telegramClientService.getLatestMessage(
              chatId,
              chatStarttimestamp,
            );
          this.logger.debug(
            `End sync chatId: ${chatId}, i: ${i}, fetched messages: ${latestMessages.length}`,
          );
          const formatdTokens = await this.messageFormat.format(
            chatId,
            latestMessages,
          );
          this.logger.debug(
            `End format messages from chatId: ${chatId}, i: ${i}, fetched ${latestMessages.length} messages, formated ${formatdTokens.length} tokens`,
          );
          finalFormatTokens = finalFormatTokens.concat(formatdTokens);
          if (latestMessages.length === 0) {
            break;
          }
          chatStarttimestamp =
            latestMessages[latestMessages.length - 1].date + 1;
          if (chatStarttimestamp >= endTimestamp) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 1000 * 3));
        }

        this.logger.log(
          `End get token from chatId: ${chatId}, tokens: ${finalFormatTokens.length}`,
        );
        return finalFormatTokens;
      }),
    ).then((tokensArray) => tokensArray.flat());
    this.logger.log(
      `End get token from channels: ${chatIds}, tokens: ${tokens.length}`,
    );
    return tokens.filter((token) => token !== undefined) as TokenRecommond[];
  }

  private async loadTgChannelLastSyncTime() {
    const syncStartTime = this.configService.get('telegram.syncStartTime');
    if (fs.existsSync(TGCHANNELLASTSYNCTIME_PATH)) {
      const tgChannelLastSyncTime = fs.readFileSync(TGCHANNELLASTSYNCTIME_PATH);
      return tgChannelLastSyncTime
        ? Number(tgChannelLastSyncTime)
        : syncStartTime;
    } else {
      return syncStartTime;
    }
  }

  private async saveTgChannelLastSyncTime(time: number) {
    fs.writeFileSync(TGCHANNELLASTSYNCTIME_PATH, time.toString());
    this.logger.log(`Save last sync time: ${time}`);
  }
}
