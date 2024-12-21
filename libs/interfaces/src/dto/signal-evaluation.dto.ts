import { IsString, IsNumber, IsDate, IsNotEmpty } from 'class-validator';

export class SignalEvaluationDto {
  @IsNotEmpty()
  @IsString()
  signalUniqueCode: string;

  @IsNotEmpty()
  @IsDate()
  evaluationTime: Date;

  @IsNotEmpty()
  @IsNumber()
  priceChange: number;

  @IsNotEmpty()
  @IsNumber()
  reserveChange: number;

  @IsNotEmpty()
  @IsNumber()
  marketCap: number;

  @IsNotEmpty()
  @IsNumber()
  priceWeight: number;

  @IsNotEmpty()
  @IsNumber()
  reserveWeight: number;

  @IsNotEmpty()
  @IsNumber()
  compositeScore: number;
}
