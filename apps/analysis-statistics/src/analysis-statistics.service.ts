import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenBucket } from './entities/token-bucket.entity';
import { ConfigService } from '@app/config';
import { RedisPubSubService } from '@app/shared';
import { RedisService } from '@app/shared/redis';
import { SolanaRpcService } from '@app/shared/services/solana-rpc.service';
import { SwapDto } from '@app/interfaces';
import { PublicKey } from '@solana/web3.js';

@Injectable()
export class AnalysisStatisticsService implements OnModuleInit {
  private readonly logger = new Logger(AnalysisStatisticsService.name);
  private readonly bucketWindows = ['5m', '1h', '24h'];

  constructor(
    @InjectRepository(TokenBucket)
    private readonly tokenBucketRepository: Repository<TokenBucket>,
    private readonly configService: ConfigService,
    private readonly redisPubSubService: RedisPubSubService,
    private readonly redisService: RedisService,
    private readonly solanaRpcService: SolanaRpcService,
  ) {}
  onModuleInit() {
    this.redisPubSubService.subscribeRaydiumSwap(this.processTransaction);
  }

  //TODO
  /**
   * step1. get token info from solana rpc
   * step2. analyze token info to real buy and sell
   * step3. update token statistics
   * step4. publish smart money match
   * @param transaction
   * @returns
   */
  private async processTransaction(transaction: SwapDto) {
    try {
      if (
        !transaction?.amm ||
        !transaction?.amountIn ||
        !transaction?.amountOut
      ) {
        this.logger.warn('Invalid transaction data received:', transaction);
        return;
      }

      const ammAccount = transaction.amm;
      let poolInfo = await this.redisService.hgetall(`amm:${ammAccount}`);

      if (!poolInfo || Object.keys(poolInfo).length === 0) {
        const response =
          await this.solanaRpcService.getAmmAccountInfo(ammAccount);
        if (!response) {
          this.logger.error(`AMM Pool ${ammAccount} not found.`);
          return;
        }
        poolInfo = this.parseAmmData(response);
        await this.redisService.hset(
          `amm:${ammAccount}`,
          'data',
          JSON.stringify(poolInfo),
        );
        await this.redisService.expire(`amm:${ammAccount}`, 86400); // Cache for 1 day
      } else {
        poolInfo = JSON.parse(poolInfo.data);
      }

      const isBuy = this.determineBuyOrSell(transaction, poolInfo);
      const parsedEvent = this.createParsedEvent(transaction, poolInfo, isBuy);

      await this.redisService.publish('smart-money:matches', parsedEvent);
      this.logger.log(`Published parsed event: ${JSON.stringify(parsedEvent)}`);

      await this.updateTokenStatistics(
        transaction.amm,
        transaction.amountIn,
        transaction.amountOut,
      );

      if (
        transaction.signer &&
        (await this.isSmartMoneyAddress(transaction.signer))
      ) {
        await this.publishSmartMoneyMatch(parsedEvent);
      }
    } catch (error) {
      this.logger.error(`Error processing transaction: ${error.message}`);
    }
  }

