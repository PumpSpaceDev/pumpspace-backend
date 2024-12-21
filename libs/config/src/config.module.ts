import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { ConfigService } from './config.service';
import * as Joi from 'joi';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        // Metrics Configuration
        METRICS_ENABLED: Joi.boolean()
          .default(true)
          .description('Enable/disable Prometheus metrics'),
        METRICS_PATH: Joi.string()
          .default('/metrics')
          .description('Path for Prometheus metrics endpoint'),

        // Database Configuration
        DB_HOST: Joi.string().required().description('Database host address'),
        DB_PORT: Joi.number().default(5432).description('Database port'),
        DB_USERNAME: Joi.string().required().description('Database username'),
        DB_PASSWORD: Joi.string().required().description('Database password'),
        DB_DATABASE: Joi.string().required().description('Database name'),
        DB_SYNCHRONIZE: Joi.boolean()
          .default(false)
          .description('Enable/disable database schema synchronization'),
        DB_LOGGING: Joi.boolean()
          .default(false)
          .description('Enable/disable database query logging'),
        DB_SSL: Joi.boolean()
          .default(false)
          .description('Enable/disable SSL for database connection'),
        DB_MAX_CONNECTIONS: Joi.number()
          .default(100)
          .description('Maximum number of database connections'),

        // Redis Configuration
        REDIS_HOST: Joi.string().required().description('Redis host address'),
        REDIS_PORT: Joi.number().default(6379).description('Redis port'),
        REDIS_PASSWORD: Joi.string()
          .allow('')
          .optional()
          .description('Redis password'),
        REDIS_DB: Joi.number().default(0).description('Redis database number'),
        REDIS_TLS: Joi.boolean()
          .default(false)
          .description('Enable/disable TLS for Redis connection'),
        REDIS_KEY_PREFIX: Joi.string()
          .default('pumpspace:')
          .description('Prefix for Redis keys'),
        REDIS_RETRY_ATTEMPTS: Joi.number()
          .default(10)
          .description('Number of Redis connection retry attempts'),
        REDIS_RETRY_DELAY: Joi.number()
          .default(3000)
          .description('Delay between Redis connection retries in ms'),
        REDIS_POOL_SIZE: Joi.number()
          .default(10)
          .description('Redis connection pool size'),

        // Shyft Configuration
        SHYFT_API_KEY: Joi.string().required().description('Shyft API key'),
        SHYFT_ENDPOINT: Joi.string()
          .required()
          .description('Shyft API endpoint'),
        SHYFT_TIMEOUT: Joi.number()
          .default(30000)
          .description('Shyft API timeout in ms'),

        // Smart Money Evaluator Configuration
        SMART_MONEY_PORT: Joi.number()
          .default(3000)
          .description('Smart Money Evaluator service port'),
        SMART_MONEY_CLEANUP_INTERVAL: Joi.number()
          .default(3600000)
          .description('Interval for cleaning up old scores (ms)'),
        SMART_MONEY_SCORE_RETENTION_DAYS: Joi.number()
          .default(30)
          .description('Number of days to retain score history'),

        // Notification Service Configuration
        NOTIFICATION_QUEUE_NAME: Joi.string()
          .required()
          .default('notifications')
          .description('Name of the notification queue'),
        NOTIFICATION_QUEUE_ATTEMPTS: Joi.number()
          .min(1)
          .max(10)
          .default(3)
          .description('Number of retry attempts for notification queue'),
        NOTIFICATION_QUEUE_BACKOFF: Joi.number()
          .min(1000)
          .max(60000)
          .default(5000)
          .description('Backoff delay for notification queue retries (ms)'),
        NOTIFICATION_BATCH_SIZE: Joi.number()
          .min(1)
          .max(100)
          .default(50)
          .description('Batch size for processing notifications'),
      }),
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
