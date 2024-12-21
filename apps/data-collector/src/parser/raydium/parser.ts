import {
  PublicKey,
  TransactionInstruction,
  AccountMeta,
} from '@solana/web3.js';
import { struct, u8 } from '@solana/buffer-layout';
import { u64 } from '@solana/buffer-layout-utils';
import { Injectable } from '@nestjs/common';

interface ParsedInstruction {
  name: string;
  programId: string;
  accounts: (
    | AccountMeta
    | {
        name: string;
        pubkey: PublicKey;
        isSigner: boolean;
        isWritable: boolean;
      }
  )[];
  args: SwapBaseInArgs | SwapBaseOutArgs | Record<string, never>;
}

type SwapBaseInArgs = {
  amountIn: bigint;
  minimumAmountOut: bigint;
};

const SwapBaseInArgsLayout = struct<SwapBaseInArgs>([
  u64('amountIn'),
  u64('minimumAmountOut'),
]);

type SwapBaseOutArgs = {
  maxAmountIn: bigint;
  amountOut: bigint;
};

const SwapBaseOutArgsLayout = struct<SwapBaseOutArgs>([
  u64('maxAmountIn'),
  u64('amountOut'),
]);

@Injectable()
export class RaydiumAmmParser {
  static PROGRAM_ID = new PublicKey(
    '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  );

  parseInstruction(instruction: TransactionInstruction): ParsedInstruction {
    const instructionData = instruction.data;
    const instructionType = u8().decode(instructionData);

    switch (instructionType) {
      case 9: {
        return this.parseSwapBaseInIx(instruction);
      }
      case 11: {
        return this.parseSwapBaseOutIx(instruction);
      }
      default:
        return this.parseUnknownInstruction(instruction);
    }
  }

  private parseSwapBaseInIx(
    instruction: TransactionInstruction,
  ): ParsedInstruction {
    const accounts = instruction.keys;
    const instructionData = instruction.data.slice(1);
    const args = SwapBaseInArgsLayout.decode(instructionData);
    return {
      name: 'swapBaseIn',
      programId: RaydiumAmmParser.PROGRAM_ID.toString(),
      accounts: accounts.map((account, index) => {
        switch (index) {
          case 0:
            return { ...account, name: 'amm' };
          case 1:
            return { ...account, name: 'authority' };
          case 2:
            return { ...account, name: 'userSourceOwner' };
          case 3:
            return { ...account, name: 'userSourceToken' };
          case 4:
            return { ...account, name: 'userDestinationToken' };
          case 5:
            return { ...account, name: 'poolSourceToken' };
          case 6:
            return { ...account, name: 'poolDestinationToken' };
          default:
            return account;
        }
      }),
      args,
    };
  }

  private parseSwapBaseOutIx(
    instruction: TransactionInstruction,
  ): ParsedInstruction {
    const accounts = instruction.keys;
    const instructionData = instruction.data.slice(1);
    const args = SwapBaseOutArgsLayout.decode(instructionData);
    return {
      name: 'swapBaseOut',
      programId: RaydiumAmmParser.PROGRAM_ID.toString(),
      accounts: accounts.map((account, index) => {
        switch (index) {
          case 0:
            return { ...account, name: 'amm' };
          case 1:
            return { ...account, name: 'authority' };
          case 2:
            return { ...account, name: 'userSourceOwner' };
          case 3:
            return { ...account, name: 'userSourceToken' };
          case 4:
            return { ...account, name: 'userDestinationToken' };
          case 5:
            return { ...account, name: 'poolSourceToken' };
          case 6:
            return { ...account, name: 'poolDestinationToken' };
          default:
            return account;
        }
      }),
      args,
    };
  }

  private parseUnknownInstruction(
    instruction: TransactionInstruction,
  ): ParsedInstruction {
    return {
      name: 'unknown',
      programId: RaydiumAmmParser.PROGRAM_ID.toString(),
      accounts: instruction.keys,
      args: {},
    };
  }
}
