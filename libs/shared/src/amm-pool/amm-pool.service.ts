import { Injectable, Logger } from '@nestjs/common';
import { HeliusApiManager } from '../rpc/heliusApiManager';
import { ConfigService } from '@nestjs/config';
import { AmmPoolInfoType } from '@app/interfaces/types/amm-pool-info-type';

const SOL_ADDRESS = '11111111111111111111111111111111';
const WSOL_ADDRESS = 'So11111111111111111111111111111111111111112';
const SOL_ADDRESSES = [SOL_ADDRESS, WSOL_ADDRESS];

export interface AmmPoolState {
  price: number;
  reserve: number;
}

@Injectable()
export class AmmPoolService {
  private readonly logger = new Logger(AmmPoolService.name);
  private heliusApiManager: HeliusApiManager;

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.heliusApiManager = new HeliusApiManager(
      this.configService.get('helius.apiKey'),
      this.logger,
    );
  }

  async getTokenBalance(vaultAddress: string): Promise<number> {
    try {
      const result = await this.heliusApiManager.getTokenAccountBalance(
        vaultAddress,
      );
      return result.value.uiAmount;
    } catch (error) {
      this.logger.error(
        `Error getting token balance for ${vaultAddress}:`,
        error,
      );
      throw error;
    }
  }

  async getAmmPoolState(
    ammPoolData: AmmPoolInfoType,
  ): Promise<AmmPoolState | null> {
    const state: AmmPoolState = {
      price: 0,
      reserve: 0,
    };
    const poolAmount = {
      baseAmount: 0,
      quoteAmount: 0,
    };
    try {
      if (SOL_ADDRESSES.includes(ammPoolData.baseMint)) {
        poolAmount.baseAmount = await this.getTokenBalance(
          ammPoolData.baseVault,
        );
        poolAmount.quoteAmount = await this.getTokenBalance(
          ammPoolData.quoteVault,
        );
      } else if (SOL_ADDRESSES.includes(ammPoolData.quoteMint)) {
        poolAmount.baseAmount = await this.getTokenBalance(
          ammPoolData.quoteVault,
        );
        poolAmount.quoteAmount = await this.getTokenBalance(
          ammPoolData.baseVault,
        );
      } else {
        throw new Error('neither baseMint nor quoteMint is SOL or WSOL');
      }
    } catch (error) {
      this.logger.error('Error getting AMM pool amounts:', error);
      return null;
    }

    state.reserve = poolAmount.baseAmount;
    state.price = poolAmount.baseAmount / poolAmount.quoteAmount;

    return state;
  }
}
