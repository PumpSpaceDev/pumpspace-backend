import { IsString, IsNumber, IsDate, IsNotEmpty } from 'class-validator';

export class SmartMoneyScoreDto {
  @IsNotEmpty()
  @IsString()
  address: string;

  @IsNotEmpty()
  @IsNumber()
  solBalance: bigint;

  @IsNotEmpty()
  @IsDate()
  time: Date;

  @IsNotEmpty()
  @IsNumber()
  score: number;
}
