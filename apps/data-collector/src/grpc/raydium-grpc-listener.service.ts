import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@app/config';
import Client, { CommitmentLevel } from '@triton-one/yellowstone-grpc';
import { RaydiumParserService } from '../parser/raydium-parser.service';
import { TransactionFormatter } from '../utils/transaction-formatter';
import { BnLayoutFormatter } from '../utils/bn-layout-formatter';
import { DataCollectorService } from '../data-collector.service';

@Injectable()
export class RaydiumGrpcListenerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger('RaydiumGrpcListenerService');
  private readonly TXN_FORMATTER: TransactionFormatter;
  private currentStream: any = null;
  private isRunning = true;
  constructor(
    private readonly configService: ConfigService,
    private readonly parserService: RaydiumParserService,

    private readonly dataCollectorService: DataCollectorService,
  ) {
    //TODO move to analysis-statistics module
    this.TXN_FORMATTER = new TransactionFormatter();
  }
  onModuleDestroy() {
    this.isRunning = false;
    if (this.currentStream) {
      try {
        this.currentStream.end();
      } catch (error) {
        this.logger.error('Error while closing stream', error);
      }
    }
  }

  async onModuleInit() {
    // Initialize Solana connection
    this.initModule();
  }

  private async initModule() {
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
    while (this.isRunning) {
      try {
        await this.handleStream(client, req);
      } catch (error) {
        this.logger.error('Stream error, restarting in 1 second...', error);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
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

          await this.dataCollectorService.saveSwap({
            signature,
            timestamp: new Date(txn.blockTime),
            signer,
            amm: ammAccount,
            direction: swapEvent.data.direction,
            amountIn,
            amountOut,
          });
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
}
