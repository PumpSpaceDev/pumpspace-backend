import { Injectable } from '@nestjs/common';

@Injectable()
export class SignalRecorderService {
  getHello(): string {
    return 'Hello World!';
  }
}
