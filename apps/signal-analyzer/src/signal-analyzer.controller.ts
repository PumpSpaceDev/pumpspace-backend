import { Controller, Get } from '@nestjs/common';
import { SignalAnalyzerService } from './signal-analyzer.service';

@Controller()
export class SignalAnalyzerController {
  constructor(private readonly signalAnalyzerService: SignalAnalyzerService) {}

  @Get()
  getHello(): string {
    return this.signalAnalyzerService.getHello();
  }
}
