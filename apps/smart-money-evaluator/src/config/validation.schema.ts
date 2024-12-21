import { IsInt, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class SmartMoneyEvaluatorConfig {
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  readonly port?: number = 3000;

  @IsInt()
  @Min(1000)
  @IsOptional()
  @Type(() => Number)
  readonly cleanupInterval?: number = 3600000; // 1 hour in milliseconds

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  readonly scoreRetentionDays?: number = 30; // Keep scores for 30 days
}
