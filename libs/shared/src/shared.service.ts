import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@app/config';
import { DataSource } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class SharedService implements OnModuleInit {
  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async onModuleInit() {
    await this.initializeDatabase();
  }

  private async initializeDatabase() {
    if (!this.dataSource.isInitialized) {
      await this.dataSource.initialize();
    }
  }

  async getFromCache<T>(key: string): Promise<T | null> {
    return this.cacheManager.get<T>(key);
  }

  async setInCache<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl);
  }

  async deleteFromCache(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  getDataSource(): DataSource {
    return this.dataSource;
  }
}
