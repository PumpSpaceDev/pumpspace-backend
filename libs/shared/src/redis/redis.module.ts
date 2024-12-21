import { Module } from '@nestjs/common';
import { ConfigModule } from '@app/config';
import { RedisService } from './redis.service';

@Module({
  imports: [ConfigModule],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
