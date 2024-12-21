import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import { DataCollectorService } from './data-collector.service';
import { CreateSwapDto, SwapFilterDto } from './dto/swap.dto';
import { Swap } from './entities/swap.entity';

@Controller('swaps')
export class DataCollectorController {
  private readonly logger = new Logger(DataCollectorController.name);

  constructor(private readonly dataCollectorService: DataCollectorService) {}

  @Post()
  async createSwap(
    @Body(new ValidationPipe({ transform: true })) createSwapDto: CreateSwapDto,
  ): Promise<Swap> {
    return this.dataCollectorService.createSwap(createSwapDto);
  }

  @Get()
  async findSwaps(
    @Query(new ValidationPipe({ transform: true })) filters: SwapFilterDto,
  ): Promise<{ items: Swap[]; total: number }> {
    return this.dataCollectorService.findSwaps(filters);
  }

  @Get(':signature')
  async findSwapBySignature(
    @Param('signature') signature: string,
  ): Promise<Swap> {
    return this.dataCollectorService.findSwapBySignature(signature);
  }
}
