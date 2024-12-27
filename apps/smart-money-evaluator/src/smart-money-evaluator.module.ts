import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@app/config';
import { SharedModule, RedisModule } from '@app/shared';
import { IndicatorService } from './indicator/indicator.service';
import { IndicatorRepository } from './indicator/repositories/indicator.repository';
import { ScoreRepository } from './indicator/repositories/score.repository';
import { TokenService } from './indicator/token/token.service';
import { Swap } from '@app/shared-swaps';
import { Indicator, Score } from '@app/interfaces/entities';
import { DataCollectorModule } from '@pumpspace/data-collector';

@Module({
  imports: [
    ConfigModule,
    SharedModule,
    RedisModule,
    DataCollectorModule,
    TypeOrmModule.forFeature([Swap, Indicator, Score]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...configService.databaseConfig,
        entities: [Swap, Indicator, Score],
      }),
    }),
  ],
  providers: [
    IndicatorService,
    IndicatorRepository,
    ScoreRepository,
    TokenService,
  ],
})
export class SmartMoneyEvaluatorModule {}
