import { NestFactory } from '@nestjs/core';
import { AnalysisStatisticsModule } from './analysis-statistics.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(
    AnalysisStatisticsModule,
    {
      logger: new Logger('AnalysisStatisticsBootstrap'),
    },
  );

  app.enableShutdownHooks();
}
bootstrap();
