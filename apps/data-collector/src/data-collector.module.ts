import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@app/config';
import { SharedModule, RedisModule } from '@app/shared';
import { DataCollectorController } from './data-collector.controller';
import { DataCollectorService } from './data-collector.service';
import { Swap } from './entities/swap.entity';

@Module({
  imports: [
    ConfigModule,
    SharedModule,
    RedisModule,
    TypeOrmModule.forFeature([Swap]),
  ],
  controllers: [DataCollectorController],
  providers: [DataCollectorService],
})
export class DataCollectorModule {}
