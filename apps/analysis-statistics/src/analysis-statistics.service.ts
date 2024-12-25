import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenBucket } from './entities/token-bucket.entity';
import { ConfigService } from '@app/config';
import { bnLayoutFormatter, RedisPubSubService } from '@app/shared';
import { RedisCacheService, RedisService } from '@app/shared';
import { RaydiumSwapEvent, SwapDto } from '@app/interfaces';
import { HeliusApiManager } from '@app/shared';
import { liquidityStateV4Layout } from '@raydium-io/raydium-sdk-v2';
import BigNumber from 'bignumber.js';

const RAYDIUM_AUTHORITY_V4 = '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1';
const WSOL_MINT = 'So11111111111111111111111111111111111111112';
const WSOL_DECIMALS = 9;
enum BucketWindowEnum {
  FiveMin = '5m',
  OneHour = '1h',
  OneDay = '1d',
}
@Injectable()
export class AnalysisStatisticsService implements OnModuleInit {
  private readonly logger = new Logger(AnalysisStatisticsService.name);
  private readonly bucketWindows = [
    BucketWindowEnum.FiveMin,
    BucketWindowEnum.OneHour,
    BucketWindowEnum.OneDay,
  ];
  private persistenceInterval: NodeJS.Timeout;

  private readonly PERSISTENCE_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectRepository(TokenBucket)
    private readonly tokenBucketRepository: Repository<TokenBucket>,
    private readonly configService: ConfigService,
    private readonly redisPubSubService: RedisPubSubService,
    private readonly redisService: RedisService,
    private readonly redisCacheService: RedisCacheService,
    private readonly heliusApiManager: HeliusApiManager,
  ) {}
  onModuleInit() {
    this.redisPubSubService.subscribeRaydiumSwap(this.processTransaction);
    // this.startPeriodicPersistence();
  }

  //TODO
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
            if (
              bucket &&
              bucket.volume &&
              bucket.priceReciprocal &&
              bucket.lastUpdated
            ) {
              const [tokenId] = key.split(':');
              await this.persistBucketIfNeeded(
                tokenId,
                key,
                Number(bucket.volume),
                Number(bucket.priceReciprocal),
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

      const poolInfo = await this.redisCacheService.getPoolInfo(
        transaction.amm,
        async (amm) => {
          const accountInfoResult = await this.heliusApiManager.getAccountInfo(
            amm,
            {
              getIdentifier: () => amm,
              callback: (identifier: string, count: number) => {
                this.logger.error(
                  `Request limit exceeded for ${identifier}. Total: ${count}`,
                );
                throw new Error(`Request limit exceeded for ${identifier}`);
              },
              getMaxExecutions: () => 5,
            },
            {
              retries: 3,
              timeout: 10000,
            },
          );
          const data = accountInfoResult?.value?.data?.at(0);
          if (!data) {
            this.logger.error(`AMM Pool ${amm} not found.`);
            throw new Error(`AMM Pool ${amm} not found.`);
          }
          const ammData = liquidityStateV4Layout.decode(Buffer.from(data));
          bnLayoutFormatter(ammData);
          return {
            baseMint: ammData.baseMint.toString(),
            quoteMint: ammData.quoteMint.toString(),
            baseVault: ammData.baseVault.toString(),
            quoteVault: ammData.quoteVault.toString(),
            baseReserve: 0,
            quoteReserve: 0,
          };
        },
      );

      if (!poolInfo) {
        this.logger.error('Pool info not found:', transaction.amm);
        return;
      }

      // only handle WSOL pairs
      // only for Raydium
      // pumpfun pool is not supported, because the base token of pumpfun pool is SOL
      if (poolInfo.baseMint !== WSOL_MINT && poolInfo.quoteMint !== WSOL_MINT) {
        this.logger.error(
          `niether baseMint nor quoteMint is WSOL, amm: ${transaction.amm}`,
        );
        return;
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

      const memeTokenDesimals = transaction.postTokenBalances.find(
        (balance) => balance.mint === memeTokenMint,
      ).uiTokenAmount.decimals;
      const baseVaultPostBalance = transaction.postTokenBalances.find(
        (balance) =>
          balance.mint === poolInfo.baseMint &&
          balance.owner === RAYDIUM_AUTHORITY_V4,
      ).uiTokenAmount.amount;
      const quoteVaultPostBalance = transaction.postTokenBalances.find(
        (balance) =>
          balance.mint === poolInfo.quoteMint &&
          balance.owner === RAYDIUM_AUTHORITY_V4,
      ).uiTokenAmount.amount;

      const parsedEvent: RaydiumSwapEvent = {
        signature: transaction.signature,
        timestamp: transaction.timestamp.toISOString(),
        amm: transaction.amm,
        user: transaction.signer,
        isBuy,
        tokenIn: isBuy ? WSOL_MINT : memeTokenMint,
        tokenOut: isBuy ? memeTokenMint : WSOL_MINT,
        tokenInDecimals: isBuy ? WSOL_DECIMALS : (memeTokenDesimals ?? 6),
        tokenOutDecimals: isBuy ? (memeTokenDesimals ?? 6) : WSOL_DECIMALS,
        tokenInAmount: transaction.amountIn.toString(),
        tokenOutAmount: transaction.amountOut.toString(),
        baseVaultPostBalance: baseVaultPostBalance,
        quoteVaultPostBalance: quoteVaultPostBalance,
      };
      if (await this.isSmartMoneyAddress(transaction.signer)) {
        this.redisPubSubService.publishSmartMoneyMatches(parsedEvent);
      }

      const tokenAmount = isBuy ? transaction.amountOut : transaction.amountIn;
      const wSolAmount = isBuy ? transaction.amountIn : transaction.amountOut;
      await this.updateTokenStatistics(
        memeTokenMint,
        formatToken(tokenAmount, memeTokenDesimals),
        formatSol(wSolAmount),
      );
    } catch (error) {
      this.logger.error('Error processing transaction:', error);
      this.logger.error('Transaction data:', transaction);
    }
  }

  //TODO incomplete
  async getTokenStats(query: { tokenId: string; window: BucketWindowEnum }) {
    if (!this.bucketWindows.includes(query.window)) {
      throw new Error(`Invalid window: ${query.window}`);
    }
    try {
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
        price: Number(bucket.priceReciprocal),
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
    volume: number,
    solAmount: number,
  ) {
    const now = new Date();

    for (const window of this.bucketWindows) {
      const bucketKey = `${tokenId}:${window}:${this.getBucketTimestamp(now, window)}`;

      try {
        const existingBucket = await this.redisService.hgetall(bucketKey);

        const updatedBucket = {
          volume: (Number(existingBucket?.volume) || 0) + volume,
          // NOTE: here is not the real price, it's the reciprocal of the price
          // to avoid floating point arithmetic
          priceReciprocal: (volume / solAmount).toFixed(6),
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
          'priceReciprocal',
          updatedBucket.priceReciprocal,
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

        // await this.persistBucketIfNeeded(
        //   tokenId,
        //   bucketKey,
        //   updatedBucket.volume,
        //   updatedBucket.priceReciprocal,
        //   now,
        // );
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
    priceReciprocal: number,
    timestamp: Date,
  ) {
    const bucket = new TokenBucket();
    bucket.tokenId = tokenId;
    bucket.bucketKey = bucketKey;
    bucket.bucketVolume = volume;
    bucket.priceReciprocal = priceReciprocal;
    bucket.lastUpdated = timestamp;

    await this.tokenBucketRepository.save(bucket);
  }

  //TODO incomplete
  private async isSmartMoneyAddress(address: string): Promise<boolean> {
    const score = await this.redisService.hget(
      `smart-money:${address}`,
      'score',
    );
    return score !== null && Number(score) >= 80;
  }

  //TODO incomplete
  // 这里理解有误差。比如 5m 的数据是为了计算1h 用的。
  // 1h 的数据是为了计算 1d 用的。所以过期时间 要根据使用目的来设置
  private getBucketTimestamp(date: Date, window: BucketWindowEnum): string {
    const timestamp = Math.floor(date.getTime() / 1000);
    switch (window) {
      case BucketWindowEnum.FiveMin:
        return (Math.floor(timestamp / 300) * 300).toString();
      case BucketWindowEnum.OneHour:
        return (Math.floor(timestamp / 3600) * 3600).toString();
      case BucketWindowEnum.OneDay:
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

function formatSol(lamports: bigint): number {
  return formatToken(lamports, WSOL_DECIMALS);
}
function formatToken(lamports: bigint, decimals: number): number {
  return Number(
    new BigNumber(lamports.toString()).div(10 ** decimals).toFixed(3),
  );
}
