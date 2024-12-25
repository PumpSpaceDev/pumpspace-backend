import { NestFactory } from '@nestjs/core';
import { SmartMoneyEvaluatorModule } from './smart-money-evaluator.module';
import { logger } from '@app/shared';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(
    SmartMoneyEvaluatorModule,
    {
      logger,
    },
  );

  app.enableShutdownHooks();
}
bootstrap();
