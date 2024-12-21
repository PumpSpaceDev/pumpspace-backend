import { Controller, Get } from '@nestjs/common';
import { SmartMoneyEvaluatorService } from './smart-money-evaluator.service';

@Controller()
export class SmartMoneyEvaluatorController {
  constructor(
    private readonly smartMoneyEvaluatorService: SmartMoneyEvaluatorService,
  ) {}

  @Get()
  getHello(): string {
    return this.smartMoneyEvaluatorService.getHello();
  }
}
