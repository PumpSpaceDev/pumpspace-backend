import { NestFactory } from '@nestjs/core';
import { SignalAnalyzerModule } from './signal-analyzer.module';
import { ConfigService } from '@app/config';
import { MetricsService } from '@app/shared';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(SignalAnalyzerModule);
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

  const { port } = configService.serviceConfig.signalAnalyzer;
  await app.listen(port);
  console.log(`Signal Analyzer service listening on port ${port}`);
}
bootstrap();
