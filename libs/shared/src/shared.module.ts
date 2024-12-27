import { Module } from '@nestjs/common';
import { SharedService } from './shared.service';
import { ConfigModule, ConfigService } from '@app/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from './redis';
import { TokenStatsModule } from './token-stats';
import { MetricsModule } from './metrics/metrics.module';
import { CacheModule } from '@nestjs/cache-manager';
import { HeliusApiManager } from './rpc';
import { TokenService } from './token';
import { Token } from '@app/interfaces';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        ...configService.databaseConfig,
        autoLoadEntities: true,
        entities: [Token],
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
  ],
  providers: [SharedService, HeliusApiManager, TokenService],
  exports: [
    SharedService,
    TypeOrmModule,
    RedisModule,
    TokenStatsModule,
    MetricsModule,
    HeliusApiManager,
    TokenService,
  ],
})
export class SharedModule {}
