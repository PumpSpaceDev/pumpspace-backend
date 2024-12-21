import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@app/config';
import { DataSource } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { LoggerService } from './logger/logger.service';

@Injectable()
export class SharedService implements OnModuleInit, OnModuleDestroy {
  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private logger: LoggerService,
  ) {}

  async onModuleInit() {
    await this.initializeDatabase();
  }

  private async initializeDatabase() {
    try {
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
        this.logger.log('Database connection initialized', 'SharedService');
      }
    } catch (error) {
      this.logger.error(
        'Failed to initialize database connection',
        error.message,
        'SharedService',
      );
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      if (this.dataSource.isInitialized) {
        await this.dataSource.destroy();
        this.logger.log('Database connection closed', 'SharedService');
      }
    } catch (error) {
      this.logger.error(
        'Error closing database connection',
        error.message,
        'SharedService',
      );
    }
  }

  async getFromCache<T>(key: string): Promise<T | null> {
    try {
      return await this.cacheManager.get<T>(key);
    } catch (error) {
      this.logger.error(
        `Failed to get value from cache for key: ${key}`,
        error.message,
        'SharedService',
      );
      throw error;
    }
  }

  async setInCache<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
    } catch (error) {
      this.logger.error(
        `Failed to set value in cache for key: ${key}`,
        error.message,
        'SharedService',
      );
      throw error;
    }
  }

  async deleteFromCache(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      this.logger.error(
        `Failed to delete value from cache for key: ${key}`,
        error.message,
        'SharedService',
      );
      throw error;
    }
  }

  getDataSource(): DataSource {
    if (!this.dataSource.isInitialized) {
      this.logger.warn('Accessing uninitialized DataSource', 'SharedService');
    }
    return this.dataSource;
  }
}
