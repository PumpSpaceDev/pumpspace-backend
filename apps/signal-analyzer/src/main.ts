import { NestFactory } from '@nestjs/core';
import { SignalAnalyzerModule } from './signal-analyzer.module';

async function bootstrap() {
  const app = await NestFactory.create(SignalAnalyzerModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
