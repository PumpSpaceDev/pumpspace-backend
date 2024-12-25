import { Injectable, Logger } from '@nestjs/common';
import { RpcResourceMonitor } from './RpcResourceMonitor';
import { ConfigService } from '@app/config';
import { AccountInfo } from '@solana/web3.js';

export interface HeliusRpcResponse<T> {
  jsonrpc: string;
  id: string | number;
  result: T;
}

export interface TokenAccountBalanceResult {
  context: {
    slot: number;
  };
  value: {
    amount: string;
    decimals: number;
    uiAmount: number;
    uiAmountString: string;
  };
}
export interface AccountInfoResult {
  context: {
    slot: number;
  };
  value: AccountInfo<string[]> | null;
}
export interface FetchOptions {
  retries?: number;
  timeout?: number;
}
@Injectable()
export class HeliusApiManager {
  private requestCounts: Map<string, { count: number; lastAccessed: number }> =
    new Map();
  private static readonly EXPIRATION_TIME = 60 * 1000; // 60 seconds
  private cleanupInterval: NodeJS.Timeout;
  private rpcUrl: string;
  private readonly logger = new Logger(HeliusApiManager.name);
  constructor(private readonly configService: ConfigService) {
    this.cleanupInterval = setInterval(
      () => this.cleanupOldRequests(),
      HeliusApiManager.EXPIRATION_TIME,
    );

    this.rpcUrl = `${this.configService.heliusConfig.baseUrl}${this.configService.heliusConfig.apiKey}`;
    if (
      !this.rpcUrl.startsWith('http://') &&
      !this.rpcUrl.startsWith('https://')
    ) {
      throw new Error('Invalid RPC URL');
    }
  }

  public async fetchHeliusRpc<T>(
    method: string,
    params: any[],
    monitor?: RpcResourceMonitor,
    options: FetchOptions = { retries: 3, timeout: 15000 },
  ): Promise<T> {
    const { retries = 3, timeout = 15000 } = options;
    await RateLimiter.rateLimit(this.logger);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const requestBody = {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    };

    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    };

    const identifier = monitor?.getIdentifier && monitor.getIdentifier();
    if (identifier) {
      const maxExecutions = monitor?.getMaxExecutions
        ? monitor.getMaxExecutions()
        : Infinity;
      const now = Date.now();

      if (!this.requestCounts.has(identifier)) {
        this.requestCounts.set(identifier, { count: 0, lastAccessed: now });
      }

      const record = this.requestCounts.get(identifier)!;
      record.count++;
      record.lastAccessed = now;

      if (record.count > maxExecutions && monitor?.callback) {
        monitor.callback(identifier, record.count);
      }
    }

    try {
      const response = await fetch(this.rpcUrl, requestOptions);
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `RPC request failed: ${response.status} - ${errorText}`,
        );
        throw new Error(`RPC request failed: ${response.status}`);
      }

      const data = (await response.json()) as HeliusRpcResponse<T>;
      if (!data.result) {
        throw new Error('No result returned from RPC');
      }
      return data.result;
    } catch (error) {
      clearTimeout(timeoutId);
      this.logger.error(`RPC call failed: ${method}`);
      this.logger.error(error);
      if (retries > 0) {
        this.logger.warn(
          `Retrying RPC call (${retries} retries left): ${method}`,
        );
        await new Promise((resolve) => setTimeout(resolve, 500));
        return this.fetchHeliusRpc(method, params, monitor, {
          retries: retries - 1,
          timeout,
        });
      } else {
        throw error;
      }
    }
  }

  public async getTokenAccountBalance(
    address: string,
    monitor?: RpcResourceMonitor,
    options?: FetchOptions,
  ): Promise<TokenAccountBalanceResult> {
    return this.fetchHeliusRpc<TokenAccountBalanceResult>(
      'getTokenAccountBalance',
      [address],
      monitor,
      options,
    );
  }

  public async getAccountInfo(
    address: string,
    monitor?: RpcResourceMonitor,
    options?: FetchOptions,
  ): Promise<AccountInfoResult> {
    return this.fetchHeliusRpc<AccountInfoResult>(
      'getAccountInfo',
      [
        address,
        {
          encoding: 'base64',
        },
      ],
      monitor,
      options,
    );
  }

  private cleanupOldRequests(): void {
    const now = Date.now();
    for (const [key, record] of this.requestCounts) {
      if (now - record.lastAccessed > HeliusApiManager.EXPIRATION_TIME) {
        this.requestCounts.delete(key);
      }
    }
  }
}

class RateLimiter {
  private static requestCountPerMinute = 0;
  private static requestCountPerSecond = 0;
  private static taskQueue: (() => void)[] = [];
  private static isProcessing = false;
  private static MAX_QUEUE_LENGTH = 1000;

  public static async rateLimit(
    logger: Logger,
    maxRequestsPerMinute = 1000,
    maxRequestsPerSecond = 10,
  ): Promise<void> {
    if (this.taskQueue.length > this.MAX_QUEUE_LENGTH) {
      throw new Error('Task queue overflow. Rate limiter is overwhelmed.');
    }

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Task timed out in rate limiter.'));
      }, 60000);

      this.taskQueue.push(() => {
        clearTimeout(timeout);
        return this.processRateLimit(
          logger,
          maxRequestsPerMinute,
          maxRequestsPerSecond,
          resolve,
        );
      });

      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  private static lastResetTimePerMinute = performance.now();
  private static lastResetTimePerSecond = performance.now();

  private static async processRateLimit(
    logger: Logger,
    maxRequestsPerMinute: number,
    maxRequestsPerSecond: number,
    resolve: () => void,
  ) {
    const now = performance.now();

    if (now - this.lastResetTimePerMinute >= 60000) {
      this.requestCountPerMinute = 0;
      this.lastResetTimePerMinute = now;
    }

    if (now - this.lastResetTimePerSecond >= 1000) {
      this.requestCountPerSecond = 0;
      this.lastResetTimePerSecond = now;
    }

    if (this.requestCountPerMinute >= maxRequestsPerMinute) {
      const delayTime = 60000 - (now - this.lastResetTimePerMinute);
      logger.warn(
        `Rate limit exceeded (minute). Delaying for ${delayTime.toFixed(0)}ms`,
      );
      await this.delay(delayTime);
    }

    if (this.requestCountPerSecond >= maxRequestsPerSecond) {
      const delayTime = 1000 - (now - this.lastResetTimePerSecond);
      logger.warn(
        `Rate limit exceeded (second). Delaying for ${delayTime.toFixed(0)}ms`,
      );
      await this.delay(delayTime);
    }

    this.requestCountPerMinute++;
    this.requestCountPerSecond++;

    resolve();
  }

  private static queueProcessingPromise: Promise<void> | null = null;

  private static async processQueue() {
    if (this.isProcessing) return this.queueProcessingPromise;

    this.isProcessing = true;
    this.queueProcessingPromise = (async () => {
      while (this.taskQueue.length > 0) {
        const task = this.taskQueue.shift();
        if (task) {
          await task();
        }
      }
      this.isProcessing = false;
      this.queueProcessingPromise = null;
    })();

    return this.queueProcessingPromise;
  }

  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
