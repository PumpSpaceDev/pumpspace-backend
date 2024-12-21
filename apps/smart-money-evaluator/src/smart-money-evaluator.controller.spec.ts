import { Test, TestingModule } from '@nestjs/testing';
import { SmartMoneyEvaluatorController } from './smart-money-evaluator.controller';
import { SmartMoneyEvaluatorService } from './smart-money-evaluator.service';

describe('SmartMoneyEvaluatorController', () => {
  let smartMoneyEvaluatorController: SmartMoneyEvaluatorController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [SmartMoneyEvaluatorController],
      providers: [SmartMoneyEvaluatorService],
    }).compile();

    smartMoneyEvaluatorController = app.get<SmartMoneyEvaluatorController>(
      SmartMoneyEvaluatorController,
    );
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(smartMoneyEvaluatorController.getHello()).toBe('Hello World!');
    });
  });
});
