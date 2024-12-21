import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenBucket } from './entities/token-bucket.entity';
import Redis from 'ioredis';
import { ConfigService } from '@app/config';

@Injectable()
export class AnalysisStatisticsService {
  private readonly logger = new Logger(AnalysisStatisticsService.name);
  private readonly redis: Redis;
  private readonly bucketWindows = ['5m', '1h', '24h'];

  constructor(
    @InjectRepository(TokenBucket)
    private readonly tokenBucketRepository: Repository<TokenBucket>,
    private readonly configService: ConfigService,
  ) {
    this.redis = new Redis(this.configService.redisConfig);
    this.subscribeToTransactions();
  }

  private async subscribeToTransactions() {
    const subscriber = new Redis(this.configService.redisConfig);

    subscriber.subscribe('raydium:transactions', (err) => {
      if (err) {
        this.logger.error('Failed to subscribe to Raydium transactions:', err);
        setTimeout(() => this.subscribeToTransactions(), 5000); // Retry after 5 seconds
        return;
      }
      this.logger.log('Subscribed to Raydium transactions');
    });

    subscriber.on('error', (error) => {
      this.logger.error('Redis subscription error:', error);
      setTimeout(() => this.subscribeToTransactions(), 5000); // Retry after 5 seconds
    });

    subscriber.on('message', async (channel, message) => {
      try {
        const transaction = JSON.parse(message);
        await this.processTransaction(transaction);
      } catch (error) {
        this.logger.error('Error processing transaction:', error);
      }
    });

    process.on('beforeExit', () => {
      subscriber.disconnect();
      this.redis.disconnect();
    });
  }

  private async processTransaction(transaction: any) {
    try {
      if (
        !transaction?.amm ||
        !transaction?.amountIn ||
        !transaction?.amountOut
      ) {
        this.logger.warn('Invalid transaction data received:', transaction);
        return;
      }

      await this.updateTokenStatistics(
        transaction.amm,
        transaction.amountIn,
        transaction.amountOut,
      );

      if (
        transaction.signer &&
        (await this.isSmartMoneyAddress(transaction.signer))
      ) {
        await this.publishSmartMoneyMatch(transaction);
      }
    } catch (error) {
      this.logger.error('Error processing transaction:', error);
    }
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
        await this.redis.hset(bucketKey, {
          volume: volume.toString(),
          price: price.toString(),
          lastUpdated: now.toISOString(),
        });

        const ttl = this.getWindowTTL(window);
        await this.redis.expire(bucketKey, ttl);

        await this.persistBucketIfNeeded(
          tokenId,
          bucketKey,
          volume,
          price,
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
    const score = await this.redis.get(`smart-money:${address}`);
    return score !== null && Number(score) >= 80;
  }

  private async publishSmartMoneyMatch(transaction: any) {
    await this.redis.publish(
      'smart-money:matches',
      JSON.stringify({
        address: transaction.signer,
        transaction: transaction,
        timestamp: new Date().toISOString(),
      }),
    );
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
