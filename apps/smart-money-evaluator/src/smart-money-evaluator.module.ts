import { Module } from '@nestjs/common';
import { SmartMoneyEvaluatorController } from './smart-money-evaluator.controller';
import { SmartMoneyEvaluatorService } from './smart-money-evaluator.service';

@Module({
  imports: [],
  controllers: [SmartMoneyEvaluatorController],
  providers: [SmartMoneyEvaluatorService],
})
export class SmartMoneyEvaluatorModule {}
