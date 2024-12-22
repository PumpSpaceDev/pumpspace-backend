import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenBucket } from './entities/token-bucket.entity';
import { ConfigService } from '@app/config';
import { RedisPubSubService } from '@app/shared';
import { SharedRedisService } from '@app/shared/services/shared-redis.service';
import { SolanaRpcService } from '@app/shared/services/solana-rpc.service';
import { SwapDto } from '@app/interfaces';
import { PublicKey } from '@solana/web3.js';

@Injectable()
export class AnalysisStatisticsService implements OnModuleInit {
  private readonly logger = new Logger(AnalysisStatisticsService.name);
  private readonly bucketWindows = ['5m', '1h', '24h'];
  private persistenceInterval: NodeJS.Timeout;

  private readonly PERSISTENCE_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectRepository(TokenBucket)
    private readonly tokenBucketRepository: Repository<TokenBucket>,
    private readonly configService: ConfigService,
    private readonly redisPubSubService: RedisPubSubService,
    private readonly redisService: SharedRedisService,
    private readonly solanaRpcService: SolanaRpcService,
  ) {}
  onModuleInit() {
    this.redisPubSubService.subscribeRaydiumSwap(this.processTransaction);
    this.startPeriodicPersistence();
  }

  private startPeriodicPersistence() {
    this.persistenceInterval = setInterval(async () => {
      try {
        this.logger.log('Starting periodic persistence of token statistics...');
        const now = new Date();

        for (const window of this.bucketWindows) {
          const pattern = `*:${window}:${this.getBucketTimestamp(now, window)}`;
          const keys = await this.redisService.keys(pattern);

          for (const key of keys) {
            const bucket = await this.redisService.get(key);
            if (bucket) {
              const [tokenId] = key.split(':');
              await this.persistBucketIfNeeded(
                tokenId,
                key,
                bucket.volume,
                bucket.price,
                new Date(bucket.lastUpdated),
              );
            }
          }
        }

        this.logger.log('Completed periodic persistence of token statistics');
      } catch (error) {
        this.logger.error('Error during periodic persistence:', error);
      }
    }, this.PERSISTENCE_INTERVAL);
  }

  //TODO
  /**
   * step1. get token info from solana rpc
   * step2. analyze token info to real buy and sell
   * step3. update token statistics
   * step4. publish smart money match
   * @param transaction
   * @returns
   */
  private async processTransaction(transaction: SwapDto) {
    try {
      if (
        !transaction?.amm ||
        !transaction?.amountIn ||
        !transaction?.amountOut
      ) {
        this.logger.warn('Invalid transaction data received:', transaction);
        return;
      }

      const ammAccount = transaction.amm;
      let poolInfo = await this.redisService.hgetall(`amm:${ammAccount}`);

      if (!poolInfo || Object.keys(poolInfo).length === 0) {
        const response =
          await this.solanaRpcService.getAmmAccountInfo(ammAccount);
        if (!response) {
          this.logger.error(`AMM Pool ${ammAccount} not found.`);
          return;
        }
        poolInfo = this.parseAmmData(response);
        await this.redisService.hset(
          `amm:${ammAccount}`,
          'data',
          JSON.stringify(poolInfo),
        );
        await this.redisService.expire(`amm:${ammAccount}`, 86400); // Cache for 1 day
      } else {
        poolInfo = JSON.parse(poolInfo.data);
      }

      const isBuy = this.determineBuyOrSell(transaction, poolInfo);
      const parsedEvent = this.createParsedEvent(transaction, poolInfo, isBuy);

      await this.redisService.publish('smart-money:matches', parsedEvent);
      this.logger.log(`Published parsed event: ${JSON.stringify(parsedEvent)}`);

      await this.updateTokenStatistics(
        transaction.amm,
        transaction.amountIn,
        transaction.amountOut,
      );

      if (
        transaction.signer &&
        (await this.isSmartMoneyAddress(transaction.signer))
      ) {
        await this.publishSmartMoneyMatch(parsedEvent);
      }
    } catch (error) {
      this.logger.error(`Error processing transaction: ${error.message}`);
    }
  }

  private parseAmmData(accountInfo: any): Record<string, string> {
    try {
      // Basic AMM pool data structure
      const data = {
        baseToken: accountInfo.owner.toString(),
        quoteToken: new PublicKey(accountInfo.data.slice(0, 32)).toString(),
        baseReserve: BigInt(
          '0x' + accountInfo.data.slice(32, 40).toString('hex'),
        ).toString(),
        quoteReserve: BigInt(
          '0x' + accountInfo.data.slice(40, 48).toString('hex'),
        ).toString(),
        lastUpdateTime: new Date().toISOString(),
      };
      return { data: JSON.stringify(data) };
    } catch (error) {
      this.logger.error(`Error parsing AMM data: ${error.message}`);
      return null;
    }
  }

  private determineBuyOrSell(transaction: SwapDto, poolInfo: any): boolean {
    try {
      // Determine if this is a buy or sell based on token flow
      // true = buy, false = sell
      const tokenInIsBase = transaction.tokenIn === poolInfo.baseToken;
      return !tokenInIsBase; // If tokenIn is base token, it's a sell
    } catch (error) {
      this.logger.error(`Error determining buy/sell: ${error.message}`);
      return false;
    }
  }

  private createParsedEvent(
    transaction: SwapDto,
    poolInfo: any,
    isBuy: boolean,
  ) {
    return {
      type: isBuy ? 'buy' : 'sell',
      timestamp: new Date().toISOString(),
      transaction: {
        hash: transaction.signature,
        signer: transaction.signer,
        amm: transaction.amm,
        amountIn: transaction.amountIn.toString(),
        amountOut: transaction.amountOut.toString(),
        tokenIn: transaction.tokenIn,
        tokenOut: transaction.tokenOut,
      },
      pool: {
        address: transaction.amm,
        baseToken: poolInfo.baseToken,
        quoteToken: poolInfo.quoteToken,
        baseReserve: poolInfo.baseReserve.toString(),
        quoteReserve: poolInfo.quoteReserve.toString(),
      },
    };
  }

  async getTokenStats(query: { tokenId: string; window: string }) {
    try {
      if (!this.bucketWindows.includes(query.window)) {
        throw new Error(`Invalid window: ${query.window}`);
      }

      const bucketKey = `${query.tokenId}:${query.window}`;

      const bucket = await this.tokenBucketRepository.findOne({
        where: { tokenId: query.tokenId, bucketKey },
      });

      if (!bucket) {
        return {
          tokenId: query.tokenId,
          window: query.window,
          volume: 0,
          price: 0,
          transactionCount: 0,
          lastUpdated: new Date(),
        };
      }

      return {
        tokenId: bucket.tokenId,
        window: query.window,
        volume: Number(bucket.bucketVolume),
        price: Number(bucket.bucketPrice),
        transactionCount: Number(bucket.transactionCount),
        lastUpdated: bucket.lastUpdated,
      };
    } catch (error) {
      this.logger.error('Error fetching token statistics:', error);
      throw error;
    }
  }

  private async updateTokenStatistics(
    tokenId: string,
    amountIn: bigint,
    amountOut: bigint,
  ) {
    const now = new Date();
    const volume = Number(amountIn);
    const price = Number(amountOut) / Number(amountIn);

    for (const window of this.bucketWindows) {
      const bucketKey = `${tokenId}:${window}:${this.getBucketTimestamp(now, window)}`;

      try {
        const existingBucket = (await this.redisService.get(bucketKey)) || {};

        const updatedBucket = {
          volume: (existingBucket.volume || 0) + volume,
          price: price,
          transactionCount: (existingBucket.transactionCount || 0) + 1,
          lastUpdated: now.toISOString(),
        };

        await this.redisService.set(
          bucketKey,
          updatedBucket,
          this.getWindowTTL(window),
        );

        await this.persistBucketIfNeeded(
          tokenId,
          bucketKey,
          updatedBucket.volume,
          updatedBucket.price,
          now,
        );
      } catch (error) {
        this.logger.error(
          `Error updating token statistics for ${tokenId}:`,
          error,
        );
      }
    }
  }

  private async persistBucketIfNeeded(
    tokenId: string,
    bucketKey: string,
    volume: number,
    price: number,
    timestamp: Date,
  ) {
    const bucket = new TokenBucket();
    bucket.tokenId = tokenId;
    bucket.bucketKey = bucketKey;
    bucket.bucketVolume = volume;
    bucket.bucketPrice = price;
    bucket.lastUpdated = timestamp;

    await this.tokenBucketRepository.save(bucket);
  }

  private async isSmartMoneyAddress(address: string): Promise<boolean> {
    const score = await this.redisService.hget(
      `smart-money:${address}`,
      'score',
    );
    return score !== null && Number(score) >= 80;
  }

  private async publishSmartMoneyMatch(transaction: any) {
    await this.redisService.publish('smart-money:matches', {
      address: transaction.signer,
      transaction: transaction,
      timestamp: new Date().toISOString(),
    });
  }

  private getBucketTimestamp(date: Date, window: string): string {
    const timestamp = Math.floor(date.getTime() / 1000);
    switch (window) {
      case '5m':
        return (Math.floor(timestamp / 300) * 300).toString();
      case '1h':
        return (Math.floor(timestamp / 3600) * 3600).toString();
      case '24h':
        return (Math.floor(timestamp / 86400) * 86400).toString();
      default:
        throw new Error(`Invalid window: ${window}`);
    }
  }

  private getWindowTTL(window: string): number {
    switch (window) {
      case '5m':
        return 600;
      case '1h':
        return 7200;
      case '24h':
        return 172800;
      default:
        throw new Error(`Invalid window: ${window}`);
    }
  }
}
