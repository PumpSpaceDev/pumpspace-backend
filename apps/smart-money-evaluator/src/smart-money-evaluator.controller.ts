import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { SmartMoneyEvaluatorService } from './smart-money-evaluator.service';

class UpdateScoreDto {
  solBalance: string;
}

@Controller('smart-money')
export class SmartMoneyEvaluatorController {
  private readonly logger = new Logger(SmartMoneyEvaluatorController.name);

  constructor(
    private readonly smartMoneyEvaluatorService: SmartMoneyEvaluatorService,
  ) {}

  @Get(':address/score')
  async getAddressScore(@Param('address') address: string): Promise<number> {
    this.logger.log(`Evaluating score for address: ${address}`);
    return this.smartMoneyEvaluatorService.evaluateAddress(address);
  }

  @Post(':address/update-score')
  async updateAddressScore(
    @Param('address') address: string,
    @Body(ValidationPipe) body: UpdateScoreDto,
  ): Promise<void> {
    this.logger.log(`Updating score for address: ${address}`);
    await this.smartMoneyEvaluatorService.updateScore(address, BigInt(body.solBalance));
  }
}
