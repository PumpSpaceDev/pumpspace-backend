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
  @Length(88, 88)
  signature: string;

  @Type(() => Date)
  timestamp: Date;

  @IsString()
  @Length(44, 44)
  signer: string;

  @IsString()
  @Length(44, 44)
  amm: string;

  @IsInt()
  direction: number;

  @IsBigInt()
  @IsString()
  amountIn: bigint;

  @IsBigInt()
  @IsString()
  amountOut: bigint;

  @IsString()
  @Length(44, 44)
  tokenIn: string;

  @IsString()
  @Length(44, 44)
  tokenOut: string;
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
