import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  AmmPoolInfoType,
  MarketCapLevel,
  Platform,
  Token,
} from '@app/interfaces';
import { SOL_ADDRESS, WSOL_ADDRESS } from '@app/interfaces/constants';
import { bnLayoutFormatter, HeliusApiManager, SolscanApiManager } from '../rpc';
import { ConfigService } from '@app/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisCacheService } from '../redis';
import { getMint } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { struct, u8, u32, blob } from '@solana/buffer-layout';
import { liquidityStateV4Layout } from '@raydium-io/raydium-sdk-v2';
const METADATA_LAYOUT = struct<Metadata>([
  u8('key'), // Metadata key
  blob(32, 'updateAuthority'), // Update authority
  blob(32, 'mint'), // Mint address
  struct<Data>(
    [
      u32('nameLength'), // Name length
      blob(32, 'name'), // Name
      u32('symbolLength'), // Symbol length
      blob(10, 'symbol'), // Symbol
      u32('uriLength'), // URI length
      blob(200, 'uri'), // URI
    ],
    'data',
  ),
  u8('primarySaleHappened'), // Primary sale happened
  u8('isMutable'), // Is mutable
]);
interface Metadata {
  key: number;
  updateAuthority: Uint8Array;
  mint: Uint8Array;
  data: Data;
  primarySaleHappened: number;
  isMutable: number;
}

interface Data {
  nameLength: number;
  name: Uint8Array;
  symbolLength: number;
  symbol: Uint8Array;
  uriLength: number;
  uri: Uint8Array;
}
const pumpfunProgramId = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const moonshotProgramId = 'MoonCVVNZFSYkqNXP6bxHLPL6QQJiMagDL3qcqUQTrG';

