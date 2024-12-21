import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@app/config';
import { AnalysisStatisticsController } from './analysis-statistics.controller';
import { AnalysisStatisticsService } from './analysis-statistics.service';
import { TokenBucket } from './entities/token-bucket.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        ...configService.getDatabaseConfig(),
        entities: [TokenBucket],
        synchronize: process.env.NODE_ENV !== 'production',
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([TokenBucket]),
  ],
  controllers: [AnalysisStatisticsController],
  providers: [AnalysisStatisticsService],
})
export class AnalysisStatisticsModule {}
