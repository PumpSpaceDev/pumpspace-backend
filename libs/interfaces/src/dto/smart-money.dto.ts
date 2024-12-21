import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsDate,
  IsNotEmpty,
  IsEnum,
} from 'class-validator';
import { Network } from '../enums/network.enum';

export class SmartMoneyDto {
  @IsNotEmpty()
  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsNotEmpty()
  @IsEnum(Network, { message: 'Network must be a valid blockchain network' })
  network: Network;

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
