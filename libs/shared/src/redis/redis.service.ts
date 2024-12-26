import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@app/config';
import Redis, { RedisOptions } from 'ioredis';

const POOL_SIZE = 5;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const MAX_BACKOFF = 10000; // 10 seconds
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_TIMEOUT = 30000; // 30 seconds

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private publisher: Redis;
  private subscriber: Redis;
  private connectionPool: Redis[] = [];
  private currentPoolIndex = 0;
  private failureCount = 0;
  private circuitOpen = false;
  private lastCircuitBreak: number | null = null;
  private readonly logger: Logger = new Logger(RedisService.name);

  constructor(private configService: ConfigService) {
    const options: RedisOptions = {
      ...this.configService.redisConfig,
      retryStrategy: (times: number) => {
        const delay = Math.min(Math.pow(2, times) * 100, MAX_BACKOFF);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      reconnectOnError: (err) => {
        this.handleConnectionError(err);
        return true;
      },
    };

    // Initialize connection pool
    for (let i = 0; i < POOL_SIZE; i++) {
      const client = new Redis(options);
      this.setupErrorHandling(client, `Pool-${i}`);
      this.connectionPool.push(client);
    }

    this.publisher = new Redis(options);
    this.subscriber = new Redis(options);

    this.setupErrorHandling(this.publisher, 'Publisher');
    this.setupErrorHandling(this.subscriber, 'Subscriber');

    // Start health checks
    this.startHealthChecks();
  }

  private setupErrorHandling(client: Redis, type: string) {
    client.on('error', (err) => {
      this.logger.error(`Redis ${type} error`, err.message, 'RedisService');
    });

    client.on('ready', () => {
      this.logger.log(`Redis ${type} ready`, 'RedisService');
    });

    client.on('reconnecting', () => {
      this.logger.warn(`Redis ${type} reconnecting`, 'RedisService');
    });
  }

  async onModuleInit() {
    await this.publisher.ping();
    await this.subscriber.ping();
  }

  async onModuleDestroy() {
    await Promise.all([
      this.publisher.quit(),
      this.subscriber.quit(),
      ...this.connectionPool.map((client) => client.quit()),
    ]);
  }

  private handleConnectionError(err: Error) {
    this.failureCount++;
    this.logger.error('Redis connection error', err.message, 'RedisService');

    if (this.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitOpen = true;
      this.lastCircuitBreak = Date.now();
      this.logger.warn('Circuit breaker opened', 'RedisService');
    }
  }

  private async startHealthChecks() {
    setInterval(async () => {
      try {
        // Check circuit breaker status
        if (
          this.circuitOpen &&
          this.lastCircuitBreak &&
          Date.now() - this.lastCircuitBreak > CIRCUIT_BREAKER_RESET_TIMEOUT
        ) {
          this.circuitOpen = false;
          this.failureCount = 0;
          this.logger.log('Circuit breaker reset', 'RedisService');
        }

        // Health check all connections
        await Promise.all([
          this.publisher.ping(),
          this.subscriber.ping(),
          ...this.connectionPool.map((client) => client.ping()),
        ]);

        if (this.failureCount > 0) {
          this.failureCount = 0;
        }
      } catch (error) {
        this.handleConnectionError(error);
      }
    }, HEALTH_CHECK_INTERVAL);
  }

  private getNextPoolClient(): Redis {
    this.currentPoolIndex = (this.currentPoolIndex + 1) % POOL_SIZE;
    return this.connectionPool[this.currentPoolIndex];
  }

  getPublisher(): Redis {
    return this.publisher;
  }

  getSubscriber(): Redis {
    return this.subscriber;
  }

  async publish(channel: string, message: any) {
    try {
      return await this.publisher.publish(channel, JSON.stringify(message));
    } catch (error) {
      this.logger.error(
        `Failed to publish message to channel ${channel}`,
        error.message,
        'RedisService',
      );
    }
  }

  //TODO should be able to handle errors and retry
  async subscribe(
    channel: string,
    callback: (channel: string, message: string) => void,
  ) {
    try {
      await this.subscriber.subscribe(channel);
      this.subscriber.on('message', callback);
      this.logger.log(`Subscribed to channel: ${channel}`, 'RedisService');
    } catch (error) {
      this.logger.error(
        `Failed to subscribe to channel: ${channel}`,
        error.message,
        'RedisService',
      );
      throw error;
    }
  }

  async hset(key: string, field: string, value: string | number) {
    try {
      return await this.publisher.hset(key, field, value.toString());
    } catch (error) {
      this.logger.error(
        `Failed to set hash field: ${field} for key: ${key}`,
        error.message,
        'RedisService',
      );
      throw error;
    }
  }

  async hincrby(key: string, field: string, increment: number) {
    try {
      return await this.publisher.hincrby(key, field, increment);
    } catch (error) {
      this.logger.error(
        `Failed to increment hash field: ${field} for key: ${key}`,
        error.message,
        'RedisService',
      );
      throw error;
    }
  }

  async hget(key: string, field: string) {
    try {
      return await this.publisher.hget(key, field);
    } catch (error) {
      this.logger.error(
        `Failed to get hash field: ${field} for key: ${key}`,
        error.message,
        'RedisService',
      );
      throw error;
    }
  }

  async hgetall(key: string) {
    try {
      return await this.publisher.hgetall(key);
    } catch (error) {
      this.logger.error(
        `Failed to get all hash fields for key: ${key}`,
        error.message,
        'RedisService',
      );
      throw error;
    }
  }

  async expire(key: string, seconds: number) {
    try {
      return await this.publisher.expire(key, seconds);
    } catch (error) {
      this.logger.error(
        `Failed to set expiry for key: ${key}`,
        error.message,
        'RedisService',
      );
      throw error;
    }
  }

  async get(key: string) {
    if (this.circuitOpen) {
      throw new Error('Circuit breaker is open');
    }

    try {
      return await this.getNextPoolClient().get(key);
    } catch (error) {
      this.logger.error(
        `Failed to get value for key: ${key}`,
        error.message,
        'RedisService',
      );
      throw error;
    }
  }

  /**
   *
   * @param key key to set
   * @param value value to set
   * @param ttl time to live in seconds
   * @returns
   */
  async set(key: string, value: string | number, ttl?: number) {
    if (this.circuitOpen) {
      throw new Error('Circuit breaker is open');
    }

    try {
      if (ttl) {
        return await this.getNextPoolClient().set(
          key,
          value.toString(),
          'EX',
          ttl,
        );
      }
      return await this.getNextPoolClient().set(key, value.toString());
    } catch (error) {
      this.logger.error(
        `Failed to set value for key: ${key}`,
        error.message,
        'RedisService',
      );
      throw error;
    }
  }
}
