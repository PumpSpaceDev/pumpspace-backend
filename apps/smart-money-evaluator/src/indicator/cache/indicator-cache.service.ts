import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@app/config';
import { RedisService } from '@app/shared';
import { Swap } from '@app/shared-swaps';
import { IndicatorData } from '../../indicator/indicatorData';
import { Network } from '../../indicator/types/network.enum';

const TRADE_DATA_KEY = 'trade-data';
const INDICATOR_SCORE_KEY = 'indicator-score';
const TRADE_DATA_TTL = 60 * 60; // 1 hour
const SCORE_TTL = 24 * 60 * 60; // 24 hours

@Injectable()
export class IndicatorCacheService {
  private readonly logger: Logger = new Logger(IndicatorCacheService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async getTradeData(
    account: string,
    fetchFunction: () => Promise<Swap[]>,
  ): Promise<Swap[]> {
    const key = `${TRADE_DATA_KEY}_${account}`;
    try {
      const cachedData = await this.redisService.get(key);
      if (!cachedData) {
        const newData = await fetchFunction();
        await this.redisService.set(
          key,
          JSON.stringify(newData),
          TRADE_DATA_TTL,
        );
        return newData;
      }

      await this.redisService.expire(key, TRADE_DATA_TTL);
      return JSON.parse(cachedData);
    } catch (e) {
      this.logger.error(
        `Error fetching trade data for ${account}: ${e.message}`,
      );
      return fetchFunction();
    }
  }

  async getScore(
    account: string,
    network: Network,
    fetchFunction: () => Promise<{
      indicators: IndicatorData[];
      totalScore: number;
      reason?: string;
    }>,
  ): Promise<{
    indicators: IndicatorData[];
    totalScore: number;
    reason?: string;
  }> {
    const key = `${INDICATOR_SCORE_KEY}_${account}_${network}`;
    try {
      const cachedData = await this.redisService.get(key);
      if (!cachedData) {
        const newData = await fetchFunction();
        await this.redisService.set(key, JSON.stringify(newData), SCORE_TTL);
        return newData;
      }

      await this.redisService.expire(key, SCORE_TTL);
      return JSON.parse(cachedData);
    } catch (e) {
      this.logger.error(`Error fetching score for ${account}: ${e.message}`);
      return fetchFunction();
    }
  }
}
