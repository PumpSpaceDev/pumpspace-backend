import { NestFactory } from '@nestjs/core';
import { AnalysisStatisticsModule } from './analysis-statistics.module';
import { logger } from '@app/shared';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(
    AnalysisStatisticsModule,
    {
      logger,
    },
  );

  app.enableShutdownHooks();
}
bootstrap();
