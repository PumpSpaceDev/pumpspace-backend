import { Idl } from '@project-serum/anchor';
import {
  LogContext,
  ParsedInstruction,
  parseLogs,
} from '@shyft-to/solana-transaction-parser';
import { struct, u8 } from '@solana/buffer-layout';
import { u64 } from '@solana/buffer-layout-utils';
import { RaydiumAmmParser } from './parser';
import { Injectable } from '@nestjs/common';

export type LogEvent = {
  name: string;
  data: any;
};

interface SwapBaseInLog {
  logType: number;
  amountIn: bigint;
  minimumOut: bigint;
  direction: bigint;
  userSource: bigint;
  poolCoin: bigint;
  poolPc: bigint;
  outAmount: bigint;
}

const SwapBaseInLogLayout = struct<SwapBaseInLog>([
  u8('logType'),
  u64('amountIn'),
  u64('minimumOut'),
  u64('direction'),
  u64('userSource'),
  u64('poolCoin'),
  u64('poolPc'),
  u64('outAmount'),
]);

interface SwapBaseOutLog {
  logType: number;
  maxIn: bigint;
  amountOut: bigint;
  direction: bigint;
  userSource: bigint;
  poolCoin: bigint;
  poolPc: bigint;
  directIn: bigint;
}

const SwapBaseOutLogLayout = struct<SwapBaseOutLog>([
  u8('logType'),
  u64('maxIn'),
  u64('amountOut'),
  u64('direction'),
  u64('userSource'),
  u64('poolCoin'),
  u64('poolPc'),
  u64('directIn'),
]);

const RAYDIUM_AMM_PROGRAM_ID = RaydiumAmmParser.PROGRAM_ID.toBase58();

@Injectable()
export class LogsParser {
  private readonly raydiumAmmLogsParser: RaydiumAmmLogsParser;

  constructor() {
    this.raydiumAmmLogsParser = new RaydiumAmmLogsParser();
  }

  parse(
    actions: ParsedInstruction<Idl, string>[],
    logMessages: string[],
  ): LogEvent[] {
    if (!this.isValidIx(actions)) {
      return [];
    }

    const logs = parseLogs(logMessages);

    return actions
      .map((action, index) => {
        if ('info' in action) {
          return;
        } else {
          const programId = action.programId.toBase58();
          switch (programId) {
            case RAYDIUM_AMM_PROGRAM_ID: {
              return this.raydiumAmmLogsParser.parse(action, logs[index]);
            }
            default:
              return;
          }
        }
      })
      .filter((log) => Boolean(log)) as LogEvent[];
  }

  private isValidIx(actions: ParsedInstruction<Idl, string>[]): boolean {
    return actions.some(
      (action) => action.programId.toBase58() === RAYDIUM_AMM_PROGRAM_ID,
    );
  }
}

@Injectable()
export class RaydiumAmmLogsParser {
  parse(
    action: ParsedInstruction<Idl, string>,
    log: LogContext,
  ): LogEvent | undefined {
    if (!log) {
      return;
    }

    let event: LogEvent;
    switch (action.name) {
      case 'swapBaseIn':
      case 'swapBaseOut': {
        try {
          const rayLog = log.logMessages.at(-1) as string;
          const base64Log = rayLog.replace('ray_log: ', '');
          const raydiumEventData = Buffer.from(base64Log, 'base64');

          const discriminator = u8().decode(raydiumEventData);
          switch (discriminator) {
            case 3: {
              const logData = SwapBaseInLogLayout.decode(raydiumEventData);
              event = { name: 'swapBaseIn', data: logData };
              break;
            }
            case 4: {
              const logData = SwapBaseOutLogLayout.decode(raydiumEventData);
              event = { name: 'swapBaseOut', data: logData };
              break;
            }
          }
          return event;
        } catch (error) {
          console.error({
            message: 'raydiumAmmlogParsingErr',
            error,
          });
          return;
        }
      }
      default:
        return;
    }
  }
}
