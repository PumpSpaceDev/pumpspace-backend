import { Test, TestingModule } from '@nestjs/testing';
import { AnalysisStatisticsController } from './analysis-statistics.controller';
import { AnalysisStatisticsService } from './analysis-statistics.service';

describe('AnalysisStatisticsController', () => {
  let analysisStatisticsController: AnalysisStatisticsController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AnalysisStatisticsController],
      providers: [AnalysisStatisticsService],
    }).compile();

    analysisStatisticsController = app.get<AnalysisStatisticsController>(
      AnalysisStatisticsController,
    );
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(analysisStatisticsController.getHello()).toBe('Hello World!');
    });
  });
});
