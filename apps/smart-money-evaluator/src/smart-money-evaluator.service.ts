import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { ConfigService } from '@app/config';
import { Score, SmartMoney } from '@app/interfaces';
import { IndicatorService } from './indicator/indicator.service';
import { Cron } from '@nestjs/schedule';
import { SmartMoneyRepository } from './repositories/smart-money.repository';

@Injectable()
export class SmartMoneyEvaluatorService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(SmartMoneyEvaluatorService.name);
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    @InjectRepository(SmartMoneyRepository)
    private readonly smartMoneyRepository: SmartMoneyRepository,
    @InjectRepository(Score)
    private readonly scoreRepository: Repository<Score>,
    private readonly configService: ConfigService,
    private readonly indicatorService: IndicatorService,
  ) {}

  async getScoreForAddress(address: string): Promise<number | null> {
    try {
      const smartMoney = await this.smartMoneyRepository.findOne({
        where: { address },
      });

      if (!smartMoney) {
        this.logger.warn(`Address ${address} not found in smart money list`);
        return null;
      }

      const latestScore = await this.scoreRepository.findOne({
        where: { address },
        order: { time: 'DESC' },
      });

      return latestScore?.score || 0;
    } catch (error) {
      this.logger.error(`Error evaluating address ${address}:`, error.stack);
      throw new Error(`Failed to evaluate address: ${error.message}`);
    }
  }

  async updateScore(smartMoney: SmartMoney, solBalance: bigint): Promise<void> {
    if (!smartMoney) {
      this.logger.warn(`Cannot update score for non-existent address`);
      throw new NotFoundException(`Address not found in smart money list`);
    }
    const address = smartMoney.address;
    try {
      if (!smartMoney) {
        this.logger.warn(
          `Cannot update score for non-existent address ${address}`,
        );
        throw new NotFoundException(
          `Address ${address} not found in smart money list`,
        );
      }

      const score = new Score();
      score.address = address;
      score.solBalance = solBalance;
      score.time = new Date();
      const { totalScore, indicators } =
        await this.indicatorService.calculateScore(address, smartMoney.network);
      score.score = totalScore;
      await this.indicatorService.saveIndicators(indicators, address);
      await this.scoreRepository.save(score);
      this.logger.log(`Updated score for address ${address}`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error updating score for address ${address}:`,
        error.stack,
      );
      throw new Error(`Failed to update score: ${error.message}`);
    }
  }

  async updateScoreForAddress(address: string): Promise<void> {
    const smartMoney = await this.smartMoneyRepository.findOne({
      where: { address },
    });

    if (!smartMoney) {
      this.logger.warn(
        `Cannot update score for non-existent address ${address}`,
      );
      throw new NotFoundException(
        `Address ${address} not found in smart money list`,
      );
    }

    //TODO - solbalance need to be fetched from the blockchain
    await this.updateScore(smartMoney, 0n);
  }

  @Cron('0 0 * * *')
  async updateScores(): Promise<void> {
    const batchSize = 100;
    let offset = 0;
    let smartMoneyBatch: SmartMoney[];

    do {
      smartMoneyBatch = await this.smartMoneyRepository.find({
        where: { syncStatus: true },
        take: batchSize,
        skip: offset,
      });

      for (const smartMoney of smartMoneyBatch) {
        //TODO - solbalance need to be fetched from the blockchain
        await this.updateScore(smartMoney, 0n);
      }

      offset += batchSize;
    } while (smartMoneyBatch.length === batchSize);
  }

  async onModuleInit() {
    const { cleanupInterval } = this.configService.smartMoneyConfig;
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupInterval);
    this.logger.log(
      'Smart Money Evaluator Service initialized with cleanup interval',
    );
  }

  async onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.logger.log('Cleanup interval cleared');
    }
  }

  // cleanup old score records, based on the configured retention period, now set to 30 days
  private async cleanup() {
    try {
      const { scoreRetentionDays } = this.configService.smartMoneyConfig;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - scoreRetentionDays);

      const result = await this.scoreRepository.delete({
        time: LessThan(cutoffDate),
      });

      this.logger.log(`Cleaned up ${result.affected} old score records`);
    } catch (error) {
      this.logger.error('Error during cleanup:', error.stack);
    }
  }
}
