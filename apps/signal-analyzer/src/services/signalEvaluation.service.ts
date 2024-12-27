import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  MARKET_CAP_REFERENCE,
  BASE_SAMPLING_INTERVAL,
  BASE_PRICE_WEIGHT,
  BASE_RESERVE_WEIGHT,
  ADJUSTMENT_COEFFICIENT,
} from '../constants/evaluation';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AmmPoolInfoType,
  EvaluationStatus,
  MarketCapLevel,
  Signal,
  SignalEvaluation,
} from '@app/interfaces';
import { TokenService } from '@app/shared';
import { SignalRepository } from '../repositories/signal.repository';

@Injectable()
export class SignalEvaluationService {
  private readonly logger = new Logger(SignalEvaluationService.name);

  constructor(
    @InjectRepository(SignalEvaluation)
    private signalEvaluationRepository: Repository<SignalEvaluation>,
    @InjectRepository(Signal)
    private readonly signalRepository: SignalRepository,
    private tokenService: TokenService,
  ) {}

  async calculateDynamicInterval(marketCap: number): Promise<number> {
    try {
      const weightFactor =
        (MARKET_CAP_REFERENCE - marketCap) / MARKET_CAP_REFERENCE;
      const interval =
        BASE_SAMPLING_INTERVAL * (1 + weightFactor * ADJUSTMENT_COEFFICIENT);
      return Math.max(interval, BASE_SAMPLING_INTERVAL / 2);
    } catch (error) {
      this.logger.error('Error calculating dynamic interval:', error);
      return BASE_SAMPLING_INTERVAL;
    }
  }

  async calculateWeights(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    marketCapLevel: MarketCapLevel,
  ): Promise<{ priceWeight: number; reserveWeight: number }> {
    return {
      priceWeight: BASE_PRICE_WEIGHT,
      reserveWeight: BASE_RESERVE_WEIGHT,
    };
  }

  async evaluateSignal(signal: Signal): Promise<void> {
    try {
      const ammPoolData = await this.tokenService.fetchAmmPoolData(
        signal.tokenAddress,
      );
      if (!ammPoolData) {
        this.logger.warn(`No AMM pool data found for token ${signal.symbol}`);
        return;
      }

      const { priceChange, reserveChange } = await this.calculateChanges(
        ammPoolData,
        signal,
      );
      const { priceWeight, reserveWeight } = await this.calculateWeights(
        signal.marketCapLevel,
      );

      const compositeScore =
        priceChange * priceWeight + reserveChange * reserveWeight;

      await this.signalEvaluationRepository.save({
        signalId: signal.id,
        time: new Date(),
        priceChange,
        reserveChange,
        marketCap: 0,
        priceWeight,
        reserveWeight,
        compositeScore,
      });
    } catch (error) {
      this.logger.error(
        `Error evaluating signal id:${signal.id} tokenAddress: ${signal.tokenAddress}`,
        error,
      );
    }
  }

  private async calculateChanges(ammPoolData: AmmPoolInfoType, signal: Signal) {
    const poolState = await this.tokenService.getAmmPoolState(ammPoolData);
    if (!poolState) {
      throw new Error('Error getting AMM pool state');
    }
    const priceChange = (poolState.price - signal.price) / signal.price;
    const reserveChange = (poolState.reserve - signal.reserve) / signal.reserve;

    return {
      priceChange,
      reserveChange,
    };
  }

  async updateStatistics(
    signal: Signal,
    evaluations: SignalEvaluation[],
  ): Promise<void> {
    try {
      const scores = evaluations.map((e) => e.compositeScore);
      const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const maxScore = Math.max(...scores);
      const minScore = Math.min(...scores);
      const stdDeviation = this.calculateStdDeviation(scores);

      await this.signalRepository.update(signal.id, {
        averageScore,
        maxScore,
        minScore,
        stdDeviation,
        evaluationStatus: EvaluationStatus.COMPLETED,
      });
    } catch (error) {
      this.logger.error(
        `Error updating statistics for signal ${signal.id}:`,
        error,
      );
      throw error;
    }
  }

  private calculateStdDeviation(scores: number[]): number {
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const squaredDiffs = scores.map((score) => Math.pow(score - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / scores.length);
  }

  @Cron('*/5 * * * *')
  async handleCron() {
    try {
      this.logger.log('Starting signal evaluation cron job');

      const signals = await this.signalRepository.find({
        where: { evaluationStatus: EvaluationStatus.PENDING },
      });

      for (const signal of signals) {
        try {
          const evaluationTimes = this.signalRepository.getEvaluationTimestamps(
            signal.marketCapLevel,
            signal.time,
          );

          for (const et of evaluationTimes) {
            if (Date.now() > et.getTime()) {
              await this.evaluateSignal(signal);
              break;
            }
          }

          const evaluations = await this.signalEvaluationRepository.find({
            where: { signalId: signal.id },
            order: { time: 'DESC' },
            take: evaluationTimes.length,
          });

          if (evaluations.length === evaluationTimes.length) {
            await this.updateStatistics(signal, evaluations);
          }
        } catch (error) {
          this.logger.error(
            `Error processing evaluation and statistics for signal ${signal.id}, ${signal.symbol}: ${signal.tokenAddress}`,
          );
          this.logger.error(error);
          continue;
        }
      }
    } catch (error) {
      this.logger.error('Error in signal evaluation cron job:', error);
    }
  }
}
