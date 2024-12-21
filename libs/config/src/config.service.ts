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
        logging: this.configService.get<boolean>('DB_LOGGING', false),
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
}
