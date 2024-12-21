import { Inject, Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@app/config';
import { SharedService } from '@app/shared';
import { SwapEntity } from './entities/swap.entity';

interface Transaction {
  signature: string;
  signer: string;
  accounts: string[];
  tokenInMint: string;
  tokenOutMint: string;
  amountIn: bigint;
  amountOut: bigint;
}

interface ShyftService {
  getTransactions(request: any): any;
}

@Injectable()
export class DataCollectorService implements OnModuleInit {
  private readonly logger = new Logger(DataCollectorService.name);
  private shyftService: ShyftService;
  private readonly raydiumPoolAddresses: string[];

  constructor(
    @InjectRepository(SwapEntity)
    private readonly swapRepository: Repository<SwapEntity>,
    @Inject('SHYFT_PACKAGE')
    private readonly shyftClient: ClientGrpc,
    private readonly configService: ConfigService,
    private readonly sharedService: SharedService,
  ) {
    this.raydiumPoolAddresses = this.configService.raydiumConfig.poolAddresses;
  }

  async onModuleInit() {
    this.shyftService =
      this.shyftClient.getService<ShyftService>('TransactionService');
    await this.startTransactionStream();
  }

  private async startTransactionStream() {
    try {
      const stream = this.shyftService.getTransactions({});
      stream.subscribe({
        next: (transaction: Transaction) => this.processTransaction(transaction),
        error: (error) => this.logger.error('Stream error:', error),
      });
    } catch (error) {
      this.logger.error('Failed to start transaction stream:', error);
    }
  }

  private async processTransaction(transaction: Transaction) {
    try {
      if (!this.isRaydiumTransaction(transaction)) {
        return;
      }

      const swap = await this.swapRepository.save({
        signature: transaction.signature,
        signer: transaction.signer,
        amm: transaction.accounts.find((acc) => this.isRaydiumPool(acc)) || '',
        direction: this.determineSwapDirection(transaction),
        amountIn: transaction.amountIn.toString(),
        amountOut: transaction.amountOut.toString(),
      });

      await this.publishSwap(swap);
    } catch (error) {
      this.logger.error('Failed to process transaction:', error);
    }
  }

  private isRaydiumTransaction(transaction: Transaction): boolean {
    return transaction.accounts.some((acc) => this.isRaydiumPool(acc));
  }

  private isRaydiumPool(address: string): boolean {
    return this.raydiumPoolAddresses.includes(address);
  }

  private determineSwapDirection(transaction: Transaction): number {
    const tokenInMint = transaction.tokenInMint;
    const tokenOutMint = transaction.tokenOutMint;
    return tokenInMint < tokenOutMint ? 1 : 2;
  }

  private async publishSwap(swap: SwapEntity) {
    try {
      await this.sharedService.publishToRedis(
        'raydium-transactions',
        JSON.stringify(swap),
      );
    } catch (error) {
      this.logger.error('Failed to publish swap:', error);
    }
  }
}
