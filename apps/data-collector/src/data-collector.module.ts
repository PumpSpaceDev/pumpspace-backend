import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@app/config';
import { SharedModule, RedisModule } from '@app/shared';
import { DataCollectorController } from './data-collector.controller';
import { DataCollectorService } from './data-collector.service';
import { RaydiumGrpcListenerService } from './grpc/raydium-grpc-listener.service';
import { RaydiumParserService } from './parser/raydium-parser.service';
import { RedisPublisherService } from './redis/redis-publisher.service';
import { SwapsStorageService } from './database/swaps-storage.service';
import { Swap } from './entities/swap.entity';

@Module({
  imports: [
    ConfigModule,
    SharedModule,
    RedisModule,
    TypeOrmModule.forFeature([Swap]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...configService.databaseConfig,
        entities: [Swap],
      }),
    }),
  ],
  controllers: [DataCollectorController],
  providers: [
    DataCollectorService,
    RaydiumGrpcListenerService,
    RaydiumParserService,
    RedisPublisherService,
    SwapsStorageService,
  ],
})
export class DataCollectorModule {}
