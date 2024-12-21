
# Complete Data-Collector Implementation Guide

This document provides a complete implementation of the `data-collector` module in a NestJS Monorepo, based on the extracted logic from the `solana-tx-watcher` project.

---

## 1. Module Overview

The `data-collector` module is responsible for:
- Listening to gRPC streams for transactions.
- Filtering and parsing Raydium-related transactions.
- Publishing transactions to Redis Pub/Sub.
- Storing transactions in PostgreSQL with support for daily partitioned `swaps` tables.

---

## 2. NestJS Module Structure

### Directory Layout
```
apps/
  data-collector/
    src/
      grpc/
        raydium-grpc-listener.service.ts
      parser/
        raydium-parser.service.ts
      redis/
        redis-publisher.service.ts
      database/
        swaps-storage.service.ts
      app.module.ts
    main.ts
libs/
  shared-swaps/
    src/
      swaps-query.service.ts
    shared-swaps.module.ts
```

---

## 3. Implementation Details

### 3.1 gRPC Listener Service
**File: `apps/data-collector/src/grpc/raydium-grpc-listener.service.ts`**
```typescript
import { Injectable } from '@nestjs/common';
import { RaydiumParserService } from '../parser/raydium-parser.service';
import { RedisPublisherService } from '../redis/redis-publisher.service';
import { SwapsStorageService } from '../database/swaps-storage.service';

@Injectable()
export class RaydiumGrpcListenerService {
  constructor(
    private readonly parser: RaydiumParserService,
    private readonly redisPublisher: RedisPublisherService,
    private readonly storage: SwapsStorageService,
  ) {}

  async processGrpcStream(stream: any): Promise<void> {
    for await (const transaction of stream) {
      const parsedData = this.parser.parseTransaction(transaction);
      if (parsedData) {
        await this.redisPublisher.publish('raydium_transactions', parsedData);
        await this.storage.storeTransaction(parsedData);
      }
    }
  }
}
```

### 3.2 Parser Service
**File: `apps/data-collector/src/parser/raydium-parser.service.ts`**
```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class RaydiumParserService {
  parseTransaction(transaction: any): any {
    if (transaction.programId === 'RaydiumProgramId') { // Replace with actual program ID
      return {
        id: transaction.id,
        type: 'swap',
        data: transaction.data,
        timestamp: transaction.timestamp,
      };
    }
    return null;
  }
}
```

### 3.3 Redis Publisher Service
**File: `apps/data-collector/src/redis/redis-publisher.service.ts`**
```typescript
import { Injectable } from '@nestjs/common';
import { RedisService } from '@nestjs-modules/ioredis';

@Injectable()
export class RedisPublisherService {
  constructor(private readonly redisService: RedisService) {}

  async publish(channel: string, message: any): Promise<void> {
    const client = this.redisService.getClient();
    await client.publish(channel, JSON.stringify(message));
  }
}
```

### 3.4 PostgreSQL Storage Service
**File: `apps/data-collector/src/database/swaps-storage.service.ts`**
```typescript
import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class SwapsStorageService {
  private readonly pool: Pool;

  constructor() {
    this.pool = new Pool({
      user: 'user',
      host: 'localhost',
      database: 'database',
      password: 'password',
      port: 5432,
    });
  }

  async storeTransaction(transaction: any): Promise<void> {
    const tableName = this.getTableName(new Date(transaction.timestamp));
    const query = `INSERT INTO ${tableName} (id, type, data, timestamp) VALUES ($1, $2, $3, $4)`;
    await this.pool.query(query, [
      transaction.id,
      transaction.type,
      JSON.stringify(transaction.data),
      transaction.timestamp,
    ]);
  }

  private getTableName(date: Date): string {
    const dateString = date.toISOString().split('T')[0].replace(/-/g, '');
    return `swaps_${dateString}`;
  }
}
```

### 3.5 Shared Swaps Query Service
**File: `libs/shared-swaps/src/swaps-query.service.ts`**
```typescript
import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class SwapsQueryService {
  private readonly pool: Pool;

  constructor() {
    this.pool = new Pool({
      user: 'user',
      host: 'localhost',
      database: 'database',
      password: 'password',
      port: 5432,
    });
  }

  async queryHistoricalData(date: string): Promise<any[]> {
    const tableName = `swaps_${date.replace(/-/g, '')}`;
    const query = `SELECT * FROM ${tableName}`;
    const result = await this.pool.query(query);
    return result.rows;
  }
}
```

---

## 4. Redis Integration

1. Install Redis dependencies for NestJS:
   ```bash
   npm install @nestjs-modules/ioredis ioredis
   ```

2. Configure Redis in `app.module.ts`:
   ```typescript
   import { Module } from '@nestjs/common';
   import { RedisModule } from '@nestjs-modules/ioredis';
   import { RaydiumGrpcListenerService } from './grpc/raydium-grpc-listener.service';
   import { RaydiumParserService } from './parser/raydium-parser.service';
   import { RedisPublisherService } from './redis/redis-publisher.service';
   import { SwapsStorageService } from './database/swaps-storage.service';

   @Module({
     imports: [RedisModule.forRoot({ config: { host: 'localhost', port: 6379 } })],
     providers: [
       RaydiumGrpcListenerService,
       RaydiumParserService,
       RedisPublisherService,
       SwapsStorageService,
     ],
   })
   export class AppModule {}
   ```

---

## 5. Final Notes

- Replace placeholders (e.g., `RaydiumProgramId`) with actual identifiers.
- Ensure Redis and PostgreSQL configurations are securely managed via environment variables.
- Test each service independently before integrating them.

