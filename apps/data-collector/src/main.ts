import { NestFactory } from '@nestjs/core';
import { DataCollectorModule } from './data-collector.module';
import { logger } from '@app/shared';
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(DataCollectorModule, {
    logger,
  });

  app.enableShutdownHooks();
}
bootstrap();
