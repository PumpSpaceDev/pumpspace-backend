import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { SignalEvaluation, Signal } from '@app/shared/entities';
import {
  UpdateEvaluationDto,
  EvaluationStatus,
} from './dto/update-evaluation.dto';
import { PaginationDto } from './dto/pagination.dto';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { SignalRepository } from '@app/shared/repositories';
import { AmmPoolService } from '@app/shared/amm-pool';
import { AmmPoolState } from '@app/interfaces/types/amm-pool-state.type';

@Injectable()
export class SignalAnalyzerService {
  constructor(
    @InjectRepository(SignalEvaluation)
    private signalEvaluationRepository: Repository<SignalEvaluation>,
    private readonly signalRepository: SignalRepository,
    private readonly ammPoolService: AmmPoolService,
    private readonly logger = new Logger(SignalAnalyzerService.name),
  ) {}

  async create(createDto: CreateEvaluationDto): Promise<SignalEvaluation> {
    try {
      const evaluation = this.signalEvaluationRepository.create({
        ...createDto,
        status: EvaluationStatus.PENDING,
      });
      return await this.signalEvaluationRepository.save(evaluation);
    } catch (error) {
      this.logger.error(
        'Failed to create signal evaluation',
        error.message,
        'SignalAnalyzerService',
      );
      throw new BadRequestException('Failed to create signal evaluation');
    }
  }

  async findAll(
    pagination: PaginationDto,
  ): Promise<{ items: SignalEvaluation[]; total: number }> {
    try {
      const [items, total] = await this.signalEvaluationRepository.findAndCount(
        {
          skip: pagination.skip,
          take: pagination.take,
          order: { evaluationTime: 'DESC' },
        },
      );
      return { items, total };
    } catch (error) {
      this.logger.error(
        'Failed to fetch signal evaluations',
        error.message,
        'SignalAnalyzerService',
      );
      throw new BadRequestException('Failed to fetch signal evaluations');
    }
  }

