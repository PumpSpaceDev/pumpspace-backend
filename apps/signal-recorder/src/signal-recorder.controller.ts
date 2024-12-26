import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Patch,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { SignalRecorderService } from './signal-recorder.service';
import { CreateSignalDto, UpdateSignalDto } from '@app/interfaces';
import { Signal } from '@app/shared/entities';
import { PaginationDto } from './dto/pagination.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('signals')
@Controller('signals')
export class SignalRecorderController {
  constructor(private readonly signalRecorderService: SignalRecorderService) {}

  @ApiOperation({
    summary: 'Create a new signal',
    description: 'Creates a new signal with the provided data',
  })
  @ApiResponse({
    status: 201,
    description: 'Signal successfully created',
    type: Signal,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @Post()
  async createSignal(
    @Body() createSignalDto: CreateSignalDto,
  ): Promise<Signal> {
    return this.signalRecorderService.createSignal(createSignalDto);
  }

  @ApiOperation({
    summary: 'Get all signals',
    description: 'Retrieves all signals with pagination support',
  })
  @ApiResponse({
    status: 200,
    description: 'List of signals retrieved successfully',
    type: Signal,
    isArray: true,
  })
  @ApiQuery({ type: PaginationDto })
  @Get()
  async findAll(
    @Query(new ValidationPipe({ transform: true })) pagination: PaginationDto,
  ): Promise<{ items: Signal[]; total: number }> {
    return this.signalRecorderService.findAll(pagination);
  }

  @ApiOperation({
    summary: 'Get signal by unique code',
    description: 'Retrieves a signal by its unique code',
  })
  @ApiResponse({ status: 200, description: 'Signal found', type: Signal })
  @ApiResponse({ status: 404, description: 'Signal not found' })
  @ApiParam({
    name: 'uniqueCode',
    description: 'Unique code of the signal',
    example: 'SIGNAL-123',
  })
  @Get(':uniqueCode')
  async findOne(@Param('uniqueCode') uniqueCode: string): Promise<Signal> {
    return this.signalRecorderService.findOne(uniqueCode);
  }

  @ApiOperation({
    summary: 'Update signal',
    description: 'Updates a signal by its unique code',
  })
  @ApiResponse({
    status: 200,
    description: 'Signal updated successfully',
    type: Signal,
  })
  @ApiResponse({ status: 404, description: 'Signal not found' })
  @ApiParam({
    name: 'uniqueCode',
    description: 'Unique code of the signal to update',
    example: 'SIGNAL-123',
  })
  @Put(':uniqueCode')
  async update(
    @Param('uniqueCode') uniqueCode: string,
    @Body() updateSignalDto: UpdateSignalDto,
  ): Promise<Signal> {
    return this.signalRecorderService.update(uniqueCode, updateSignalDto);
  }

  @ApiOperation({
    summary: 'Mark signal as done',
    description: 'Marks a signal as completed by its unique code',
  })
  @ApiResponse({
    status: 200,
    description: 'Signal marked as done',
    type: Signal,
  })
  @ApiResponse({ status: 404, description: 'Signal not found' })
  @ApiParam({
    name: 'uniqueCode',
    description: 'Unique code of the signal to mark as done',
    example: 'SIGNAL-123',
  })
  @Patch(':uniqueCode/done')
  async markAsDone(@Param('uniqueCode') uniqueCode: string): Promise<Signal> {
    return this.signalRecorderService.markAsDone(uniqueCode);
  }
}
