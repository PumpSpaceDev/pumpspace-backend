import { Controller, Get, Post, Body, Param, Put, Patch } from '@nestjs/common';
import { SignalRecorderService } from './signal-recorder.service';
import { CreateSignalDto, UpdateSignalDto } from '@app/interfaces';
import { Signal } from './entities/signal.entity';

@Controller('signals')
export class SignalRecorderController {
  constructor(private readonly signalRecorderService: SignalRecorderService) {}

  @Post()
  async createSignal(
    @Body() createSignalDto: CreateSignalDto,
  ): Promise<Signal> {
    return this.signalRecorderService.createSignal(createSignalDto);
  }

  @Get()
  async findAll(): Promise<Signal[]> {
    return this.signalRecorderService.findAll();
  }

  @Get(':uniqueCode')
  async findOne(@Param('uniqueCode') uniqueCode: string): Promise<Signal> {
    return this.signalRecorderService.findOne(uniqueCode);
  }

  @Put(':uniqueCode')
  async update(
    @Param('uniqueCode') uniqueCode: string,
    @Body() updateSignalDto: UpdateSignalDto,
  ): Promise<Signal> {
    return this.signalRecorderService.update(uniqueCode, updateSignalDto);
  }

  @Patch(':uniqueCode/done')
  async markAsDone(@Param('uniqueCode') uniqueCode: string): Promise<Signal> {
    return this.signalRecorderService.markAsDone(uniqueCode);
  }
}
