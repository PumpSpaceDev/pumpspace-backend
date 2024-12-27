import { Injectable } from '@nestjs/common';

import { Between, DataSource, Repository } from 'typeorm';
import { MarketCapLevel, Signal } from '@app/interfaces';

@Injectable()
export class SignalRepository extends Repository<Signal> {
  constructor(private dataSource: DataSource) {
    super(Signal, dataSource.createEntityManager());
  }

  async findSignalTokenInTimeRange(
    signalName: string,
    startTime: Date,
    endTime: Date,
  ): Promise<Signal[]> {
    const tokens = await this.find({
      where: {
        signalName,
        time: Between(startTime, endTime),
      },
      order: {
        time: 'ASC',
      },
    });
    return tokens;
  }

  public getEvaluationTimestamps(
    marketCapLevel: MarketCapLevel,
    baseTime: Date,
  ): Date[] {
    const intervals = this.getIntervalsByMarketCap(marketCapLevel);
    return intervals.map((minutes) => {
      const timestamp = new Date(baseTime);
      timestamp.setMinutes(timestamp.getMinutes() + minutes);
      return timestamp;
    });
  }

  private getIntervalsByMarketCap(marketCapLevel: MarketCapLevel): number[] {
    switch (marketCapLevel) {
      case MarketCapLevel.LOW_CAP:
        return [5, 15, 30, 60, 240, 1440]; // 5min, 15min, 30min, 1h, 4h, 24h
      case MarketCapLevel.MEDIUM_CAP:
        return [60, 240, 720, 1440, 2880]; // 1h, 4h, 12h, 24h, 48h
      case MarketCapLevel.HIGH_CAP:
        return [240, 720, 1440, 4320, 8640]; // 4h, 12h, 24h, 72h, 144h
      default:
        return [60]; // default to hourly
    }
  }
}
