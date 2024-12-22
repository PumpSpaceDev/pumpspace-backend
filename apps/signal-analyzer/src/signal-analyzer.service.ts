import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { SignalEvaluation } from './entities/signal-evaluation.entity';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import {
  UpdateEvaluationDto,
  EvaluationStatus,
} from './dto/update-evaluation.dto';
import { PaginationDto } from './dto/pagination.dto';

@Injectable()
export class SignalAnalyzerService {
  constructor(
    @InjectRepository(SignalEvaluation)
    private signalEvaluationRepository: Repository<SignalEvaluation>,
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
}
