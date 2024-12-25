import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { RedisOptions } from 'ioredis';

@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService) {}

  get databaseConfig(): Partial<TypeOrmModuleOptions> {
    try {
      return {
        type: 'postgres' as const,
        host: this.getRequiredConfig<string>('DB_HOST'),
        port: this.configService.get<number>('DB_PORT', 5432),
        username: this.getRequiredConfig<string>('DB_USERNAME'),
        password: this.getRequiredConfig<string>('DB_PASSWORD'),
        database: this.getRequiredConfig<string>('DB_DATABASE'),
        synchronize: this.configService.get<boolean>('DB_SYNCHRONIZE', false),
        logging: this.configService.get<boolean>('DB_LOGGING', true),
        ssl: this.configService.get<boolean>('DB_SSL', false),
        extra: {
          max: this.configService.get<number>('DB_MAX_CONNECTIONS', 100),
        },
        retryAttempts: 10,
        retryDelay: 3000,
        autoLoadEntities: true,
      };
    } catch (error) {
      throw new Error(
        `Failed to load database configuration: ${error.message}`,
      );
    }
  }

  get redisConfig(): RedisOptions {
    try {
      const config: RedisOptions = {
        host: this.getRequiredConfig('REDIS_HOST'),
        port: this.configService.get<number>('REDIS_PORT', 6379),
        password: this.configService.get<string>('REDIS_PASSWORD'),
        db: this.configService.get<number>('REDIS_DB', 0),
        tls: this.configService.get<boolean>('REDIS_TLS') ? {} : undefined,
        keyPrefix: this.configService.get<string>(
          'REDIS_KEY_PREFIX',
          'pumpspace:',
        ),
        retryStrategy: (times: number) => {
          const delay = this.configService.get<number>(
            'REDIS_RETRY_DELAY',
            3000,
          );
          const maxAttempts = this.configService.get<number>(
            'REDIS_RETRY_ATTEMPTS',
            10,
          );
          if (times > maxAttempts) {
            return null; // Stop retrying
          }
          return delay; // Time to wait before next retry
        },
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        connectTimeout: 10000,
        lazyConnect: true,
      };

      // Note: Redis connection pooling will be implemented at the shared Redis service level
      // using a connection pool manager, as ioredis doesn't support poolSize in its options

      return config;
    } catch (error) {
      throw new Error(`Failed to load Redis configuration: ${error.message}`);
    }
  }

  private getRequiredConfig<T>(key: string): T {
    const value = this.configService.get<T>(key);
    if (value === undefined) {
      throw new Error(`Required configuration key "${key}" is missing`);
    }
    return value;
  }

  get shyftConfig() {
    return {
      apiKey: this.configService.get<string>('SHYFT_API_KEY'),
      endpoint: this.configService.get<string>('SHYFT_ENDPOINT'),
    };
  }

  get notificationConfig() {
    try {
      const config = {
        queueName: this.configService.get<string>(
          'NOTIFICATION_QUEUE_NAME',
          'notifications',
        ),
        queueConcurrency: this.configService.get<number>(
          'NOTIFICATION_QUEUE_CONCURRENCY',
          3,
        ),
        queueAttempts: this.configService.get<number>(
          'NOTIFICATION_QUEUE_ATTEMPTS',
          3,
        ),
        queueBackoff: this.configService.get<number>(
          'NOTIFICATION_QUEUE_BACKOFF',
          5000,
        ),
        batchSize: this.configService.get<number>(
          'NOTIFICATION_BATCH_SIZE',
          50,
        ),
      };

      // Validate configuration values
      if (config.queueConcurrency < 1 || config.queueConcurrency > 10) {
        throw new Error(
          'NOTIFICATION_QUEUE_CONCURRENCY must be between 1 and 10',
        );
      }
      if (config.queueAttempts < 1 || config.queueAttempts > 10) {
        throw new Error('NOTIFICATION_QUEUE_ATTEMPTS must be between 1 and 10');
      }
      if (config.queueBackoff < 1000 || config.queueBackoff > 60000) {
        throw new Error(
          'NOTIFICATION_QUEUE_BACKOFF must be between 1000ms and 60000ms',
        );
      }
      if (config.batchSize < 1 || config.batchSize > 100) {
        throw new Error('NOTIFICATION_BATCH_SIZE must be between 1 and 100');
      }
      if (!config.queueName || config.queueName.trim().length === 0) {
        throw new Error(
          'NOTIFICATION_QUEUE_NAME is required and cannot be empty',
        );
      }

      return config;
    } catch (error) {
      throw new Error(
        `Failed to load notification configuration: ${error.message}`,
      );
    }
  }

  get smartMoneyConfig() {
    return {
      port: this.configService.get<number>('SMART_MONEY_PORT', 3000),
      cleanupInterval: this.configService.get<number>(
        'SMART_MONEY_CLEANUP_INTERVAL',
        3600000,
      ),
      scoreRetentionDays: this.configService.get<number>(
        'SMART_MONEY_SCORE_RETENTION_DAYS',
        30,
      ),
    };
  }

  get metricsConfig() {
    return {
      enabled: this.configService.get<boolean>('METRICS_ENABLED', true),
      path: this.configService.get<string>('METRICS_PATH', '/metrics'),
    };
  }

  get serviceConfig() {
    return {
      notification: {
        port: this.configService.get<number>('NOTIFICATION_PORT', 3000),
      },
      dataCollector: {
        port: this.configService.get<number>('DATA_COLLECTOR_PORT', 3001),
      },
      analysisStatistics: {
        port: this.configService.get<number>('ANALYSIS_STATISTICS_PORT', 3002),
      },
      signalRecorder: {
        port: this.configService.get<number>('SIGNAL_RECORDER_PORT', 3003),
      },
      signalAnalyzer: {
        port: this.configService.get<number>('SIGNAL_ANALYZER_PORT', 3004),
      },
    };
  }

  get grpcConfig() {
    return {
      endpoint: this.configService.get<string>('GRPC_ENDPOINT'),
      token: this.configService.get<string>('GRPC_TOKEN'),
    };
  }

  /**
   * Returns the configuration for the Helius RPC service
   * @returns {apiKey:string, baseUrl:string} - The Helius RPC service configuration
   * @memberof ConfigService
   * @public
   * @readonly
   * @example
   * const config = configService.heliusConfig;
   * const rpcUrl = `${config.baseUrl}${config.apiKey}`;
   *
   */
  get heliusConfig() {
    return {
      apiKey: this.getRequiredConfig<string>('HELIUS_API_KEY'),
      baseUrl: 'https://mainnet.helius-rpc.com/?api-key=',
    };
  }
}
