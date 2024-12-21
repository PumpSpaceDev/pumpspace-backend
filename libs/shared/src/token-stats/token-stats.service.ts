import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis';

@Injectable()
export class TokenStatsService {
  private readonly BUCKET_SIZE = 60; // 1 minute buckets
  private readonly WINDOW_SIZES = {
    '5m': 5 * 60,
    '1h': 60 * 60,
    '24h': 24 * 60 * 60,
  };

  constructor(private readonly redisService: RedisService) {}

  private getBucketTimestamp(timestamp: number): number {
    return Math.floor(timestamp / this.BUCKET_SIZE) * this.BUCKET_SIZE;
  }

  async updateTokenStats(
    tokenId: string,
    volume: number,
    price: number,
    timestamp: number,
  ) {
    const bucketTimestamp = this.getBucketTimestamp(timestamp);
    const bucketKey = `token:${tokenId}:buckets`;

    await this.redisService.hset(
      bucketKey,
      bucketTimestamp.toString(),
      JSON.stringify({ volume, price }),
    );

    // Set TTL to ensure old data is automatically cleaned up
    await this.redisService.expire(
      bucketKey,
      this.WINDOW_SIZES['24h'] + this.BUCKET_SIZE,
    );
  }

  async getTokenStats(
    tokenId: string,
    windowSize: keyof typeof this.WINDOW_SIZES,
  ) {
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - this.WINDOW_SIZES[windowSize];
    const bucketKey = `token:${tokenId}:buckets`;

    const buckets = await this.redisService.hgetall(bucketKey);
    let totalVolume = 0;
    let latestPrice = 0;
    let earliestPrice = 0;

    Object.entries(buckets)
      .filter(([timestamp]) => parseInt(timestamp) >= windowStart)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .forEach(([, value], index) => {
        const data = JSON.parse(value);
        totalVolume += data.volume;

        if (index === 0) {
          earliestPrice = data.price;
        }
        latestPrice = data.price;
      });

    const priceChange = latestPrice - earliestPrice;
    const priceChangePercent = earliestPrice
      ? (priceChange / earliestPrice) * 100
      : 0;

    return {
      totalVolume,
      latestPrice,
      priceChange,
      priceChangePercent,
      windowSize,
    };
  }
}
