import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@app/config';
import { AmmPoolInfoType } from '@app/interfaces';
import { RedisService } from './redis.service';

const POOL_INFO_KEY = 'amm-pool-info';
const POOL_INFO_TTL = 24 * 60 * 60; // 24 hours
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

@Injectable()
export class RedisCacheService {
  private readonly logger: Logger = new Logger(RedisCacheService.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async getOrSet<T>(
    key: string,
    ttl: number,
    fetchFunction: () => Promise<T>,
    context: string = 'cache',
  ): Promise<T | null> {
    let retries = 0;
    while (retries < MAX_RETRIES) {
      try {
        const cachedData = await this.redisService.get(key);
        if (!cachedData) {
          const newData = await fetchFunction();
          await this.redisService.set(key, JSON.stringify(newData), ttl);
          return newData;
        }

        await this.redisService.expire(key, ttl);
        return JSON.parse(cachedData);
      } catch (e) {
        retries++;
        this.logger.warn(
          `Attempt ${retries}/${MAX_RETRIES} failed for ${context}: ${e.message}`,
        );
        if (retries < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
          continue;
        }
        this.logger.error(
          `All retry attempts failed for ${context}: ${e.message}`,
        );
        return fetchFunction();
      }
    }
    return null;
  }

  async getPoolInfo(
    amm: string,
    fetchFunction?: (amm: string) => Promise<AmmPoolInfoType>,
  ): Promise<AmmPoolInfoType | null> {
    if (!fetchFunction) {
      return null;
    }

    const key = `${POOL_INFO_KEY}_${amm}`;
    return this.getOrSet(
      key,
      POOL_INFO_TTL,
      () => fetchFunction(amm),
      `pool info for ${amm}`,
    );
  }
}
