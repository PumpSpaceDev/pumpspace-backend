import { IsString, IsNumber, IsDate, IsInt, IsNotEmpty } from 'class-validator';

export class SwapDto {
  @IsNotEmpty()
  @IsString()
  signature: string;

  @IsNotEmpty()
  @IsDate()
  timestamp: Date;

  @IsNotEmpty()
  @IsString()
  signer: string;

  @IsNotEmpty()
  @IsString()
  amm: string;

  @IsNotEmpty()
  @IsInt()
  direction: number;

  @IsNotEmpty()
  @IsNumber()
  amountIn: bigint;

  @IsNotEmpty()
  @IsNumber()
  amountOut: bigint;
}
