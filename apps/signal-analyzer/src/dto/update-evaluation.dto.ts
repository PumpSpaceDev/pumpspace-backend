import { IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum EvaluationStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export class UpdateEvaluationDto {
  @ApiProperty({
    description: 'Exit price for the evaluated signal',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  exitPrice?: number;

  @ApiProperty({ description: 'Profit/Loss amount', required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  profitLoss?: number;

  @ApiProperty({
    description: 'Return on Investment percentage',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  roi?: number;

  @ApiProperty({
    description: 'Current status of the evaluation',
    required: false,
    enum: EvaluationStatus,
  })
  @IsOptional()
  @IsEnum(EvaluationStatus)
  status?: EvaluationStatus;
}
