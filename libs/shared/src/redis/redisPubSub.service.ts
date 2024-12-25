import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@app/config';
import { RaydiumSwapEvent, SwapDto } from '@app/interfaces';
import { RedisService } from './redis.service';

const RAYDIUM_SWAPS_CHANNEL = 'raydium:swaps';
const SMART_MONEY_MATCHES_CHANNEL = 'smart-money:matches';

@Injectable()
export class RedisPubSubService {
  private readonly logger: Logger = new Logger(RedisPubSubService.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async publishRaydiumSwap(swap: SwapDto): Promise<void> {
    await this.redisService.publish(
      RAYDIUM_SWAPS_CHANNEL,
      JSON.stringify(swap),
    );
  }
  async subscribeRaydiumSwap(callback: (swap: SwapDto) => void): Promise<void> {
    await this.redisService.subscribe(
      RAYDIUM_SWAPS_CHANNEL,
      (channel, message) => {
        if (channel !== RAYDIUM_SWAPS_CHANNEL) {
          return;
        }
        const swap = JSON.parse(message);
        callback(swap);
      },
    );
  }

  async publishSmartMoneyMatches(event: RaydiumSwapEvent): Promise<void> {
    await this.redisService.publish(
      SMART_MONEY_MATCHES_CHANNEL,
      JSON.stringify(event),
    );
  }

  async subscribeSmartMoneyMatches(
    callback: (event: RaydiumSwapEvent) => void,
  ): Promise<void> {
    await this.redisService.subscribe(
      SMART_MONEY_MATCHES_CHANNEL,
      (channel, message) => {
        if (channel !== SMART_MONEY_MATCHES_CHANNEL) {
          return;
        }
        const event = JSON.parse(message);
        callback(event);
      },
    );
  }
}
