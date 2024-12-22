import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@app/config';
import * as winston from 'winston';
import { AsyncLocalStorage } from 'async_hooks';
import * as fs from 'fs-extra';
import * as path from 'path';

const correlationStorage = new AsyncLocalStorage<string>();

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;

  constructor(private configService: ConfigService) {
    const env = process.env.NODE_ENV || 'development';
    const logLevel = process.env.LOG_LEVEL || 'info';

    // Ensure logs directory exists in production
    if (env === 'production') {
      const logsDir = path.join(process.cwd(), 'logs');
      fs.ensureDirSync(logsDir);
    }

    const format = winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
      winston.format.printf((info) => {
        const correlationId = correlationStorage.getStore();
        return JSON.stringify({
          timestamp: info.timestamp,
          level: info.level,
          context: info.context || 'Application',
          message: info.message,
          correlationId: correlationId || 'no-correlation-id',
          ...(info.trace && { trace: info.trace }),
          ...(info.data && { data: info.data }),
        });
      }),
    );

    const transports: winston.transport[] = [
      new winston.transports.Console({
        format:
          env === 'development'
            ? winston.format.colorize({ all: true })
            : undefined,
      }),
    ];

    if (env === 'production') {
      transports.push(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
      );
    }

    this.logger = winston.createLogger({
      level: logLevel,
      format,
      transports,
    });
  }

  static setCorrelationId(correlationId: string) {
    correlationStorage.enterWith(correlationId);
  }

  error(message: string, trace?: string, context?: string, data?: any) {
    this.logger.error(message, { trace, context, data });
  }

  warn(message: string, context?: string, data?: any) {
    this.logger.warn(message, { context, data });
  }

  log(message: string, context?: string, data?: any) {
    this.logger.info(message, { context, data });
  }

  debug(message: string, context?: string, data?: any) {
    this.logger.debug(message, { context, data });
  }

  verbose(message: string, context?: string, data?: any) {
    this.logger.verbose(message, { context, data });
  }
}
