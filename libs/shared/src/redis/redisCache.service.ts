import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@app/config';
import { AmmPoolInfoType, Token } from '@app/interfaces';
import { RedisService } from './redis.service';
import { customDeserialize, customSerialize } from '../utils';

const POOL_INFO_KEY = 'amm-pool-info';
const POOL_INFO_TTL = 24 * 60 * 60; // 24 hours
const TOKEN_TTL = 24 * 60 * 60; //  24 hours for token cache, update holders data every 15 min
const TOKEN_KEY_PREFIX = 'token_V2';
const TOKEN_FIELD = 'token';
const AMM_EXTENSIONS_FIELD = 'ammExtensions';

@Injectable()
export class RedisCacheService {
  private readonly logger: Logger = new Logger(RedisCacheService.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  private constructKey(prefix: string, address: string): string {
    return `${prefix}:${address}`;
  }

  async getOrSet<T>(
    key: string,
    ttl: number,
    fetchFunction: () => Promise<T>,
    context: string = 'cache',
  ): Promise<T | null> {
    try {
      const cachedData = await this.redisService.get(key);
      if (!cachedData) {
        const newData = await fetchFunction();
        if (!newData) {
          return null;
        }
        await this.redisService.set(key, customSerialize(newData), ttl);
        return newData;
      }

      await this.redisService.expire(key, ttl);
      return customDeserialize(cachedData);
    } catch (e) {
      this.logger.error(
        `All retry attempts failed for ${context}: ${e.message}`,
      );
      return null;
    }
  }

  async getPoolInfoOrSet(
    amm: string,
    fetchFunction?: (amm: string) => Promise<AmmPoolInfoType>,
  ): Promise<AmmPoolInfoType | null> {
    if (!fetchFunction) {
      return null;
    }

    const key = `${POOL_INFO_KEY}_${amm}`;
    return this.getOrSet(
      key,
      POOL_INFO_TTL,
      () => fetchFunction(amm),
      `pool info for ${amm}`,
    );
  }

  async getToken(address: string): Promise<Token | null> {
    const key = this.constructKey(TOKEN_KEY_PREFIX, address);
    const tokenData = await this.redisService.hget(key, TOKEN_FIELD);
    if (!tokenData) {
      return null;
    }
    await this.redisService.expire(key, TOKEN_TTL);
    return customDeserialize(tokenData);
  }

  async getTokenOrSet(
    address: string,
    fetchFunction: () => Promise<Token>,
  ): Promise<Token | null> {
    const key = this.constructKey(TOKEN_KEY_PREFIX, address);
    const tokenData = await this.redisService.hget(key, TOKEN_FIELD);
    if (!tokenData) {
      const newToken = await fetchFunction();
      if (!newToken) {
        return null;
      }
      await this.redisService.hset(key, TOKEN_FIELD, customSerialize(newToken));
      await this.redisService.expire(key, TOKEN_TTL);
      return newToken;
    }
    await this.redisService.expire(key, TOKEN_TTL);
    return customDeserialize(tokenData);
  }

  async setToken(token: Token): Promise<void> {
    const key = this.constructKey(TOKEN_KEY_PREFIX, token.address);
    await this.redisService.hset(key, TOKEN_FIELD, customSerialize(token));
    await this.redisService.expire(key, TOKEN_TTL);
  }

  async getAmmExtensions(address: string): Promise<Map<string, number>> {
    const key = this.constructKey(TOKEN_KEY_PREFIX, address);
    const extensionsData = await this.redisService.hget(
      key,
      AMM_EXTENSIONS_FIELD,
    );
    if (!extensionsData) {
      return new Map<string, number>();
    }
    await this.redisService.expire(key, TOKEN_TTL);
    return customDeserialize(extensionsData);
  }

  async setAmmExtensions(
    address: string,
    ammExtensions: Map<string, number>,
  ): Promise<void> {
    if (!(ammExtensions instanceof Map) || ammExtensions.size === 0) {
      return;
    }
    const key = this.constructKey(TOKEN_KEY_PREFIX, address);
    await this.redisService.hset(
      key,
      AMM_EXTENSIONS_FIELD,
      customSerialize(ammExtensions),
    );
    await this.redisService.expire(key, TOKEN_TTL);
  }

  async incrementAmmExtension(address: string, amm: string): Promise<void> {
    const key = this.constructKey(TOKEN_KEY_PREFIX, address);
    const extensionsData = await this.redisService.hget(
      key,
      AMM_EXTENSIONS_FIELD,
    );
    let ammExtensions: Map<string, number>;
    if (!extensionsData) {
      ammExtensions = new Map<string, number>();
    } else {
      ammExtensions = customDeserialize(extensionsData);
    }
    const count = ammExtensions.get(amm) || 0;
    ammExtensions.set(amm, count + 1);
    await this.setAmmExtensions(address, ammExtensions);
  }

  async forEachTokenKey(
    callback: (tokenAddresses: string[]) => Promise<void>,
  ): Promise<void> {
    const pattern = `${TOKEN_KEY_PREFIX}:*`;
    await this.redisService.forEachMatchingKey(
      pattern,
      async (keys: string[]) => {
        const tokenAddresses = keys.map((key) => key.split(':')[1]);
        await callback(tokenAddresses);
      },
    );
  }
}
