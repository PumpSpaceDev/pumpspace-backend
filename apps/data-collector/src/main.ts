import { NestFactory } from '@nestjs/core';
import { DataCollectorModule } from './data-collector.module';
import { LoggerService, CorrelationInterceptor } from '@app/shared';
import { ConfigService } from '@app/config';
import { MetricsService } from '@app/shared';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(DataCollectorModule, {
    bufferLogs: true,
  });

  const logger = app.get(LoggerService);
  app.useLogger(logger);
  app.useGlobalInterceptors(new CorrelationInterceptor());
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

  const { port } = configService.serviceConfig.dataCollector;
  await app.listen(port);
  console.log(`Data Collector service listening on port ${port}`);
}
bootstrap();
