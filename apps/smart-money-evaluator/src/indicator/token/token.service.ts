import { Injectable } from '@nestjs/common';
import { Platform } from '../types/platform.enum';

@Injectable()
export class TokenService {
  async getTokenPlatform(): Promise<Platform> {
    // TODO: Implement token platform lookup logic
    // This will be implemented in the next step when integrating with Data Collector
    return Platform.Moonshot;
  }
}
