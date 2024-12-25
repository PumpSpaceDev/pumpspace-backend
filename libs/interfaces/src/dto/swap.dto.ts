import {
  IsString,
  IsNumber,
  Min,
  Max,
  Length,
  IsOptional,
  IsInt,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { TokenBalance } from '@solana/web3.js';

// Custom decorator for bigint validation
function IsBigInt() {
  return Transform(({ value }) => {
    try {
      return BigInt(value);
    } catch {
      return value;
    }
  });
}

export class SwapDto {
  @IsString()
  signature: string;

  @Type(() => Date)
  timestamp: Date;

  @IsString()
  signer: string;

  @IsString()
  amm: string;

  @IsInt()
  direction: number;

  @IsBigInt()
  @IsString()
  amountIn: bigint;

  @IsBigInt()
  @IsString()
  amountOut: bigint;

  postTokenBalances?: Array<TokenBalance> | null;
}

export class SwapFilterDto {
  @IsString()
  @Length(44, 44)
  @IsOptional()
  signer?: string;

  @IsString()
  @Length(44, 44)
  @IsOptional()
  amm?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  skip?: number = 0;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  take?: number = 20;

  @IsString()
  @Length(1, 100)
  @IsOptional()
  market?: string;
}
