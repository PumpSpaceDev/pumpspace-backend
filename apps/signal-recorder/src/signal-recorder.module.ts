import { Module } from '@nestjs/common';
import { SignalRecorderController } from './signal-recorder.controller';
import { SignalRecorderService } from './signal-recorder.service';

@Module({
  imports: [],
  controllers: [SignalRecorderController],
  providers: [SignalRecorderService],
})
export class SignalRecorderModule {}
