import {
  IsString,
  IsNumber,
  IsDateString,
  IsEnum,
  Min,
  Max,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { EvaluationStatus } from './update-evaluation.dto';

export class CreateEvaluationDto {
  @ApiProperty({ description: 'ID of the signal being evaluated' })
  @IsNumber()
  @Type(() => Number)
  signalId: number;

  @ApiProperty({
    description: 'Unique code identifying the signal',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @Length(1, 100)
  signalUniqueCode: string;

  @ApiProperty({ description: 'Time when the evaluation was performed' })
  @IsDateString()
  evaluationTime: Date;

  @ApiProperty({ description: 'Entry price of the signal', minimum: 0 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  entryPrice: number;

  @ApiProperty({ description: 'Exit price of the signal', minimum: 0 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  exitPrice: number;

  @ApiProperty({ description: 'Profit/Loss amount' })
  @IsNumber()
  @Type(() => Number)
  profitLoss: number;

  @ApiProperty({ description: 'Return on Investment percentage' })
  @IsNumber()
  @Type(() => Number)
  roi: number;

  @ApiProperty({
    description: 'Price change percentage',
    minimum: -100,
    maximum: 1000,
  })
  @IsNumber()
  @Min(-100)
  @Max(1000)
  @Type(() => Number)
  priceChange: number;

  @ApiProperty({
    description: 'Reserve change percentage',
    minimum: -100,
    maximum: 1000,
  })
  @IsNumber()
  @Min(-100)
  @Max(1000)
  @Type(() => Number)
  reserveChange: number;

  @ApiProperty({ description: 'Market capitalization', minimum: 0 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  marketCap: number;

  @ApiProperty({
    description: 'Weight for price change in composite score',
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  priceWeight: number;

  @ApiProperty({
    description: 'Weight for reserve change in composite score',
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  reserveWeight: number;

  @ApiProperty({
    description: 'Final composite score',
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  compositeScore: number;

  @ApiProperty({
    description: 'Success rate percentage',
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  successRate: number;

  @ApiProperty({
    description: 'Evaluation status',
    enum: EvaluationStatus,
    default: EvaluationStatus.PENDING,
  })
  @IsEnum(EvaluationStatus)
  status: EvaluationStatus;
}
