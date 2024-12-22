import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenBucket } from './entities/token-bucket.entity';
import { ConfigService } from '@app/config';
import { RedisPubSubService } from '@app/shared';
import { RedisService } from '@app/shared/redis';
import { SolanaRpcService } from '@app/shared/services/solana-rpc.service';
import { SwapDto } from '@app/interfaces';

const WSOL_MINT = 'So11111111111111111111111111111111111111112';
const WSOL_DECIMALS = 9;

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
    private readonly redisService: RedisService,
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
          const publisher = this.redisService.getPublisher();
          const keys = await publisher.keys(pattern);

          for (const key of keys) {
            const bucket = await this.redisService.hgetall(key);
            if (bucket && bucket.volume && bucket.price && bucket.lastUpdated) {
              const [tokenId] = key.split(':');
              await this.persistBucketIfNeeded(
                tokenId,
                key,
                Number(bucket.volume),
                Number(bucket.price),
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
        !transaction?.amountOut ||
        !transaction?.signer
      ) {
        this.logger.warn('Invalid transaction data received:', transaction);
        return;
      }

      const ammAccount = transaction.amm;
      let poolInfo = JSON.parse(
        (await this.redisService.hget(`amm:${ammAccount}`, 'data')) || 'null',
      );

      if (!poolInfo) {
        const response =
          await this.solanaRpcService.getAmmAccountInfo(ammAccount);
        if (!response || !response.data) {
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
      }

      const memeTokenMint =
        poolInfo.baseMint === WSOL_MINT
          ? poolInfo.quoteMint
          : poolInfo.baseMint;

      let isBuy = false;
      if (poolInfo.baseMint === WSOL_MINT) {
        isBuy = transaction.direction === 2;
      } else if (poolInfo.quoteMint === WSOL_MINT) {
        isBuy = transaction.direction === 1;
      }

      const parsedEvent = {
        signature: transaction.signature,
        timestamp: new Date().toISOString(),
        amm: ammAccount,
        user: transaction.signer,
        isBuy,
        tokenIn: isBuy ? WSOL_MINT : memeTokenMint,
        tokenOut: isBuy ? memeTokenMint : WSOL_MINT,
        tokenInDecimals: isBuy
          ? WSOL_DECIMALS
          : (transaction.tokenInDecimals ?? 9),
        tokenOutDecimals: isBuy
          ? (transaction.tokenOutDecimals ?? 9)
          : WSOL_DECIMALS,
        tokenInAmount: transaction.amountIn.toString(),
        tokenOutAmount: transaction.amountOut.toString(),
        pool: {
          address: ammAccount,
          baseToken: poolInfo.baseMint,
          quoteToken: poolInfo.quoteMint,
          baseReserve: poolInfo.baseReserve?.toString() || '0',
          quoteReserve: poolInfo.quoteReserve?.toString() || '0',
        },
      };

      await this.redisPubSubService.publishSmartMoneyMatches(parsedEvent);
      this.logger.log(`Published parsed event: ${JSON.stringify(parsedEvent)}`);

      await this.updateTokenStatistics(
        memeTokenMint,
        BigInt(transaction.amountIn),
        BigInt(transaction.amountOut),
      );

      if (await this.isSmartMoneyAddress(transaction.signer)) {
        await this.publishSmartMoneyMatch(parsedEvent);
      }
    } catch (error) {
      this.logger.error('Error processing transaction:', error);
      this.logger.error('Transaction data:', transaction);
    }
  }

  private parseAmmData(accountInfo: any) {
    try {
      const ammData = accountInfo.data;
      return {
        baseVault: ammData.baseVault.toString(),
        quoteVault: ammData.quoteVault.toString(),
        baseMint: ammData.baseMint.toString(),
        quoteMint: ammData.quoteMint.toString(),
        baseReserve: ammData.baseReserve,
        quoteReserve: ammData.quoteReserve,
        lastUpdateTime: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error parsing AMM data:', error);
      this.logger.error('Account info:', accountInfo);
      return null;
    }
  }

  // Buy/sell detection is now handled directly in processTransaction

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
    const volume = Number(amountIn.toString());
    const price = Number(amountOut.toString()) / Number(amountIn.toString());

    for (const window of this.bucketWindows) {
      const bucketKey = `${tokenId}:${window}:${this.getBucketTimestamp(now, window)}`;

      try {
        const existingBucket = await this.redisService.hgetall(bucketKey);

        const updatedBucket = {
          volume: (Number(existingBucket?.volume) || 0) + volume,
          price: price,
          transactionCount: (Number(existingBucket?.transactionCount) || 0) + 1,
          lastUpdated: now.toISOString(),
        };

        // Set each field individually
        await this.redisService.hset(
          bucketKey,
          'volume',
          updatedBucket.volume.toString(),
        );
        await this.redisService.hset(
          bucketKey,
          'price',
          updatedBucket.price.toString(),
        );
        await this.redisService.hset(
          bucketKey,
          'transactionCount',
          updatedBucket.transactionCount.toString(),
        );
        await this.redisService.hset(
          bucketKey,
          'lastUpdated',
          updatedBucket.lastUpdated,
        );
        await this.redisService.expire(bucketKey, this.getWindowTTL(window));

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
    await this.redisPubSubService.publishSmartMoneyMatches({
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
