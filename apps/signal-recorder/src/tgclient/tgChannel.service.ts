import * as fs from 'fs';
import * as path from 'path';
import { TelegramClientService } from './telegramClient.service';
import { MessageFormat, TokenRecommond } from './message.format';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { EvaluationStatus, SmartMoney, SmartMoneyType } from '@app/interfaces';
import { SolscanApiManager, TokenService } from '@app/shared';
import { InjectRepository } from '@nestjs/typeorm';
import { SignalRepository } from '@app/signal-analyzer/repositories/signal.repository';
import { SmartMoneyRepository } from 'apps/smart-money-evaluator/src/repositories/smart-money.repository';

const TGCHANNELLASTSYNCTIME_PATH = path.resolve(
  __dirname,
  '../../.tgChannelLastSyncTime',
);

@Injectable()
export class TgChannelService implements OnModuleInit {
  private readonly logger: Logger = new Logger(TgChannelService.name);
  public readonly telegramClientService: TelegramClientService;
  private readonly messageFormat = new MessageFormat();
  private isSyncing = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly signalRepository: SignalRepository,
    @InjectRepository(SmartMoney)
    private readonly smartMoneyRepository: SmartMoneyRepository,
    private readonly tokenService: TokenService,
    private readonly apiManager: SolscanApiManager,
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

  @Cron('*/2 * * * *')
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
      // web
    } catch (e) {
      this.logger.error(`Sync latest message error: ${e}`);
    }

    this.isSyncing = false;
  }

  /**
   * Sync latest message from telegram
   */
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

    // format to db model
    const signalTokens = [];
    for (const item of tokenRecommondResult) {
      try {
        const tokenMeta = await this.tokenService.getToken(item.token.address);
        if (!tokenMeta) {
          this.logger.error(
            `No token meta found for token ${item.token.symbol}`,
          );
          continue;
        }
        const ammPoolData = await this.tokenService.fetchAmmPoolData(
          item.token.address,
        );

        if (!ammPoolData) {
          this.logger.error(
            `No AMM pool data found for token ${item.token.symbol} ${item.token.address}`,
          );
          continue;
        }
        const poolState = await this.tokenService.getAmmPoolState(ammPoolData);
        if (!poolState) {
          this.logger.error(`Token meta not found for ${item.token.address}`);
          continue;
        }

        const marketCapLevel = this.tokenService.determineCategory(
          tokenMeta.market_cap,
        );

        signalTokens.push({
          uniqueCode: item.uniqueCode,
          tokenAddress: item.token.address,
          symbol: item.token.symbol,
          signalName: item.channelUsername,
          network: item.network,
          time: new Date(item.timestamp),
          price: poolState.price,
          reserve: poolState.reserve,
          marketCapLevel,
          evaluationStatus: EvaluationStatus.PENDING,
        });
      } catch (error) {
        this.logger.error(
          `Error fetching token data for ${item.token.address}: ${error}`,
        );
      }
    }

    const finalSignalTokens = [];
    for (const signalToken of signalTokens) {
      const accountType = await this.checkAddressType(signalToken.address);
      if (accountType !== AccountType.Account) {
        finalSignalTokens.push(signalToken);
      } else {
        this.logger.error(
          `Address ${signalToken.address} is an account type or unknown`,
        );
      }
    }

    const smartMoneyTmp = tokenRecommondResult.flatMap((item) =>
      item.records.map((record) => ({
        address: record.address,
        name: record.name,
        network: [item.network],
        type: SmartMoneyType[record.type] || SmartMoneyType.OTHER,
      })),
    );

    // smartMoneyTmp remove duplicate
    const smartMoneyResult = Array.from(
      new Map(
        smartMoneyTmp.map((record) => [
          `${record.address}_${record.network}`,
          record,
        ]),
      ).values(),
    );

    for (const smartMoney of smartMoneyResult) {
      const accountType = await this.checkAddressType(smartMoney.address);
      if (accountType === AccountType.Account) {
        // trigger sync job
        if (
          !(await this.smartMoneyRepository.findOneBy({
            address: smartMoney.address,
          }))
        ) {
          // to avoid default type is OTHER
          await this.smartMoneyRepository.saveSmartMoney(smartMoney);
          this.logger.debug(`Save smart money: ${smartMoney.address}`);
        }
      } else {
        this.logger.error(`Address ${smartMoney.address} is not account type`);
      }
    }

    // save to db
    await this.signalRepository.addManyWithIgnore(finalSignalTokens);
    this.logger.log(`Save signal tokens :${finalSignalTokens.length} `);
    await this.saveTgChannelLastSyncTime(endTimestamp + 1);
  }
  private readonly accountTypeMap = new Map<string, AccountType>();
  async checkAddressType(address: string): Promise<AccountType> {
    if (this.accountTypeMap.has(address)) {
      return this.accountTypeMap.get(address);
    }
    this.logger.debug(`Check address type: ${address}`);
    try {
      const info = await this.apiManager.fetchSolscanApi<AccountInfo>(
        'account/detail',
        { address },
      );
      // will exclude sol balance is 0 account
      if (
        info.owner_program === '11111111111111111111111111111111' &&
        info.type === 'system_account' &&
        info.is_oncurve === true
      ) {
        this.accountTypeMap.set(address, AccountType.Account);
        return AccountType.Account;
      } else if (info.type === 'token_account') {
        this.accountTypeMap.set(address, AccountType.Token);
        return AccountType.Token;
      }
      return AccountType.Unknown;
    } catch (e) {
      this.logger.error(`Check address type error: ${e}`);
      return AccountType.Unknown;
    }
  }

  /**
   * Get token from channel
   * @param chatIds chatId or username
   * @param limit limit message
   */
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
          this.logger.debug(
            `Start format messages from chatId: ${chatId}, i: ${i}, fetched ${latestMessages.length} messages`,
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

  /**
   *  Load last sync time from redis
   * @returns  last sync time
   */
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

  /**
   * Save last sync time to redis
   * @param time  last sync time
   */
  private async saveTgChannelLastSyncTime(time: number) {
    fs.writeFileSync(TGCHANNELLASTSYNCTIME_PATH, time.toString());
    this.logger.log(`Save last sync time: ${time}`);
  }
}

export interface AccountInfo {
  account: string;
  lamports: number;
  type: string;
  executable: boolean;
  owner_program: string;
  rent_epoch: number;
  is_oncurve: boolean;
}

enum AccountType {
  Account = 'account',
  Token = 'token',
  Unknown = 'unknown',
}
