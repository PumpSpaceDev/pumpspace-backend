import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Signal } from '@app/shared/entities';
import { CreateSignalDto, UpdateSignalDto } from '@app/interfaces';
import { PaginationDto } from './dto/pagination.dto';

@Injectable()
export class SignalRecorderService {
  constructor(
    @InjectRepository(Signal)
    private readonly signalRepository: Repository<Signal>,
  ) {}

  private readonly logger = new Logger(SignalRecorderService.name);

  async createSignal(createSignalDto: CreateSignalDto): Promise<Signal> {
    try {
      const signal = this.signalRepository.create(createSignalDto);
      return await this.signalRepository.save(signal);
    } catch (error) {
      this.logger.error('Error creating signal:', error);
      throw new BadRequestException('Failed to create signal');
    }
  }

  async findAll(
    pagination: PaginationDto,
  ): Promise<{ items: Signal[]; total: number }> {
    try {
      const [items, total] = await this.signalRepository.findAndCount({
        skip: pagination.offset,
        take: pagination.limit,
        order: { recommondTime: 'DESC' },
      });
      return { items, total };
    } catch (error) {
      this.logger.error('Error fetching signals:', error);
      throw new BadRequestException('Failed to fetch signals');
    }
  }

  async findOne(uniqueCode: string): Promise<Signal> {
    try {
      const signal = await this.signalRepository.findOne({
        where: { uniqueCode },
      });
      if (!signal) {
        throw new NotFoundException(`Signal with code ${uniqueCode} not found`);
      }
      return signal;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error fetching signal ${uniqueCode}:`, error);
      throw new BadRequestException('Failed to fetch signal');
    }
  }

  async update(
    uniqueCode: string,
    updateSignalDto: UpdateSignalDto,
  ): Promise<Signal> {
    try {
      await this.findOne(uniqueCode); // Verify record exists
      await this.signalRepository.update({ uniqueCode }, updateSignalDto);
      return this.findOne(uniqueCode);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error updating signal ${uniqueCode}:`, error);
      throw new BadRequestException('Failed to update signal');
    }
  }

  async markAsDone(uniqueCode: string): Promise<Signal> {
    try {
      await this.findOne(uniqueCode); // Verify record exists
      await this.signalRepository.update({ uniqueCode }, { done: true });
      return this.findOne(uniqueCode);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error marking signal ${uniqueCode} as done:`, error);
      throw new BadRequestException('Failed to mark signal as done');
    }
  }
}
