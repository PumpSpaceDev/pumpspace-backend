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

  async subscribe(channel: string, callback: (message: Record<string, any>) => void): Promise<void> {
    this.redisClient.subscribe(channel, (err, count) => {
      if (err)
        throw new Error(`Failed to subscribe to ${channel}: ${err.message}`);
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
