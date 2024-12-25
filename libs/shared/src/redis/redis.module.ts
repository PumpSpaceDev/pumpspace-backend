import { Module } from '@nestjs/common';
import { ConfigModule } from '@app/config';
import { RedisService } from './redis.service';
import { RedisPubSubService } from './redisPubSub.service';
import { RedisCacheService } from './redisCache.service';

@Module({
  imports: [ConfigModule],
  providers: [RedisService, RedisPubSubService, RedisCacheService],
  exports: [RedisService, RedisPubSubService, RedisCacheService],
})
export class RedisModule {}
