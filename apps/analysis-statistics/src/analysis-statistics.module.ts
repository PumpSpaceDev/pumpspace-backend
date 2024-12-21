import { Module } from '@nestjs/common';
import { AnalysisStatisticsController } from './analysis-statistics.controller';
import { AnalysisStatisticsService } from './analysis-statistics.service';

@Module({
  imports: [],
  controllers: [AnalysisStatisticsController],
  providers: [AnalysisStatisticsService],
})
export class AnalysisStatisticsModule {}
