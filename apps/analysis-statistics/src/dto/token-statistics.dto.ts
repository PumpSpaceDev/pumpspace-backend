import {
  IsString,
  IsNumber,
  IsDateString,
  Min,
  IsOptional,
} from 'class-validator';

export class TokenStatisticsDto {
  @IsString()
  tokenId: string;

  @IsString()
  window: string;

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
