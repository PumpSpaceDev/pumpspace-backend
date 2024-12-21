import { Controller, Logger } from '@nestjs/common';
import { AnalysisStatisticsService } from './analysis-statistics.service';

@Controller('analysis')
export class AnalysisStatisticsController {
  private readonly logger = new Logger(AnalysisStatisticsController.name);

  constructor(
    private readonly analysisStatisticsService: AnalysisStatisticsService,
  ) {}

  // Controller endpoints will be added as needed for retrieving statistics
}
