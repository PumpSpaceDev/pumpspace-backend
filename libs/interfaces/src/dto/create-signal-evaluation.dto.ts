import { IsNumber, IsOptional, IsObject } from 'class-validator';

export class CreateSignalEvaluationDto {
  @IsNumber()
  signalId: number;

  @IsNumber()
  entryPrice: number;

  @IsNumber()
  @IsOptional()
  exitPrice?: number;

  @IsNumber()
  @IsOptional()
  profitLoss?: number;

  @IsNumber()
  @IsOptional()
  roi?: number;

  @IsNumber()
  @IsOptional()
  holdingPeriod?: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
