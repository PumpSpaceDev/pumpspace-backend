import { NestFactory } from '@nestjs/core';
import { SmartMoneyEvaluatorModule } from './smart-money-evaluator.module';
import { ConfigService } from '@app/config';
import { MetricsService } from '@app/shared';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(SmartMoneyEvaluatorModule);
  const configService = app.get(ConfigService);
  const metricsService = app.get(MetricsService);

  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // Add middleware for metrics collection
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000; // Convert to seconds
      metricsService.recordHttpRequest(
        req.method,
        req.path,
        res.statusCode,
        duration,
      );
    });
    next();
  });

  const { port } = configService.smartMoneyConfig;
  await app.listen(port);
  console.log(`Smart Money Evaluator service listening on port ${port}`);
}
bootstrap();