  private parseAmmData(accountInfo: any) {
    try {
      // Basic AMM pool data structure
      return {
        baseToken: accountInfo.owner.toString(),
        quoteToken: new PublicKey(accountInfo.data.slice(0, 32)).toString(),
        baseReserve: BigInt(
          '0x' + accountInfo.data.slice(32, 40).toString('hex'),
        ),
        quoteReserve: BigInt(
          '0x' + accountInfo.data.slice(40, 48).toString('hex'),
        ),
        lastUpdateTime: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error parsing AMM data: ${error.message}`);
      return null;
    }
  }

  private determineBuyOrSell(transaction: SwapDto, poolInfo: any): boolean {
    try {
      // Determine if this is a buy or sell based on token flow
      // true = buy, false = sell
      const tokenInIsBase = transaction.tokenIn === poolInfo.baseToken;
      return !tokenInIsBase; // If tokenIn is base token, it's a sell
    } catch (error) {
      this.logger.error(`Error determining buy/sell: ${error.message}`);
      return false;
    }
  }

  private createParsedEvent(
    transaction: SwapDto,
    poolInfo: any,
    isBuy: boolean,
  ) {
    return {
      type: isBuy ? 'buy' : 'sell',
      timestamp: new Date().toISOString(),
      transaction: {
        hash: transaction.signature,
        signer: transaction.signer,
        amm: transaction.amm,
        amountIn: transaction.amountIn.toString(),
        amountOut: transaction.amountOut.toString(),
        tokenIn: transaction.tokenIn,
        tokenOut: transaction.tokenOut,
      },
      pool: {
        address: transaction.amm,
        baseToken: poolInfo.baseToken,
        quoteToken: poolInfo.quoteToken,
        baseReserve: poolInfo.baseReserve.toString(),
        quoteReserve: poolInfo.quoteReserve.toString(),
      },
    };
  }

  async getTokenStats(query: { tokenId: string; window: string }) {
    try {
      if (!this.bucketWindows.includes(query.window)) {
        throw new Error(`Invalid window: ${query.window}`);
      }

      const bucketKey = `${query.tokenId}:${query.window}`;

      const bucket = await this.tokenBucketRepository.findOne({
        where: { tokenId: query.tokenId, bucketKey },
      });

      if (!bucket) {
        return {
          tokenId: query.tokenId,
          window: query.window,
          volume: 0,
          price: 0,
          transactionCount: 0,
          lastUpdated: new Date(),
        };
      }

      return {
        tokenId: bucket.tokenId,
        window: query.window,
        volume: Number(bucket.bucketVolume),
        price: Number(bucket.bucketPrice),
        transactionCount: Number(bucket.transactionCount),
        lastUpdated: bucket.lastUpdated,
      };
    } catch (error) {
      this.logger.error('Error fetching token statistics:', error);
      throw error;
    }
  }

  private async updateTokenStatistics(
    tokenId: string,
    amountIn: bigint,
    amountOut: bigint,
  ) {
    const now = new Date();
    const volume = Number(amountIn);
    const price = Number(amountOut) / Number(amountIn);

    for (const window of this.bucketWindows) {
      const bucketKey = `${tokenId}:${window}:${this.getBucketTimestamp(now, window)}`;

      try {
        await this.redisService.hset(bucketKey, 'volume', volume.toString());
        await this.redisService.hset(bucketKey, 'price', price.toString());
        await this.redisService.hset(
          bucketKey,
          'lastUpdated',
          now.toISOString(),
        );

        const ttl = this.getWindowTTL(window);
        await this.redisService.expire(bucketKey, ttl);

        await this.persistBucketIfNeeded(
          tokenId,
          bucketKey,
          volume,
          price,
          now,
        );
      } catch (error) {
        this.logger.error(
          `Error updating token statistics for ${tokenId}:`,
          error,
        );
      }
    }
  }

  private async persistBucketIfNeeded(
    tokenId: string,
    bucketKey: string,
    volume: number,
    price: number,
    timestamp: Date,
  ) {
    const bucket = new TokenBucket();
    bucket.tokenId = tokenId;
    bucket.bucketKey = bucketKey;
    bucket.bucketVolume = volume;
    bucket.bucketPrice = price;
    bucket.lastUpdated = timestamp;

    await this.tokenBucketRepository.save(bucket);
  }

  private async isSmartMoneyAddress(address: string): Promise<boolean> {
    const score = await this.redisService.hget(
      `smart-money:${address}`,
      'score',
    );
    return score !== null && Number(score) >= 80;
  }

  private async publishSmartMoneyMatch(transaction: any) {
    await this.redisService.publish('smart-money:matches', {
      address: transaction.signer,
      transaction: transaction,
      timestamp: new Date().toISOString(),
    });
  }

  private getBucketTimestamp(date: Date, window: string): string {
    const timestamp = Math.floor(date.getTime() / 1000);
    switch (window) {
      case '5m':
        return (Math.floor(timestamp / 300) * 300).toString();
      case '1h':
        return (Math.floor(timestamp / 3600) * 3600).toString();
      case '24h':
        return (Math.floor(timestamp / 86400) * 86400).toString();
      default:
        throw new Error(`Invalid window: ${window}`);
    }
  }

  private getWindowTTL(window: string): number {
    switch (window) {
      case '5m':
        return 600;
      case '1h':
        return 7200;
      case '24h':
        return 172800;
      default:
        throw new Error(`Invalid window: ${window}`);
    }
  }
}
