import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@app/config';

@Injectable()
export class LoggerService implements NestLoggerService {
  constructor(private configService: ConfigService) {}

  error(message: string, trace?: string, context?: string) {
    console.error(
      `[Error][${context || 'Application'}] ${message}`,
      trace || '',
    );
  }

  warn(message: string, context?: string) {
    console.warn(`[Warn][${context || 'Application'}] ${message}`);
  }

  log(message: string, context?: string) {
    console.log(`[Info][${context || 'Application'}] ${message}`);
  }

  debug(message: string, context?: string) {
    const env = process.env.NODE_ENV || 'development';
    if (env !== 'production') {
      console.debug(`[Debug][${context || 'Application'}] ${message}`);
    }
  }

  verbose(message: string, context?: string) {
    const env = process.env.NODE_ENV || 'development';
    if (env !== 'production') {
      console.log(`[Verbose][${context || 'Application'}] ${message}`);
    }
  }
}
