import { IsString, IsNumber, IsBoolean, IsOptional, IsDate, IsNotEmpty } from 'class-validator';

export class SmartMoneyDto {
  @IsNotEmpty()
  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsNotEmpty()
  @IsString()
  network: string;

  @IsOptional()
  @IsString()
  twitterHandle?: string;

  @IsNumber()
  priority: number = 4;

  @IsBoolean()
  syncStatus: boolean = true;

  @IsOptional()
  @IsDate()
  lastSyncedAt?: Date;

  @IsOptional()
  @IsString()
  firstBeforeTxSignature?: string;
}
