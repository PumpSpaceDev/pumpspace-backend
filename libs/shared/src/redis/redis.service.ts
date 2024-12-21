import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@app/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private publisher: Redis;
  private subscriber: Redis;

  constructor(private configService: ConfigService) {
    const options = this.configService.redisConfig;
    this.publisher = new Redis(options);
    this.subscriber = new Redis(options);
  }

  async onModuleInit() {
    await this.publisher.ping();
    await this.subscriber.ping();
  }

  async onModuleDestroy() {
    await this.publisher.quit();
    await this.subscriber.quit();
  }

  getPublisher(): Redis {
    return this.publisher;
  }

  getSubscriber(): Redis {
    return this.subscriber;
  }

  async publish(channel: string, message: any) {
    return this.publisher.publish(channel, JSON.stringify(message));
  }

  async subscribe(
    channel: string,
    callback: (channel: string, message: string) => void,
  ) {
    await this.subscriber.subscribe(channel);
    this.subscriber.on('message', callback);
  }

  async hset(key: string, field: string, value: string | number) {
    return this.publisher.hset(key, field, value.toString());
  }

  async hincrby(key: string, field: string, increment: number) {
    return this.publisher.hincrby(key, field, increment);
  }

  async hget(key: string, field: string) {
    return this.publisher.hget(key, field);
  }

  async hgetall(key: string) {
    return this.publisher.hgetall(key);
  }

  async expire(key: string, seconds: number) {
    return this.publisher.expire(key, seconds);
  }
}
