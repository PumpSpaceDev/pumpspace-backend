import { Injectable } from '@nestjs/common';
import { ConfigService } from '@app/config';
import { LoggerService } from '@app/shared';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Swap } from '../entities/swap.entity';

@Injectable()
export class SwapsStorageService {
  constructor(
    @InjectRepository(Swap)
    private readonly swapsRepository: Repository<Swap>,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  private getTableName(timestamp: Date): string {
    const dateString = timestamp.toISOString().split('T')[0].replace(/-/g, '_');
    return `swaps_${dateString}`;
  }

  async storeSwap(swap: Partial<Swap>): Promise<void> {
    try {
      const tableName = this.getTableName(new Date(swap.timestamp));

      // Ensure the partition exists
      await this.swapsRepository.query(`
        CREATE TABLE IF NOT EXISTS ${tableName} (
          LIKE swaps INCLUDING ALL,
          CHECK (DATE(timestamp) = DATE('${swap.timestamp}'))
        ) INHERITS (swaps);
      `);

      // Store the swap in the appropriate partition
      await this.swapsRepository
        .createQueryBuilder()
        .insert()
        .into(tableName)
        .values(swap)
        .execute();

      this.logger.debug(`Stored swap transaction in table: ${tableName}`);
    } catch (error) {
      this.logger.error(
        'Failed to store swap transaction',
        error.message,
        'SwapsStorageService',
      );
      throw error;
    }
  }
}
