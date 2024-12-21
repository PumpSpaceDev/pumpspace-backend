import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { Network } from '../enums/network.enum';
import { SignalType } from '../enums/signal-type.enum';

export class CreateSignalDto {
  @IsString()
  uniqueCode: string;

  @IsString()
  address: string;

  @IsString()
  @IsOptional()
  symbol?: string;

  @IsEnum(SignalType, { message: 'Signal must be a valid signal type' })
  signal: SignalType;

  @IsEnum(Network, { message: 'Network must be a valid blockchain network' })
  network: Network;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsNumber()
  @IsOptional()
  reserve?: number;

  @IsBoolean()
  @IsOptional()
  done?: boolean;
}
