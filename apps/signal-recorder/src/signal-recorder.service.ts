import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Signal } from './entities/signal.entity';
import { CreateSignalDto, UpdateSignalDto } from '@app/interfaces';

@Injectable()
export class SignalRecorderService {
  constructor(
    @InjectRepository(Signal)
    private readonly signalRepository: Repository<Signal>,
  ) {}

  async createSignal(createSignalDto: CreateSignalDto): Promise<Signal> {
    const signal = this.signalRepository.create(createSignalDto);
    return this.signalRepository.save(signal);
  }

  async findAll(): Promise<Signal[]> {
    return this.signalRepository.find();
  }

  async findOne(uniqueCode: string): Promise<Signal> {
    return this.signalRepository.findOne({ where: { uniqueCode } });
  }

  async update(uniqueCode: string, updateSignalDto: UpdateSignalDto): Promise<Signal> {
    await this.signalRepository.update({ uniqueCode }, updateSignalDto);
    return this.findOne(uniqueCode);
  }

  async markAsDone(uniqueCode: string): Promise<Signal> {
    await this.signalRepository.update({ uniqueCode }, { done: true });
    return this.findOne(uniqueCode);
  }
}
