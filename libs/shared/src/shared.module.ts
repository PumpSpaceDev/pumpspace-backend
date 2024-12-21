import { Module } from '@nestjs/common';
import { SharedService } from './shared.service';
import { ConfigModule, ConfigService } from '@app/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from './redis';
import { TokenStatsModule } from './token-stats';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        ...configService.databaseConfig,
        autoLoadEntities: true,
      }),
      inject: [ConfigService],
    }),
    RedisModule,
    TokenStatsModule,
    MetricsModule,
  ],
  providers: [SharedService],
  exports: [
    SharedService,
    TypeOrmModule,
    RedisModule,
    TokenStatsModule,
    MetricsModule,
  ],
})
export class SharedModule {}
