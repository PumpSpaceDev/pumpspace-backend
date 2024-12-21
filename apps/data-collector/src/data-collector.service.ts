import { Injectable } from '@nestjs/common';

@Injectable()
export class DataCollectorService {
  getHello(): string {
    return 'Hello World!';
  }
}
