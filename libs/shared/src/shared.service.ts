import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@app/config';
import { createClient } from 'redis';

@Injectable()
export class SharedService implements OnModuleInit {
  private redisClient: ReturnType<typeof createClient>;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    this.redisClient = createClient(this.configService.redisConfig);
    await this.redisClient.connect();
  }

  async publishToRedis(channel: string, message: string): Promise<void> {
    try {
      await this.redisClient.publish(channel, message);
    } catch (error) {
      console.error('Failed to publish to Redis:', error);
      throw error;
    }
  }
}
