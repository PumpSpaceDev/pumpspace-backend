import { Controller, Get, Post, Body, Param, Put } from '@nestjs/common';
import { SignalAnalyzerService } from './signal-analyzer.service';
import { CreateSignalEvaluationDto, UpdateSignalEvaluationDto } from '@app/interfaces';
import { SignalEvaluation } from './entities/signal-evaluation.entity';

@Controller('signal-analyzer')
export class SignalAnalyzerController {
  constructor(private readonly signalAnalyzerService: SignalAnalyzerService) {}

  @Post()
  async create(@Body() createDto: CreateSignalEvaluationDto): Promise<SignalEvaluation> {
    return this.signalAnalyzerService.create(createDto);
  }

  @Get()
  async findAll(): Promise<SignalEvaluation[]> {
    return this.signalAnalyzerService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<SignalEvaluation> {
    return this.signalAnalyzerService.findOne(+id);
  }

  @Get('signal/:signalId')
  async findBySignalId(@Param('signalId') signalId: string): Promise<SignalEvaluation> {
    return this.signalAnalyzerService.findBySignalId(+signalId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateSignalEvaluationDto,
  ): Promise<SignalEvaluation> {
    return this.signalAnalyzerService.update(+id, updateDto);
  }

  @Put(':id/evaluate')
  async evaluate(
    @Param('id') id: string,
    @Body('exitPrice') exitPrice: number,
  ): Promise<SignalEvaluation> {
    return this.signalAnalyzerService.updateEvaluation(+id, exitPrice);
  }
}
