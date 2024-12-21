import { Module } from '@nestjs/common';
import { ConfigModule } from '@app/config';
import { LoggerService } from './logger.service';
import { CorrelationInterceptor } from './correlation.interceptor';

@Module({
  imports: [ConfigModule],
  providers: [LoggerService, CorrelationInterceptor],
  exports: [LoggerService, CorrelationInterceptor],
})
export class LoggerModule {}
