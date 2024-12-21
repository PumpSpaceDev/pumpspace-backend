import { NestFactory } from '@nestjs/core';
import { SmartMoneyEvaluatorModule } from './smart-money-evaluator.module';

async function bootstrap() {
  const app = await NestFactory.create(SmartMoneyEvaluatorModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
