import { Controller, Get } from '@nestjs/common';
import { SignalRecorderService } from './signal-recorder.service';

@Controller()
export class SignalRecorderController {
  constructor(private readonly signalRecorderService: SignalRecorderService) {}

  @Get()
  getHello(): string {
    return this.signalRecorderService.getHello();
  }
}
