import {
  Controller,
  Logger,
  Get,
  Query,
  HttpStatus,
  HttpException,
  ValidationPipe,
} from '@nestjs/common';
import { AnalysisStatisticsService } from './analysis-statistics.service';
import { TokenStatisticsDto } from './dto/token-statistics.dto';

@Controller('analysis')
export class AnalysisStatisticsController {
  private readonly logger = new Logger(AnalysisStatisticsController.name);

  constructor(
    private readonly analysisStatisticsService: AnalysisStatisticsService,
  ) {}

  @Get('token-stats')
  async getTokenStats(
    @Query(new ValidationPipe({ transform: true })) query: TokenStatisticsDto,
  ) {
    try {
      const stats = await this.analysisStatisticsService.getTokenStats(query);
      return stats;
    } catch (error) {
      this.logger.error('Error fetching token statistics:', error);
      throw new HttpException(
        error.message || 'Failed to fetch token statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('token-stats/windows')
  getAvailableWindows() {
    return ['5m', '1h', '24h'];
  }
}
