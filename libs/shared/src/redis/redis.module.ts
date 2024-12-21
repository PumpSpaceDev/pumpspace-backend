import { Module } from '@nestjs/common';
import { ConfigModule } from '@app/config';
import { RedisService } from './redis.service';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [ConfigModule, LoggerModule],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
