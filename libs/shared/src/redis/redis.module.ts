import { Module } from '@nestjs/common';
import { ConfigModule } from '@app/config';
import { RedisService } from './redis.service';
import { RedisPubSubService } from './redisPubSub.service';

@Module({
  imports: [ConfigModule],
  providers: [RedisService, RedisPubSubService],
  exports: [RedisService, RedisPubSubService],
})
export class RedisModule {}
