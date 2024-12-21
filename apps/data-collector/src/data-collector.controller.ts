import { Controller, Get } from '@nestjs/common';
import { DataCollectorService } from './data-collector.service';

@Controller()
export class DataCollectorController {
  constructor(private readonly dataCollectorService: DataCollectorService) {}

  @Get()
  getHello(): string {
    return this.dataCollectorService.getHello();
  }
}
