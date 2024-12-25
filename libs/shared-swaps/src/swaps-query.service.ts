import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Swap } from './entities';

@Injectable()
export class SwapsQueryService {
  private readonly logger = new Logger(SwapsQueryService.name);
  constructor(
    @InjectRepository(Swap)
    private readonly swapsRepository: Repository<Swap>,
  ) {}

  private getTableName(date: Date): string {
    const dateString = date.toISOString().split('T')[0].replace(/-/g, '_');
    return `swaps_${dateString}`;
  }

  async queryHistoricalData(startDate: Date, endDate: Date): Promise<Swap[]> {
    try {
      const currentDate = new Date(startDate);
      const results: Swap[] = [];

      while (currentDate <= endDate) {
        const tableName = this.getTableName(currentDate);

        try {
          const dailyResults = await this.swapsRepository.query(
            `
            SELECT * FROM ${tableName}
            WHERE timestamp >= $1 AND timestamp < $2
            ORDER BY timestamp ASC
          `,
            [startDate, endDate],
          );

          results.push(...dailyResults);
        } catch (error) {
          // Log error but continue if a specific day's table doesn't exist
          this.logger.warn(
            `Failed to query table ${tableName}: ${error.message}`,
            'SwapsQueryService',
          );
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return results;
    } catch (error) {
      this.logger.error(
        'Failed to query historical data',
        error.message,
        'SwapsQueryService',
      );
      throw error;
    }
  }

  async queryByAmm(
    amm: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Swap[]> {
    try {
      const currentDate = new Date(startDate);
      const results: Swap[] = [];

      while (currentDate <= endDate) {
        const tableName = this.getTableName(currentDate);

        try {
          const dailyResults = await this.swapsRepository.query(
            `
            SELECT * FROM ${tableName}
            WHERE amm = $1 AND timestamp >= $2 AND timestamp < $3
            ORDER BY timestamp ASC
          `,
            [amm, startDate, endDate],
          );

          results.push(...dailyResults);
        } catch (error) {
          // Log error but continue if a specific day's table doesn't exist
          this.logger.warn(
            `Failed to query table ${tableName}: ${error.message}`,
            'SwapsQueryService',
          );
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return results;
    } catch (error) {
      this.logger.error(
        'Failed to query by AMM',
        error.message,
        'SwapsQueryService',
      );
      throw error;
    }
  }
}
