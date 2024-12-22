import { Module } from '@nestjs/common';
import { ConfigModule } from '@app/config';
import { RedisService } from './redis.service';
import { RedisPublisherService } from './redis-publisher.service';

@Module({
  imports: [ConfigModule],
  providers: [RedisService, RedisPublisherService],
  exports: [RedisService, RedisPublisherService],
})
export class RedisModule {}
