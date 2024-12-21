import { Injectable } from '@nestjs/common';

@Injectable()
export class SignalAnalyzerService {
  getHello(): string {
    return 'Hello World!';
  }
}
