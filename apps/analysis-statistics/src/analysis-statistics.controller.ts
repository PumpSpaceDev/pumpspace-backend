import { Controller, Get } from '@nestjs/common';
import { AnalysisStatisticsService } from './analysis-statistics.service';

@Controller()
export class AnalysisStatisticsController {
  constructor(
    private readonly analysisStatisticsService: AnalysisStatisticsService,
  ) {}

  @Get()
  getHello(): string {
    return this.analysisStatisticsService.getHello();
  }
}
