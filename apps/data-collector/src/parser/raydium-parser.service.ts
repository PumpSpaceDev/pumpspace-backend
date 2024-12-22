import { Injectable, LoggerService } from '@nestjs/common';
import { PublicKey } from '@solana/web3.js';
import { SolanaParser } from '@shyft-to/solana-transaction-parser';
import { ParsedInstruction, RaydiumAmmParser } from './raydium/parser';
import { LogsParser } from './raydium/log-parser';
import { BnLayoutFormatter } from '../utils/bn-layout-formatter';

@Injectable()
export class RaydiumParserService {
  private readonly raydiumAmmParser: RaydiumAmmParser;
  private readonly logsParser: LogsParser;
  private readonly ixParser: SolanaParser;
  public readonly PROGRAM_ID: PublicKey;

  constructor(private readonly logger: LoggerService) {
    this.raydiumAmmParser = new RaydiumAmmParser();
    this.logsParser = new LogsParser();
    this.PROGRAM_ID = RaydiumAmmParser.PROGRAM_ID;
    this.ixParser = new SolanaParser([]);
    this.ixParser.addParser(
      RaydiumAmmParser.PROGRAM_ID,
      this.raydiumAmmParser.parseInstruction.bind(this.raydiumAmmParser),
    );
  }

  parseTransactionWithInnerInstructions(tx: any) {
    if (!tx) {
      this.logger.error('No transaction provided');
      return [];
    }

    try {
      return this.ixParser.parseTransactionWithInnerInstructions(tx);
    } catch (error) {
      this.logger.error('Error parsing transaction:', error);
      return [];
    }
  }

  parseLogMessages(instructions: any[], logMessages: string[]) {
    if (!instructions || !logMessages) {
      this.logger.error('Missing instructions or log messages');
      return [];
    }

    try {
      const events = this.logsParser.parse(instructions, logMessages);
      if (events) {
        BnLayoutFormatter.format(events);
      }
      return events;
    } catch (error) {
      this.logger.error('Error parsing log messages:', error);
      return [];
    }
  }

  parseTransaction(tx: any): ParsedInstruction | null {
    if (!tx) {
      this.logger.error('No transaction provided');
      return null;
    }

    try {
      return this.raydiumAmmParser.parseInstruction(tx);
    } catch (error) {
      this.logger.error('Error parsing transaction:', error);
      return null;
    }
  }
}
