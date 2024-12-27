import {
  Controller,
  Get,
  Param,
  Logger,
  ValidationPipe,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AddressParamDto } from './dto/address-param.dto';
import { SmartMoneyEvaluatorService } from './smart-money-evaluator.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('smart-money')
@Controller('smart-money')
export class SmartMoneyEvaluatorController {
  private readonly logger = new Logger(SmartMoneyEvaluatorController.name);

  constructor(
    private readonly smartMoneyEvaluatorService: SmartMoneyEvaluatorService,
  ) {}

  @ApiOperation({ summary: 'Get smart money score for an address' })
  @ApiResponse({
    status: 200,
    description: 'Returns the smart money score (0-100)',
    type: Number,
  })
  @ApiResponse({
    status: 404,
    description: 'Address not found in smart money list',
  })
  @ApiParam({
    name: 'address',
    description: 'Wallet address to evaluate',
    example: '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
  })
  @Get(':address/score')
  async getAddressScore(
    @Param(ValidationPipe) params: AddressParamDto,
  ): Promise<number> {
    this.logger.log(`Evaluating score for address: ${params.address}`);
    try {
      const score = await this.smartMoneyEvaluatorService.getScoreForAddress(
        params.address,
      );
      if (score === null) {
        throw new NotFoundException(
          `Address ${params.address} not found in smart money list`,
        );
      }
      return score;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error evaluating score: ${error.message}`);
      throw new BadRequestException('Failed to evaluate smart money score');
    }
  }
}
