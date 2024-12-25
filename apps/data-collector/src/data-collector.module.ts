import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@app/config';
import { SharedModule, RedisModule } from '@app/shared';
import { DataCollectorService } from './data-collector.service';
import { RaydiumGrpcListenerService } from './grpc/raydium-grpc-listener.service';
import { RaydiumParserService } from './parser/raydium-parser.service';
import { Swap } from '@app/shared-swaps';

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
  providers: [
    DataCollectorService,
    RaydiumGrpcListenerService,
    RaydiumParserService,
  ],
})
export class DataCollectorModule {}
