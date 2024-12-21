import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { ConfigService } from './config.service';
import * as Joi from 'joi';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        // Database Configuration
        DB_HOST: Joi.string().required().description('Database host address'),
        DB_PORT: Joi.number().default(5432).description('Database port'),
        DB_USERNAME: Joi.string().required().description('Database username'),
        DB_PASSWORD: Joi.string().required().description('Database password'),
        DB_DATABASE: Joi.string().required().description('Database name'),
        DB_SYNCHRONIZE: Joi.boolean().default(false).description('Enable/disable database schema synchronization'),
        DB_LOGGING: Joi.boolean().default(false).description('Enable/disable database query logging'),
        DB_SSL: Joi.boolean().default(false).description('Enable/disable SSL for database connection'),
        DB_MAX_CONNECTIONS: Joi.number().default(100).description('Maximum number of database connections'),
        
        // Redis Configuration
        REDIS_HOST: Joi.string().required().description('Redis host address'),
        REDIS_PORT: Joi.number().default(6379).description('Redis port'),
        REDIS_PASSWORD: Joi.string().allow('').optional().description('Redis password'),
        REDIS_DB: Joi.number().default(0).description('Redis database number'),
        REDIS_TLS: Joi.boolean().default(false).description('Enable/disable TLS for Redis connection'),
        REDIS_KEY_PREFIX: Joi.string().default('pumpspace:').description('Prefix for Redis keys'),
        REDIS_RETRY_ATTEMPTS: Joi.number().default(10).description('Number of Redis connection retry attempts'),
        REDIS_RETRY_DELAY: Joi.number().default(3000).description('Delay between Redis connection retries in ms'),
        REDIS_POOL_SIZE: Joi.number().default(10).description('Redis connection pool size'),
        
        // Shyft Configuration
        SHYFT_API_KEY: Joi.string().required().description('Shyft API key'),
        SHYFT_ENDPOINT: Joi.string().required().description('Shyft API endpoint'),
        SHYFT_TIMEOUT: Joi.number().default(30000).description('Shyft API timeout in ms'),
      }),
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
