import { Test, TestingModule } from '@nestjs/testing';
import { SignalAnalyzerController } from './signal-analyzer.controller';
import { SignalAnalyzerService } from './signal-analyzer.service';

describe('SignalAnalyzerController', () => {
  let signalAnalyzerController: SignalAnalyzerController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [SignalAnalyzerController],
      providers: [SignalAnalyzerService],
    }).compile();

    signalAnalyzerController = app.get<SignalAnalyzerController>(
      SignalAnalyzerController,
    );
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(signalAnalyzerController.getHello()).toBe('Hello World!');
    });
  });
});
