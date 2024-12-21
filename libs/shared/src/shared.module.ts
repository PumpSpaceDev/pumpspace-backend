import { Module } from '@nestjs/common';
import { SharedService } from './shared.service';
import { ConfigModule, ConfigService } from '@app/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { RedisClientOptions } from 'redis';
import * as redisStore from 'cache-manager-redis-store';

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
    CacheModule.registerAsync<RedisClientOptions>({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore as any,
        ...configService.redisConfig,
        ttl: 60 * 60 * 24, // 24 hours
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [SharedService],
  exports: [SharedService, TypeOrmModule, CacheModule],
})
export class SharedModule {}
