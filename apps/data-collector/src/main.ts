import { NestFactory } from '@nestjs/core';
import { DataCollectorModule } from './data-collector.module';

async function bootstrap() {
  const app = await NestFactory.create(DataCollectorModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
