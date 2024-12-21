import { Module } from '@nestjs/common';
import { ConfigModule } from '@app/config';
import { LoggerService } from './logger.service';

@Module({
  imports: [ConfigModule],
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
