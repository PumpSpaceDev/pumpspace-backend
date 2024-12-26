import { Controller, Get, Post, Body, Param, Put, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { SignalAnalyzerService } from './signal-analyzer.service';
import { SignalEvaluation } from '@app/shared/entities';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto';
import { PaginationDto } from './dto/pagination.dto';

@ApiTags('signal-analyzer')
@Controller('signal-analyzer')
export class SignalAnalyzerController {
  constructor(private readonly signalAnalyzerService: SignalAnalyzerService) {}

  @ApiOperation({ summary: 'Create a new signal evaluation' })
  @ApiResponse({
    status: 201,
    description: 'Signal evaluation created successfully',
    type: SignalEvaluation,
  })
  @ApiBody({ type: CreateEvaluationDto })
  @Post()
  async create(
    @Body() createDto: CreateEvaluationDto,
  ): Promise<SignalEvaluation> {
    return this.signalAnalyzerService.create(createDto);
  }

  @ApiOperation({ summary: 'Get all signal evaluations with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated signal evaluations',
    type: [SignalEvaluation],
  })
  @Get()
  async findAll(
    @Query() pagination: PaginationDto,
  ): Promise<{ items: SignalEvaluation[]; total: number }> {
    return this.signalAnalyzerService.findAll(pagination);
  }

  @ApiOperation({ summary: 'Get a signal evaluation by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns a signal evaluation',
    type: SignalEvaluation,
  })
  @ApiResponse({ status: 404, description: 'Signal evaluation not found' })
  @ApiParam({ name: 'id', description: 'Signal evaluation ID' })
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<SignalEvaluation> {
    return this.signalAnalyzerService.findOne(+id);
  }

  @ApiOperation({ summary: 'Get a signal evaluation by signal ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns a signal evaluation',
    type: SignalEvaluation,
  })
  @ApiResponse({ status: 404, description: 'Signal evaluation not found' })
  @ApiParam({ name: 'signalId', description: 'Signal ID' })
  @Get('signal/:signalId')
  async findBySignalId(
    @Param('signalId') signalId: string,
  ): Promise<SignalEvaluation> {
    return this.signalAnalyzerService.findBySignalId(+signalId);
  }

  @ApiOperation({ summary: 'Update a signal evaluation' })
  @ApiResponse({
    status: 200,
    description: 'Signal evaluation updated successfully',
    type: SignalEvaluation,
  })
  @ApiResponse({ status: 404, description: 'Signal evaluation not found' })
  @ApiParam({ name: 'id', description: 'Signal evaluation ID' })
  @ApiBody({ type: UpdateEvaluationDto })
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateEvaluationDto,
  ): Promise<SignalEvaluation> {
    return this.signalAnalyzerService.update(+id, updateDto);
  }

  @ApiOperation({ summary: 'Update signal evaluation with exit price' })
  @ApiResponse({
    status: 200,
    description: 'Signal evaluation updated successfully',
    type: SignalEvaluation,
  })
  @ApiResponse({ status: 404, description: 'Signal evaluation not found' })
  @ApiParam({ name: 'id', description: 'Signal evaluation ID' })
  @ApiBody({
    schema: {
      properties: {
        exitPrice: {
          type: 'number',
          description: 'Exit price for the evaluation',
        },
      },
    },
  })
  @Put(':id/evaluate')
  async evaluate(
    @Param('id') id: string,
    @Body('exitPrice') exitPrice: number,
  ): Promise<SignalEvaluation> {
    return this.signalAnalyzerService.updateEvaluation(+id, exitPrice);
  }
}
