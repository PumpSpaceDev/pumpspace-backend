import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Swap } from './entities/swap.entity';
import { CreateSwapDto, SwapFilterDto } from './dto/swap.dto';
import { RedisService } from '@app/shared';

@Injectable()
export class DataCollectorService {
  private readonly logger = new Logger(DataCollectorService.name);

  constructor(
    @InjectRepository(Swap)
    private readonly swapRepository: Repository<Swap>,
    private readonly redisService: RedisService,
  ) {}

  async createSwap(createSwapDto: CreateSwapDto): Promise<Swap> {
    try {
      const existingSwap = await this.swapRepository.findOne({
        where: { signature: createSwapDto.signature },
      });

      if (existingSwap) {
        throw new BadRequestException(
          'Swap with this signature already exists',
        );
      }

      const swap = this.swapRepository.create({
        ...createSwapDto,
        amountIn: createSwapDto.amountIn.toString(),
        amountOut: createSwapDto.amountOut.toString(),
      });
      const savedSwap = await this.swapRepository.save(swap);

      // Publish to Redis for real-time processing
      await this.redisService.publish(
        'swap:created',
        JSON.stringify(savedSwap),
      );

      return savedSwap;
    } catch (error) {
      this.logger.error('Error creating swap:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create swap');
    }
  }

  async findSwaps(
    filters: SwapFilterDto,
  ): Promise<{ items: Swap[]; total: number }> {
    try {
      const queryBuilder = this.swapRepository.createQueryBuilder('swap');

      if (filters.signer) {
        queryBuilder.andWhere('swap.signer = :signer', {
          signer: filters.signer,
        });
      }

      if (filters.amm) {
        queryBuilder.andWhere('swap.amm = :amm', { amm: filters.amm });
      }

      if (filters.market) {
        queryBuilder.andWhere('swap.market = :market', {
          market: filters.market,
        });
      }

      queryBuilder
        .orderBy('swap.timestamp', 'DESC')
        .skip(filters.skip)
        .take(filters.take);

      const [items, total] = await queryBuilder.getManyAndCount();

      return { items, total };
    } catch (error) {
      this.logger.error('Error fetching swaps:', error);
      throw new BadRequestException('Failed to fetch swaps');
    }
  }

  async findSwapBySignature(signature: string): Promise<Swap> {
    try {
      const swap = await this.swapRepository.findOne({
        where: { signature },
      });

      if (!swap) {
        throw new NotFoundException(
          `Swap with signature ${signature} not found`,
        );
      }

      return swap;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error fetching swap ${signature}:`, error);
      throw new BadRequestException('Failed to fetch swap');
    }
  }
}