  async findOne(id: number): Promise<SignalEvaluation> {
    try {
      const evaluation = await this.signalEvaluationRepository.findOne({
        where: { id },
      });
      if (!evaluation) {
        throw new NotFoundException(
          `Signal evaluation with ID ${id} not found`,
        );
      }
      return evaluation;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to fetch signal evaluation with ID ${id}`,
        error.message,
        'SignalAnalyzerService',
      );
      throw new BadRequestException('Failed to fetch signal evaluation');
    }
  }

  async findBySignalId(signalId: number): Promise<SignalEvaluation> {
    try {
      const evaluation = await this.signalEvaluationRepository.findOne({
        where: { signalId },
      });
      if (!evaluation) {
        throw new NotFoundException(
          `Signal evaluation for signal ID ${signalId} not found`,
        );
      }
      return evaluation;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to fetch signal evaluation for signal ID ${signalId}`,
        error.message,
        'SignalAnalyzerService',
      );
      throw new BadRequestException('Failed to fetch signal evaluation');
    }
  }

  async update(
    id: number,
    updateDto: UpdateEvaluationDto,
  ): Promise<SignalEvaluation> {
    try {
      await this.findOne(id); // Verify record exists
      await this.signalEvaluationRepository.update(id, updateDto);
      return this.findOne(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to update signal evaluation with ID ${id}`,
        error.message,
        'SignalAnalyzerService',
      );
      throw new BadRequestException('Failed to update signal evaluation');
    }
  }

  async updateEvaluation(
    id: number,
    exitPrice: number,
  ): Promise<SignalEvaluation> {
    try {
      const evaluation = await this.findOne(id);
      const profitLoss = exitPrice - evaluation.entryPrice;
      const roi = (profitLoss / evaluation.entryPrice) * 100;

      return this.update(id, {
        exitPrice,
        profitLoss,
        roi,
        status: EvaluationStatus.COMPLETED,
      });
    } catch (error) {
      this.logger.error(
        `Failed to update evaluation with ID ${id}`,
        error.message,
        'SignalAnalyzerService',
      );
      throw new BadRequestException('Failed to update evaluation');
    }
  }

  async analyzeSignal(signalId: number): Promise<SignalEvaluation> {
    try {
      // Fetch the signal using SignalRepository
      const signal: Signal = await this.signalRepository.findOne({
        where: { id: signalId },
      });
      if (!signal) {
        throw new NotFoundException(`Signal with ID ${signalId} not found`);
      }

      // Get current AMM pool state for price and reserve data
      const poolState: AmmPoolState = await this.ammPoolService.getAmmPoolState(
        {
          baseVault: signal.address,
          quoteVault: 'So11111111111111111111111111111111111111112', // WSOL vault
          baseMint: signal.address,
          quoteMint: 'So11111111111111111111111111111111111111112', // WSOL mint
          baseReserve: 0,
          quoteReserve: 0,
        },
      );

      if (!poolState) {
        throw new BadRequestException(
          `Failed to get AMM pool state for token ${signal.symbol}`,
        );
      }

      // Calculate metrics using pool state
      const currentPrice = poolState.price;
      const priceChange = ((currentPrice - signal.price) / signal.price) * 100;
      const reserveChange =
        ((poolState.reserve - signal.reserve) / signal.reserve) * 100;

      // Calculate weights for composite score (can be adjusted based on requirements)
      const priceWeight = 0.7;
      const reserveWeight = 0.3;

      // Calculate composite score
      const compositeScore =
        priceChange * priceWeight + reserveChange * reserveWeight;

      // Calculate profit/loss and success rate
      const profitLoss = currentPrice - signal.price;
      const successRate = profitLoss > 0 ? 100 : 0; // Initial success rate based on current evaluation

      // Create evaluation record
      const evaluationDto: CreateEvaluationDto = {
        signalId: signal.id,
        signalUniqueCode: signal.uniqueCode,
        evaluationTime: new Date(),
        entryPrice: signal.price,
        exitPrice: currentPrice,
        profitLoss: currentPrice - signal.price,
        roi: ((currentPrice - signal.price) / signal.price) * 100,
        priceChange,
        reserveChange,
        marketCap: currentPrice * poolState.reserve,
        priceWeight,
        reserveWeight,
        compositeScore,
        successRate,
        status: EvaluationStatus.COMPLETED,
      };

      return await this.create(evaluationDto);
    } catch (error) {
      this.logger.error(
        `Failed to analyze signal with ID ${signalId}`,
        error.message,
        'SignalAnalyzerService',
      );
      throw error;
    }
  }

  async bulkAnalyzeSignals(options?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<{ successful: number; failed: number }> {
    try {
      // Build query conditions
      const where: any = {};
      if (options?.startDate && options?.endDate) {
        where.createdAt = {
          gte: options.startDate,
          lte: options.endDate,
        };
      }

      // Fetch signals with pagination if limit is provided
      const signals = await this.signalRepository.find({
        where,
        take: options?.limit,
        order: { createdAt: 'DESC' },
      });

      let successful = 0;
      let failed = 0;

      // Process signals in batches to avoid overwhelming the system
      const batchSize = 10;
      for (let i = 0; i < signals.length; i += batchSize) {
        const batch = signals.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map((signal) => this.analyzeSignal(signal.id)),
        );

        // Count successes and failures
        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            successful++;
          } else {
            failed++;
            this.logger.warn(
              `Failed to analyze signal in bulk operation: ${result.reason}`,
              'SignalAnalyzerService',
            );
          }
        });

        // Add a small delay between batches to prevent rate limiting
        if (i + batchSize < signals.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      return { successful, failed };
    } catch (error) {
      this.logger.error(
        'Failed to perform bulk signal analysis',
        error.message,
        'SignalAnalyzerService',
      );
      throw new BadRequestException('Failed to perform bulk signal analysis');
    }
  }
}
