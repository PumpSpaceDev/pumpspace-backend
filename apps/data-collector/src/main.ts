import { NestFactory } from '@nestjs/core';
import { DataCollectorModule } from './data-collector.module';
import { LoggerService } from '@app/shared';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(DataCollectorModule, {
    bufferLogs: true,
  });

  const logger = app.get(LoggerService);
  app.useLogger(logger);
  app.enableShutdownHooks();
}
bootstrap();
