import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@app/config';
import { SharedModule } from '@app/shared';
import { RedisModule } from '@app/shared/redis';
import { AnalysisStatisticsController } from './analysis-statistics.controller';
import { AnalysisStatisticsService } from './analysis-statistics.service';
import { TokenBucket } from './entities/token-bucket.entity';

@Module({
  imports: [
    ConfigModule,
    SharedModule,
    RedisModule,
    TypeOrmModule.forFeature([TokenBucket]),
  ],
  controllers: [AnalysisStatisticsController],
  providers: [AnalysisStatisticsService],
  exports: [TypeOrmModule.forFeature([TokenBucket])],
})
export class AnalysisStatisticsModule {}
