
# Shared Redis Module

## Overview
The shared Redis module centralizes all Redis operations, ensuring consistency and reusability.

---

## Code Implementation

```typescript
import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class SharedRedisService {
  private redisClient: Redis;

  constructor() {
    this.redisClient = new Redis();
  }

  async get(key: string): Promise<any> {
    const value = await this.redisClient.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: object, ttl?: number): Promise<void> {
    const stringValue = JSON.stringify(value);
    if (ttl) {
      await this.redisClient.set(key, stringValue, 'EX', ttl);
    } else {
      await this.redisClient.set(key, stringValue);
    }
  }

  async subscribe(channel: string, callback: Function): Promise<void> {
    this.redisClient.subscribe(channel, (err, count) => {
      if (err) throw new Error(`Failed to subscribe to ${channel}: ${err.message}`);
      console.log(`Subscribed to ${count} channels.`);
    });

    this.redisClient.on('message', (subscribedChannel, message) => {
      if (subscribedChannel === channel) {
        callback(JSON.parse(message));
      }
    });
  }

  async publish(channel: string, message: object): Promise<void> {
    await this.redisClient.publish(channel, JSON.stringify(message));
  }
}
```

---

## Integration
1. Import `SharedRedisService` into `analysis-statistics` module.
2. Use the service for all Redis-related operations.

