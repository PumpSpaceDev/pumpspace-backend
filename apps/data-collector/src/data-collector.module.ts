import { Module } from '@nestjs/common';
import { DataCollectorController } from './data-collector.controller';
import { DataCollectorService } from './data-collector.service';

@Module({
  imports: [],
  controllers: [DataCollectorController],
  providers: [DataCollectorService],
})
export class DataCollectorModule {}
