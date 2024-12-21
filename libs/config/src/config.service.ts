import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { RedisClientOptions } from 'redis';

@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService) {}

  get databaseConfig(): Partial<TypeOrmModuleOptions> {
    return {
      type: 'postgres' as const,
      host: this.configService.get<string>('DB_HOST'),
      port: this.configService.get<number>('DB_PORT'),
      username: this.configService.get<string>('DB_USERNAME'),
      password: this.configService.get<string>('DB_PASSWORD'),
      database: this.configService.get<string>('DB_DATABASE'),
      synchronize: this.configService.get<boolean>('DB_SYNCHRONIZE', false),
      logging: this.configService.get<boolean>('DB_LOGGING', false),
    };
  }

  get redisConfig(): RedisClientOptions {
    return {
      socket: {
        host: this.configService.get<string>('REDIS_HOST'),
        port: this.configService.get<number>('REDIS_PORT'),
      },
      password: this.configService.get<string>('REDIS_PASSWORD'),
      database: this.configService.get<number>('REDIS_DB', 0),
    };
  }

  get shyftConfig() {
    return {
      apiKey: this.configService.get<string>('SHYFT_API_KEY'),
      endpoint: this.configService.get<string>('SHYFT_ENDPOINT'),
    };
  }
}
