import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../../../config/src';
import { Connection, PublicKey } from '@solana/web3.js';

@Injectable()
export class SolanaRpcService {
  private readonly logger = new Logger(SolanaRpcService.name);
  private connection: Connection;

  constructor(private readonly configService: ConfigService) {
    this.connection = new Connection(this.configService.solanaConfig.rpcUrl);
  }

  async getAmmAccountInfo(ammAddress: string) {
    try {
      const publicKey = new PublicKey(ammAddress);
      const accountInfo = await this.connection.getAccountInfo(publicKey);

      if (!accountInfo) {
        this.logger.warn(`AMM account not found: ${ammAddress}`);
        return null;
      }

      return accountInfo;
    } catch (error) {
      this.logger.error(`Error fetching AMM account info: ${error.message}`);
      return null;
    }
  }
}