const SOL_ADDRESSES = [SOL_ADDRESS, WSOL_ADDRESS];
const METADATA_PROGRAM_ID = new PublicKey(
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
);
/**
 * Service for token related operations
 * and pool related operations
 *
 * token -> ammid -> pool info
 * token -> token info
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
    private readonly configService: ConfigService,
    private readonly redis: RedisCacheService,
    private readonly apiManager: SolscanApiManager,
    private heliusApiManager: HeliusApiManager,
  ) {
    // Start the periodic task
    this.startPeriodicAmmUpdate();
  }
  async getTokenSafe(address: string): Promise<Token | null> {
    try {
      return await this.getToken(address);
    } catch (error) {
      this.logger.error(`Error getting token for ${address}:`, error);
      return null;
    }
  }
  async getToken(address: string): Promise<Token | null> {
    const cacheData = await this.redis.getTokenOrSet(address, async () => {
      return await this.tokenRepository.findOneBy({ address });
    });
    const cacheToken = cacheData[0];
    if (cacheToken) {
      if (
        cacheToken.launch_platform === Platform.Unknown &&
        Date.now() - cacheToken.updated_at.getTime() < 3 * 24 * 60 * 60 * 1000
      ) {
        // will update platform field
        this.updateTokenMetaPlatform(address).then(async (token) => {
          await this.redis.setToken(token);
        });
      }

      // will update holders and supply
      if (Date.now() - cacheToken.updated_at.getTime() > 15 * 60 * 1000) {
        this.updateTokenMeta(address).then(async (token) => {
          await this.redis.setToken(token);
        });
      }

      return cacheToken;
    }

    // cache not found
    let token = await this.updateTokenMeta(address);
    if (token) {
      this.updateTokenMetaPlatform(address).then(async (token) => {
        await this.redis.setToken(token);
      });
    } else {
      token = await this.fetchTokenMetaBackup(address);
    }
    if (token) {
      this.redis.setToken(token);
    }

    return token;
  }
  private async updateTokenMeta(address: string): Promise<Token | null> {
    const tokenMeta = await this.fetchTokenMeta(address);
    if (!tokenMeta || !tokenMeta.create_tx) {
      this.logger.warn(
        `Token ${address} not found in Solscan, maybe it's not a token`,
      );
      return null;
    }
    const token = tokenMetaToEntity(tokenMeta);
    await this.tokenRepository.upsert(token, ['address']);
    return token;
  }

  private async updateTokenMetaPlatform(
    address: string,
  ): Promise<Token | null> {
    const tokenMeta = await this.fetchTokenMeta(address);
    if (!tokenMeta || !tokenMeta.create_tx) {
      this.logger.warn(
        `Token ${address} not found in Solscan, maybe it's not a token`,
      );
      return null;
    }
    const token = await this.getTokenEntity(tokenMeta);
    // only for update platform field
    await this.tokenRepository.upsert(token, ['address']);
    return token;
  }

  async getTokenPlatform(address: string): Promise<Platform | null> {
    const token = await this.getToken(address);
    if (!token) {
      return null;
    }
    return token.launch_platform;
  }

  // this function maybe throw error: solscan api call failed
  private async getTokenEntity(tokenMeta: TokenMeta): Promise<Token | null> {
    let transactionDetails = null;
    try {
      // Extract create_tx from metadata
      transactionDetails = await this.apiManager.fetchSolscanApi<any>(
        '/transaction/detail',
        { tx: tokenMeta.create_tx },
        undefined,
        { retries: 5, timeout: 20000 },
      );
    } catch (error) {
      this.logger.error(
        `Error getting transaction details for ${tokenMeta.create_tx}:`,
        error,
      );
      return null;
    }

    const result = transactionDetails.parsed_instructions.filter(
      (item) =>
        (item.program_id === pumpfunProgramId &&
          item.parsed_type == 'create') ||
        (item.parsed_type === 'tokenMint' &&
          item.program_id === moonshotProgramId),
    );
    const token = tokenMetaToEntity(tokenMeta);
    token.launch_platform = Platform.Other;
    if (result.length > 0) {
      const program_id = result[0].program_id;
      if (program_id === pumpfunProgramId) {
        token.launch_platform = Platform.PumpFun;
      } else if (program_id === moonshotProgramId) {
        token.launch_platform = Platform.Moonshot;
      } else {
        // absolute can't reach here
      }
      const result2 = result[0].inner_instructions.filter(
        (item) =>
          item.program_id === 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s' &&
          item.type == 'createMetadataAccountV3',
      );
      token.uri = result2[0].idl_data.input_args.dataV2.data.uri;
    }
    return token;
  }

  async fetchAmmPoolData(
    tokenAddress: string,
  ): Promise<AmmPoolInfoType | null> {
    const token = await this.getToken(tokenAddress);
    if (!token) {
      return null;
    }
    let amm = token.amm;
    if (!amm) {
      const ammExtensions = await this.redis.getAmmExtensions(tokenAddress);
      amm = this.getTopAmmExtension(ammExtensions);
      if (!amm) {
        return null;
      }
    }
    return await this.redis.getPoolInfoOrSet(amm, this.fetchAmmPoolInfo);
  }
  private getTopAmmExtension(
    ammExtensions: Map<string, number>,
  ): string | null {
    if (ammExtensions.size === 0) {
      return null;
    }
    return [...ammExtensions.entries()].reduce((a, b) =>
      b[1] > a[1] ? b : a,
    )[0];
  }
  // only set cache
  async setAmmForToken(tokenAddress: string, ammId: string): Promise<void> {
    await this.redis.incrementAmmExtension(tokenAddress, ammId);
  }

  async saveAmmForToken(tokenAddress: string): Promise<void> {
    const token = await this.tokenRepository.findOneBy({
      address: tokenAddress,
    });
    if (!token) {
      return;
    }
    const ammExtensions = await this.redis.getAmmExtensions(tokenAddress);
    const topAmmExtension = this.getTopAmmExtension(ammExtensions);

    if (!topAmmExtension) {
      return;
    }

    if (!token.amm) {
      token.amm = topAmmExtension;
      token.amm_transaction_count = ammExtensions.get(topAmmExtension) ?? 0;
      ammExtensions.delete(topAmmExtension);
      await this.tokenRepository.save(token);
    } else {
      const ammNewValue =
        token.amm_transaction_count + (ammExtensions.get(token.amm) ?? 0);
      if (
        token.amm !== topAmmExtension &&
        ammExtensions.get(topAmmExtension) > ammNewValue
      ) {
        token.amm = topAmmExtension;
        token.amm_transaction_count = ammExtensions.get(topAmmExtension);
        await this.tokenRepository.save(token);
        ammExtensions.delete(topAmmExtension);
      } else if (ammNewValue > token.amm_transaction_count) {
        token.amm_transaction_count = ammNewValue;
        await this.tokenRepository.save(token);
        ammExtensions.delete(token.amm);
      }
    }

    await this.redis.setAmmExtensions(tokenAddress, ammExtensions);
  }

  async fetchAmmPoolInfo(amm: string): Promise<AmmPoolInfoType | null> {
    const ammAccountInfo = await this.heliusApiManager
      .getConnection()
      .getAccountInfo(new PublicKey(amm));
    if (!ammAccountInfo) {
      return null;
    }

    const ammData = liquidityStateV4Layout.decode(ammAccountInfo?.data);
    bnLayoutFormatter(ammData);
    return {
      baseMint: ammData.baseMint.toString(),
      quoteMint: ammData.quoteMint.toString(),
      baseVault: ammData.baseVault.toString(),
      quoteVault: ammData.quoteVault.toString(),
      baseReserve: 0,
      quoteReserve: 0,
    };
  }
  private async fetchTokenMeta(address: string): Promise<TokenMeta | null> {
    try {
      const tokenMeta = await this.apiManager.fetchSolscanApi<TokenMeta>(
        '/token/meta',
        { address },
      );
      return tokenMeta;
    } catch (error) {
      this.logger.error(`Error getting token meta for ${address}:`, error);
      return null;
    }
  }

  private async fetchTokenMetaBackup(address: string): Promise<Token | null> {
    const tokenAddressPubkey = new PublicKey(address);
    const mint = await getMint(
      this.heliusApiManager.getConnection(),
      tokenAddressPubkey,
    );

    const metadataPubkey = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        Buffer.from(METADATA_PROGRAM_ID.toBuffer()),
        tokenAddressPubkey.toBuffer(),
      ],
      METADATA_PROGRAM_ID,
    );
    const metadataAccountInfo = await this.heliusApiManager
      .getConnection()
      .getAccountInfo(metadataPubkey[0]);

    const metadata = METADATA_LAYOUT.decode(metadataAccountInfo?.data);

    const token = {
      address: address,
      name: cleanBuffer(metadata.data.name),
      symbol: cleanBuffer(metadata.data.symbol),
      uri: cleanBuffer(metadata.data.uri),
      launch_platform: Platform.Unknown,
      icon: '',
      decimals: mint.decimals,
      holder: 0,
      supply: mint.supply.toString(),
    };

    await this.tokenRepository.upsert(token, ['address']);
    return await this.tokenRepository.findOneBy({ address });
  }

  private async getTokenBalance(vaultAddress: string): Promise<number> {
    try {
      const result =
        await this.heliusApiManager.getTokenAccountBalance(vaultAddress);
      return result.value.uiAmount;
    } catch (error) {
      this.logger.error(
        `Error getting token balance for ${vaultAddress}:`,
        error,
      );
      throw error;
    }
  }
  // this function maybe throw error: helius api call failed
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
      if (SOL_ADDRESSES.includes(ammPoolData.baseVault)) {
        poolAmount.baseAmount = await this.getTokenBalance(
          ammPoolData.baseVault,
        );
        poolAmount.quoteAmount = await this.getTokenBalance(
          ammPoolData.quoteVault,
        );
      } else if (SOL_ADDRESSES.includes(ammPoolData.quoteVault)) {
        poolAmount.baseAmount = await this.getTokenBalance(
          ammPoolData.quoteVault,
        );
        poolAmount.quoteAmount = await this.getTokenBalance(
          ammPoolData.baseVault,
        );
      } else {
        throw new Error('niether baseVault nor quoteVault is SOL or WSOL');
      }
    } catch (error) {
      this.logger.error('Error getting AMM pool amounts:', error);
      return null;
    }

    state.reserve = poolAmount.baseAmount;
    state.price = poolAmount.baseAmount / poolAmount.quoteAmount;

    return state;
  }

  public determineCategory(marketCap: number): MarketCapLevel {
    if (marketCap < 2_000_000) {
      return MarketCapLevel.LOW_CAP;
    } else if (marketCap < 10_000_000) {
      return MarketCapLevel.MEDIUM_CAP;
    } else {
      return MarketCapLevel.HIGH_CAP;
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  private async startPeriodicAmmUpdate() {
    this.logger.log('Starting periodic AMM update', 'TokenService');
    try {
      await this.redis.forEachTokenKey(async (addresses: string[]) => {
        for (const address of addresses) {
          try {
            await this.saveAmmForToken(address);
          } catch (error) {
            this.logger.error(
              `Failed to save AMM for token ${address}`,
              error.message,
              'TokenService',
            );
          }
        }
      });
    } catch (error) {
      this.logger.error(
        'Failed to execute periodic AMM update',
        error.message,
        'TokenService',
      );
    }
  }
}

function tokenMetaToEntity(tokenMeta: TokenMeta): Token {
  const token = new Token();
  token.address = tokenMeta.address;
  token.name = tokenMeta.name;
  token.symbol = tokenMeta.symbol;
  token.icon = tokenMeta.icon;
  token.decimals = tokenMeta.decimals;
  token.holder = tokenMeta.holder;
  token.creator = tokenMeta.creator;
  token.create_tx = tokenMeta.create_tx;
  token.created_time = new Date((tokenMeta.created_time || 0) * 1000);
  token.first_mint_tx = tokenMeta.first_mint_tx;
  token.first_mint_time = new Date((tokenMeta.first_mint_time || 0) * 1000);
  token.supply = tokenMeta.supply;
  token.price = tokenMeta.price;
  token.market_cap = tokenMeta.market_cap;

  return token;
}

function cleanBuffer(inputBuffer): string {
  const endIndex = inputBuffer.findLastIndex((byte) => byte !== 0);
  return inputBuffer
    .slice(0, endIndex + 1)
    .toString('utf-8')
    .trim();
}

interface TokenMeta {
  address: string; // Solana address of the token
  name: string; // Name of the token
  symbol: string; // Symbol of the token
  icon: string | null; // URL for the token's icon
  decimals: number; // Number of decimals the token supports
  holder: number; // Number of token holders
  creator: string; // Creator's address
  create_tx: string; // Transaction ID for the token creation
  created_time: number; // UNIX timestamp of token creation
  first_mint_tx: string; // Transaction ID for the first mint
  first_mint_time: number; // UNIX timestamp of the first mint
  supply: string; // Total supply of the token (as a string to support large numbers)
  price: number; // Current price of the token
  market_cap: number; // Market capitalization of the token
}

export interface AmmPoolState {
  price: number;
  reserve: number;
}
