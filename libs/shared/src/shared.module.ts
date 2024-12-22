import { Module } from '@nestjs/common';
import { SharedService } from './shared.service';
import { ConfigModule, ConfigService } from '@app/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from './redis';
import { TokenStatsModule } from './token-stats';
import { MetricsModule } from './metrics/metrics.module';
import { CacheModule } from '@nestjs/cache-manager';
import { LoggerModule } from './logger/logger.module';

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
    CacheModule.register({
      //TODO should be reconsidered
      ttl: 5, // seconds
      max: 10, // maximum number of items in cache
    }),
    RedisModule,
    TokenStatsModule,
    MetricsModule,
    LoggerModule,
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
