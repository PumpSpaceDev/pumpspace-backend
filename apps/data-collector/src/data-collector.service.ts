import {
  Injectable,
  Logger,
  BadRequestException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisPubSubService } from '@app/shared';
import { Swap } from '@app/shared-swaps';
import { SwapDto } from '@app/interfaces';

@Injectable()
export class DataCollectorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DataCollectorService.name);
  private swapQueue: Swap[] = [];
  private queueProcessingInterval: NodeJS.Timeout;

  constructor(
    @InjectRepository(Swap)
    private readonly swapRepository: Repository<Swap>,
    private readonly redisPublisher: RedisPubSubService,
  ) {}

  onModuleInit() {
    this.startQueueProcessing();
  }

  onModuleDestroy() {
    clearInterval(this.queueProcessingInterval);
  }

  async saveSwap(swap: SwapDto): Promise<void> {
    // Publish the swap to Redis
    this.redisPublisher.publishRaydiumSwap(swap);
    // Add the swap to the queue
    this.swapQueue.push({
      signature: swap.signature,
      timestamp: swap.timestamp,
      signer: swap.signer,
      amm: swap.amm,
      direction: swap.direction,
      amountIn: swap.amountIn.toString(),
      amountOut: swap.amountOut.toString(),
    });
  }

  private startQueueProcessing() {
    this.queueProcessingInterval = setInterval(async () => {
      while (this.swapQueue.length >= 100) {
        await this.processQueue();
      }
    }, 1000);
  }

  private async processQueue() {
    const swapsToSave = this.swapQueue.splice(0, 100);
    try {
      await this.swapRepository.save(swapsToSave);
      this.logger.log(`Successfully saved ${swapsToSave.length} swaps`);
    } catch (error) {
      this.logger.error('Error saving batch of swaps:', error);
      if (error instanceof BadRequestException) {
        this.logger.error(`Bad request: ${error.message}`);
      }
    }
  }
}
