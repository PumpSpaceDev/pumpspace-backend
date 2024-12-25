import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@app/config';
import { AmmPoolInfoType } from '@app/interfaces';
import { RedisService } from './redis.service';

const POOL_INFO_KEY = 'amm-pool-info';
const POOL_INFO_TTL = 24 * 60 * 60; // 24 hours
@Injectable()
export class RedisCacheService {
  private readonly logger: Logger = new Logger(RedisCacheService.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async getPoolInfo(
    amm: string,
    fetchFunction?: (amm: string) => Promise<AmmPoolInfoType>,
  ): Promise<AmmPoolInfoType | null> {
    const key = `${POOL_INFO_KEY}_${amm}`;
    try {
      const poolInfo = await this.redisService.get(key);
      if (!poolInfo && fetchFunction) {
        const newPoolInfo = await fetchFunction(amm);
        await this.redisService.set(
          key,
          JSON.stringify(newPoolInfo),
          POOL_INFO_TTL,
        );
        return newPoolInfo;
      }

      if (!poolInfo) {
        return null;
      }
      await this.redisService.expire(key, POOL_INFO_TTL); //expend expire time
      return JSON.parse(poolInfo);
    } catch (e) {
      this.logger.error(`Error fetching pool info for ${amm}: ${e.message}`);
      return null;
    }
  }
}
