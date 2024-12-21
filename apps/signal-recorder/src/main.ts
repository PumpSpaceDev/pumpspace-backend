import { NestFactory } from '@nestjs/core';
import { SignalRecorderModule } from './signal-recorder.module';

async function bootstrap() {
  const app = await NestFactory.create(SignalRecorderModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
