import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { SmartMoney } from './entities/smart-money.entity';
import { SmartMoneyScore } from './entities/smart-money-score.entity';
import { ConfigService } from '@app/config';

@Injectable()
export class SmartMoneyEvaluatorService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(SmartMoneyEvaluatorService.name);
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    @InjectRepository(SmartMoney)
    private readonly smartMoneyRepository: Repository<SmartMoney>,
    @InjectRepository(SmartMoneyScore)
    private readonly scoreRepository: Repository<SmartMoneyScore>,
    private readonly configService: ConfigService,
  ) {}

  async evaluateAddress(address: string): Promise<number | null> {
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

  async updateScore(address: string, solBalance: bigint): Promise<void> {
    try {
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

      const score = new SmartMoneyScore();
      score.address = address;
      score.solBalance = solBalance;
      score.time = new Date();
      score.score = this.calculateScore(solBalance);

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

  private calculateScore(solBalance: bigint): number {
    const balanceInSol = Number(solBalance) / 1e9;
    return Math.min(Math.log10(balanceInSol + 1) * 10, 100);
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
