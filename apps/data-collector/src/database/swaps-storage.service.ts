import { Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@app/config';
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

  async storeSwap(swap: Partial<Swap>): Promise<void> {
    try {
      // Store the swap in the appropriate partition
      await this.swapsRepository
        .createQueryBuilder()
        .insert()
        .values(swap)
        .execute();
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
