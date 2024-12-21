import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@app/config';
import { LoggerService, RedisService } from '@app/shared';
import { Connection } from '@solana/web3.js';
import Client, { CommitmentLevel } from '@triton-one/yellowstone-grpc';
import { PublicKey } from '@solana/web3.js';
import { LIQUIDITY_STATE_LAYOUT_V4 } from '@raydium-io/raydium-sdk';
import { RaydiumParserService } from '../parser/raydium-parser.service';
import { RedisPublisherService } from '../redis/redis-publisher.service';
import { SwapsStorageService } from '../database/swaps-storage.service';
import { TransactionFormatter } from '../utils/transaction-formatter';
import { BnLayoutFormatter } from '../utils/bn-layout-formatter';

@Injectable()
export class RaydiumGrpcListenerService implements OnModuleInit {
  private readonly WSOL_MINT = 'So11111111111111111111111111111111111111112';
  private readonly WSOL_DECIMALS = 9;
  private readonly RAYDIUM_AUTHORITY_V4 =
    '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1';
  private readonly TXN_FORMATTER: TransactionFormatter;
  private currentStream: any = null;
  private connection: Connection;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly parserService: RaydiumParserService,
    private readonly redisService: RedisService,
    private readonly redisPublisher: RedisPublisherService,
    private readonly swapsStorage: SwapsStorageService,
  ) {
    this.TXN_FORMATTER = new TransactionFormatter();
  }

  private decodeRaydiumTxn(tx: any) {
    if (tx.meta?.err) return;

    const parsedIxs =
      this.parserService.parseTransactionWithInnerInstructions(tx);
    const programIxs = parsedIxs.filter((ix) =>
      ix.programId.equals(this.parserService.PROGRAM_ID),
    );

    if (programIxs.length === 0) return;
    const LogsEvent = this.parserService.parseLogMessages(
      parsedIxs,
      tx.meta.logMessages,
    );
    const result = { instructions: parsedIxs, events: LogsEvent };
    BnLayoutFormatter.format(result);
    return result;
  }

  private async handleStream(client: Client, args: any) {
    // Subscribe for events
    const stream = await client.subscribe();
    this.currentStream = stream;

    // Create `error` / `end` handler
    const streamClosed = new Promise<void>((resolve, reject) => {
      stream.on('error', (error) => {
        this.logger.error('Stream error', error.message);
        reject(error);
        stream.end();
      });
      stream.on('end', () => {
        this.logger.log('Stream ended');
        resolve();
      });
      stream.on('close', () => {
        this.logger.log('Stream closed');
        resolve();
      });
    });

    // Handle updates
    stream.on('data', async (data) => {
      if (data?.transaction) {
        const txn = this.TXN_FORMATTER.formTransactionFromJson(
          data.transaction,
          Date.now(),
        );

        const signature: string = txn.transaction.signatures[0];
        this.logger.debug('Processing signature: ' + signature);
        const parsedTxn = this.decodeRaydiumTxn(txn);

        if (!parsedTxn) return;
        const swapEvents = parsedTxn.events.filter(
          (event) =>
            event.name === 'swapBaseIn' || event.name === 'swapBaseOut',
        );
        if (!swapEvents) return;

        for (const swapEvent of swapEvents) {
          const parsedIx = parsedTxn.instructions.find(
            (ix) => ix.name === 'swapBaseIn' || ix.name === 'swapBaseOut',
          );

          const signer = parsedIx.accounts
            .find((acc) => acc.name === 'userSourceOwner')
            .pubkey.toString();
          const ammAccount = parsedIx.accounts
            .find((acc) => acc.name === 'amm')
            .pubkey.toString();

          const amountIn =
            swapEvent.name === 'swapBaseIn'
              ? swapEvent.data.amountIn
              : swapEvent.data.directIn;
          const amountOut =
            swapEvent.name === 'swapBaseIn'
              ? swapEvent.data.outAmount
              : swapEvent.data.amountOut;

          // Store swap in database
          await this.swapsStorage.storeSwap({
            signature,
            timestamp: new Date(txn.blockTime * 1000),
            signer,
            amm: ammAccount,
            direction: swapEvent.data.direction,
            amountIn,
            amountOut,
          });

          // Get token info from rpc
          let poolInfo = JSON.parse(
            await this.redisService.hget('amm:', ammAccount),
          );
          if (!poolInfo) {
            const response = await this.connection.getAccountInfo(
              new PublicKey(ammAccount),
            );
            if (!response || !response.data) {
              this.logger.error(`Token ${ammAccount} has no amm pool`);
              return;
            }
            const ammData = LIQUIDITY_STATE_LAYOUT_V4.decode(response.data);
            BnLayoutFormatter.format(ammData);
            poolInfo = {
              baseVault: ammData.baseVault.toString(),
              quoteVault: ammData.quoteVault.toString(),
              baseMint: ammData.baseMint.toString(),
              quoteMint: ammData.quoteMint.toString(),
            };
            await this.redisService.hset(
              'amm:',
              ammAccount,
              JSON.stringify(ammData),
            );
          }

          const memeTokenMint =
            poolInfo.baseMint === this.WSOL_MINT
              ? poolInfo.quoteMint
              : poolInfo.baseMint;

          let isBuy = false;
          if (poolInfo.baseMint === this.WSOL_MINT) {
            isBuy = swapEvent.data.direction === 2;
          } else if (poolInfo.quoteMint === this.WSOL_MINT) {
            isBuy = swapEvent.data.direction === 1;
          }

          const memeTokenDesimals = txn.meta.postTokenBalances.find(
            (balance) => balance.mint === memeTokenMint,
          ).uiTokenAmount.decimals;
          const baseVaultPostBalance = txn.meta.postTokenBalances.find(
            (balance) =>
              balance.mint === poolInfo.baseMint &&
              balance.owner === this.RAYDIUM_AUTHORITY_V4,
          ).uiTokenAmount.amount;
          const quoteVaultPostBalance = txn.meta.postTokenBalances.find(
            (balance) =>
              balance.mint === poolInfo.quoteMint &&
              balance.owner === this.RAYDIUM_AUTHORITY_V4,
          ).uiTokenAmount.amount;

          this.logger.log(
            '================ New Raydium Trade ==================',
          );

          const parsedEvent = {
            signature,
            timestamp: txn.blockTime,
            amm: ammAccount,
            user: signer,
            isBuy,
            tokenIn: isBuy ? this.WSOL_MINT : memeTokenMint,
            tokenOut: isBuy ? memeTokenMint : this.WSOL_MINT,
            tokenInDecimals: isBuy ? this.WSOL_DECIMALS : memeTokenDesimals,
            tokenOutDecimals: isBuy ? memeTokenDesimals : this.WSOL_DECIMALS,
            tokenInAmount: amountIn,
            tokenOutAmount: amountOut,
            baseVaultPostBalance: BigInt(baseVaultPostBalance || 0),
            quoteVaultPostBalance: BigInt(quoteVaultPostBalance || 0),
          };

          this.logger.debug('Parsed event: ' + JSON.stringify(parsedEvent));
          await this.redisPublisher.publish('raydium:swaps', parsedEvent);
        }
      }
    });

    // Send subscribe request
    await new Promise<void>((resolve, reject) => {
      stream.write(args, (err: any) => {
        if (err === null || err === undefined) {
          resolve();
        } else {
          reject(err);
        }
      });
    }).catch((reason) => {
      this.logger.error('Failed to send subscribe request', reason);
      throw reason;
    });

    await streamClosed;
  }

  async onModuleInit() {
    // Initialize Solana connection
    this.connection = new Connection(this.configService.solanaConfig.rpcUrl);

    const client = new Client(
      this.configService.grpcConfig.endpoint,
      this.configService.grpcConfig.token,
    );

    const req = {
      accounts: {},
      slots: {},
      transactions: {
        raydiumLiquidityPoolV4: {
          vote: false,
          failed: false,
          signature: undefined,
          accountInclude: [],
          accountExclude: [],
          accountRequired: [this.parserService.PROGRAM_ID.toBase58()],
        },
      },
      transactionsStatus: {},
      entry: {},
      blocks: {},
      blocksMeta: {},
      accountsDataSlice: [],
      ping: undefined,
      commitment: CommitmentLevel.PROCESSED,
    };

    while (true) {
      try {
        await this.handleStream(client, req);
      } catch (error) {
        this.logger.error('Stream error, restarting in 1 second...', error);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }
}
