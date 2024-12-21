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
    this.redis = new Redis(this.configService.getRedisConfig());
    this.subscribeToTransactions();
  }

  private async subscribeToTransactions() {
    const subscriber = new Redis(this.configService.getRedisConfig());

    subscriber.subscribe('raydium:transactions', (err) => {
      if (err) {
        this.logger.error('Failed to subscribe to Raydium transactions:', err);
        return;
      }
      this.logger.log('Subscribed to Raydium transactions');
    });

    subscriber.on('message', async (channel, message) => {
      try {
        const transaction = JSON.parse(message);
        await this.processTransaction(transaction);
      } catch (error) {
        this.logger.error('Error processing transaction:', error);
      }
    });
  }

  private async processTransaction(transaction: any) {
    await this.updateTokenStatistics(
      transaction.amm,
      transaction.amountIn,
      transaction.amountOut,
    );

    if (await this.isSmartMoneyAddress(transaction.signer)) {
      await this.publishSmartMoneyMatch(transaction);
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
