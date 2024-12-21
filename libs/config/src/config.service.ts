import { Injectable } from '@nestjs/common';
import { RedisClientOptions } from 'redis';

interface RaydiumConfig {
  poolAddresses: string[];
}

interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

interface ShyftConfig {
  endpoint: string;
  apiKey: string;
}

@Injectable()
export class ConfigService {
  public readonly raydiumConfig: RaydiumConfig = {
    poolAddresses: process.env.RAYDIUM_POOL_ADDRESSES?.split(',') || [],
  };

  public readonly redisConfig: RedisClientOptions = {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD,
  };

  public readonly databaseConfig: DatabaseConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'pumpspace',
  };

  public readonly shyftConfig: ShyftConfig = {
    endpoint: process.env.SHYFT_ENDPOINT || 'localhost:50051',
    apiKey: process.env.SHYFT_API_KEY || '',
  };
}
