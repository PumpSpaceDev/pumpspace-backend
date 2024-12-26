import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { SignalEvaluation } from '../entities/signal-evaluation.entity';
import { EvaluationStatus } from '../dto/update-evaluation.dto';

@Injectable()
export class SignalEvaluationRepository extends Repository<SignalEvaluation> {
  constructor(private dataSource: DataSource) {
    super(SignalEvaluation, dataSource.createEntityManager());
  }

  async findBySignalId(signalId: number): Promise<SignalEvaluation[]> {
    return this.find({
      where: { signalId },
      order: { evaluationTime: 'DESC' },
    });
  }

  async findLatestEvaluation(
    signalId: number,
  ): Promise<SignalEvaluation | null> {
    return this.findOne({
      where: { signalId },
      order: { evaluationTime: 'DESC' },
    });
  }

  async findPendingEvaluations(): Promise<SignalEvaluation[]> {
    return this.find({
      where: { status: EvaluationStatus.PENDING },
      order: { evaluationTime: 'ASC' },
    });
  }
}
