import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmartMoney } from './entities/smart-money.entity';
import { SmartMoneyScore } from './entities/smart-money-score.entity';

@Injectable()
export class SmartMoneyEvaluatorService {
  private readonly logger = new Logger(SmartMoneyEvaluatorService.name);

  constructor(
    @InjectRepository(SmartMoney)
    private readonly smartMoneyRepository: Repository<SmartMoney>,
    @InjectRepository(SmartMoneyScore)
    private readonly scoreRepository: Repository<SmartMoneyScore>,
  ) {}

  async evaluateAddress(address: string): Promise<number> {
    try {
      const smartMoney = await this.smartMoneyRepository.findOne({
        where: { address },
      });

      if (!smartMoney) {
        this.logger.warn(`Address ${address} not found in smart money list`);
        return 0;
      }

      const latestScore = await this.scoreRepository.findOne({
        where: { address },
        order: { time: 'DESC' },
      });

      return latestScore?.score || 0;
    } catch (error) {
      this.logger.error(`Error evaluating address ${address}:`, error);
      throw error;
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
        return;
      }

      const score = new SmartMoneyScore();
      score.address = address;
      score.solBalance = solBalance;
      score.time = new Date();
      score.score = this.calculateScore(solBalance);

      await this.scoreRepository.save(score);
      this.logger.log(`Updated score for address ${address}`);
    } catch (error) {
      this.logger.error(`Error updating score for address ${address}:`, error);
      throw error;
    }
  }

  private calculateScore(solBalance: bigint): number {
    const balanceInSol = Number(solBalance) / 1e9;
    return Math.min(Math.log10(balanceInSol + 1) * 10, 100);
  }
}
