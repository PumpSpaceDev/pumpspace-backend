import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@app/config';
import { SwapDto } from '@app/interfaces';
import { RedisService } from './redis.service';

@Injectable()
export class RedisPublisherService {
  private readonly logger: Logger = new Logger('RedisPublisherService');
  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async publishRaydiumSwap(swap: SwapDto): Promise<void> {
    return this.publish('raydium:swaps', JSON.stringify(swap));
  }
  private async publish(channel: string, message: any): Promise<void> {
    try {
      this.logger.debug(`Publishing message to channel: ${channel}`);
      await this.redisService.publish(channel, message);
      this.logger.debug('Message published successfully');
    } catch (error) {
      this.logger.error(
        `Failed to publish message to channel: ${channel}`,
        error.message,
        'RedisPublisherService',
      );
      throw error;
    }
  }
}
