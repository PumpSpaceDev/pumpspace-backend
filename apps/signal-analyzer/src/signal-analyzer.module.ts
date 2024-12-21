import { Module } from '@nestjs/common';
import { SignalAnalyzerController } from './signal-analyzer.controller';
import { SignalAnalyzerService } from './signal-analyzer.service';

@Module({
  imports: [],
  controllers: [SignalAnalyzerController],
  providers: [SignalAnalyzerService],
})
export class SignalAnalyzerModule {}
