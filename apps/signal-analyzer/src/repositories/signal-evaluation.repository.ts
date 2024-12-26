import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { SignalEvaluation } from '@app/shared/entities';
import { EvaluationStatus } from '@app/interfaces/enums/evaluation-status.enum';

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

  async calculateSuccessRate(signalId: number): Promise<number> {
    const evaluations = await this.find({
      where: {
        signalId,
        status: EvaluationStatus.COMPLETED,
      },
    });

    if (!evaluations.length) {
      return 0;
    }

    const successfulEvals = evaluations.filter(
      (evaluation) => evaluation.profitLoss > 0,
    );
    return (successfulEvals.length / evaluations.length) * 100;
  }

  async getAggregatedMetrics(signalId: number): Promise<{
    avgProfitLoss: number;
    avgRoi: number;
    successRate: number;
    totalEvaluations: number;
  }> {
    const evaluations = await this.find({
      where: {
        signalId,
        status: EvaluationStatus.COMPLETED,
      },
    });

    if (!evaluations.length) {
      return {
        avgProfitLoss: 0,
        avgRoi: 0,
        successRate: 0,
        totalEvaluations: 0,
      };
    }

    const avgProfitLoss =
      evaluations.reduce((sum, evaluation) => sum + evaluation.profitLoss, 0) /
      evaluations.length;
    const avgRoi =
      evaluations.reduce((sum, evaluation) => sum + evaluation.roi, 0) /
      evaluations.length;
    const successRate = await this.calculateSuccessRate(signalId);

    return {
      avgProfitLoss,
      avgRoi,
      successRate,
      totalEvaluations: evaluations.length,
    };
  }
}
