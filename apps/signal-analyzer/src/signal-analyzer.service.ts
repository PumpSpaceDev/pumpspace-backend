import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SignalEvaluation } from './entities/signal-evaluation.entity';

@Injectable()
export class SignalAnalyzerService {
  constructor(
    @InjectRepository(SignalEvaluation)
    private signalEvaluationRepository: Repository<SignalEvaluation>,
  ) {}

  async create(
    createDto: Partial<SignalEvaluation>,
  ): Promise<SignalEvaluation> {
    const evaluation = this.signalEvaluationRepository.create({
      ...createDto,
      status: 'pending',
    });
    return this.signalEvaluationRepository.save(evaluation);
  }

  async findAll(): Promise<SignalEvaluation[]> {
    return this.signalEvaluationRepository.find();
  }

  async findOne(id: number): Promise<SignalEvaluation> {
    return this.signalEvaluationRepository.findOne({ where: { id } });
  }

  async findBySignalId(signalId: number): Promise<SignalEvaluation> {
    return this.signalEvaluationRepository.findOne({ where: { signalId } });
  }

  async update(
    id: number,
    updateDto: Partial<SignalEvaluation>,
  ): Promise<SignalEvaluation> {
    await this.signalEvaluationRepository.update(id, updateDto);
    return this.findOne(id);
  }

  async updateEvaluation(
    id: number,
    exitPrice: number,
  ): Promise<SignalEvaluation> {
    const evaluation = await this.findOne(id);
    const profitLoss = exitPrice - evaluation.entryPrice;
    const roi = (profitLoss / evaluation.entryPrice) * 100;

    return this.update(id, {
      exitPrice,
      profitLoss,
      roi,
      status: 'completed',
    });
  }
}
