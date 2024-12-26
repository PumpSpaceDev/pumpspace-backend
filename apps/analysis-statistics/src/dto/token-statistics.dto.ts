import {
  IsString,
  IsNumber,
  IsDateString,
  Min,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { BucketWindowEnum } from '../analysis-statistics.service';

export class TokenStatisticsDto {
  @IsString()
  tokenId: string;

  @IsEnum(BucketWindowEnum)
  window: BucketWindowEnum;

  @IsNumber()
  @Min(0)
  volume: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsDateString()
  lastUpdated: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  transactionCount?: number;
}
