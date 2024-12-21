import { PublicKey } from '@solana/web3.js';
import { struct, u8 } from '@solana/buffer-layout';
import { u64, publicKey } from '@solana/buffer-layout-utils';

export interface SwapBaseInArgs {
  amountIn: bigint;
  minAmountOut: bigint;
}

export interface SwapBaseOutArgs {
  maxAmountIn: bigint;
  amountOut: bigint;
}

export interface SwapBaseInLog {
  discriminator: number;
  amountIn: bigint;
  amountOut: bigint;
  poolSourceToken: PublicKey;
  poolDestinationToken: PublicKey;
}

export interface SwapBaseOutLog {
  discriminator: number;
  amountIn: bigint;
  amountOut: bigint;
  poolSourceToken: PublicKey;
  poolDestinationToken: PublicKey;
}

export const SwapBaseInArgsLayout = struct<SwapBaseInArgs>([
  u64('amountIn'),
  u64('minAmountOut'),
]);

export const SwapBaseOutArgsLayout = struct<SwapBaseOutArgs>([
  u64('maxAmountIn'),
  u64('amountOut'),
]);

export const SwapBaseInLogLayout = struct<SwapBaseInLog>([
  u8('discriminator'),
  u64('amountIn'),
  u64('amountOut'),
  publicKey('poolSourceToken'),
  publicKey('poolDestinationToken'),
]);

export const SwapBaseOutLogLayout = struct<SwapBaseOutLog>([
  u8('discriminator'),
  u64('amountIn'),
  u64('amountOut'),
  publicKey('poolSourceToken'),
  publicKey('poolDestinationToken'),
]);
