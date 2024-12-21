import { Injectable } from '@nestjs/common';
import { ConfigService } from '@app/config';
import { LoggerService, RedisService } from '@app/shared';

@Injectable()
export class RedisPublisherService {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly redisService: RedisService,
  ) {}

  async publish(channel: string, message: any): Promise<void> {
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
