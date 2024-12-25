export type RaydiumSwapEvent = {
  signature: string;
  timestamp: string;
  amm: string;
  user: string;
  isBuy: boolean;
  tokenIn: string;
  tokenInDecimals: number;
  tokenOutDecimals: number;
  tokenOut: string;
  tokenInAmount: string;
  tokenOutAmount: string;
  baseVaultPostBalance: string;
  quoteVaultPostBalance: string;
};
