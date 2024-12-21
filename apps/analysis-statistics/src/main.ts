import { NestFactory } from '@nestjs/core';
import { AnalysisStatisticsModule } from './analysis-statistics.module';

async function bootstrap() {
  const app = await NestFactory.create(AnalysisStatisticsModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
