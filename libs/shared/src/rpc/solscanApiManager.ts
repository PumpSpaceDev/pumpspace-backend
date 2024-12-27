import { Injectable, Logger } from '@nestjs/common';
import { RpcResourceMonitor } from './RpcResourceMonitor';
import { ConfigService } from '@app/config';
import { FetchOptions } from './types';

@Injectable()
export class SolscanApiManager {
  private readonly solscanApiBaseUrl = 'https://pro-api.solscan.io/v2.0';
  private requestCounts: Map<string, { count: number; lastAccessed: number }> =
    new Map();
  private static readonly EXPIRATION_TIME = 60 * 1000; // 60 seconds
  private cleanupInterval: NodeJS.Timeout;
  private logger: Logger = new Logger(SolscanApiManager.name);
  private apikey: string;
  constructor(private readonly configService: ConfigService) {
    this.cleanupInterval = setInterval(
      () => this.cleanupOldRequests(),
      SolscanApiManager.EXPIRATION_TIME,
    );
    this.apikey = this.configService.solscanConfig.apiKey;
  }

  public async fetchSolscanApi<T>(
    endpoint: string,
    params: Record<string, any> = {},
    monitor?: RpcResourceMonitor,
    options: FetchOptions = { retries: 3, timeout: 15000 },
  ): Promise<T> {
    const { retries = 3, timeout = 15000 } = options;
    await RateLimiter.rateLimit(this.logger);
    endpoint = endpoint.replace(/^\//, '');
    const urlParams = new URLSearchParams(params);
    const url = `${this.solscanApiBaseUrl}/${endpoint}?${urlParams.toString()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const requestOptions = {
      method: 'GET',
      headers: { token: this.apikey },
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
      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);
      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `API request failed: ${response.status} - ${errorText}`,
        );
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = (await response.json()).data as T;
      if (!data) {
        throw new Error('No data returned from API');
      }
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      this.logger.error(`API call failed: ${url}`);
      this.logger.error(error);
      if (retries > 0) {
        this.logger.warn(`Retrying API call (${retries} retries left): ${url}`);
        // add some delay before retrying
        await new Promise((resolve) => setTimeout(resolve, 500));
        return this.fetchSolscanApi(endpoint, params, monitor, {
          retries: retries - 1,
          timeout,
        });
      } else {
        throw error;
      }
    }
  }

  private cleanupOldRequests(): void {
    const now = Date.now();
    const EXPIRATION_TIME = 60 * 1000; // 60 seconds

    for (const [key, record] of this.requestCounts) {
      if (now - record.lastAccessed > EXPIRATION_TIME) {
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
