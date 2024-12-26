import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@app/config';
import { RedisCacheService } from '@app/shared';
import { Swap } from '@app/shared-swaps';
import { IndicatorData } from '../../indicator/indicatorData';
import { Network } from '@app/interfaces';

const TRADE_DATA_KEY = 'trade-data';
const INDICATOR_SCORE_KEY = 'indicator-score';
const TRADE_DATA_TTL = 60 * 60; // 1 hour
const SCORE_TTL = 24 * 60 * 60; // 24 hours

@Injectable()
export class SmartMoneyCacheService {
  private readonly logger: Logger = new Logger(SmartMoneyCacheService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly redisCacheService: RedisCacheService,
  ) {}

  async getTradeData(
    account: string,
    fetchFunction: () => Promise<Swap[]>,
  ): Promise<Swap[]> {
    const key = `${TRADE_DATA_KEY}_${account}`;
    return (
      (await this.redisCacheService.getOrSet(
        key,
        TRADE_DATA_TTL,
        fetchFunction,
        `trade data for ${account}`,
      )) || []
    );
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
    return (
      (await this.redisCacheService.getOrSet(
        key,
        SCORE_TTL,
        fetchFunction,
        `score for ${account}`,
      )) || { indicators: [], totalScore: 0 }
    );
  }
}
