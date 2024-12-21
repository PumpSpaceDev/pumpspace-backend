import {
  IsString,
  IsNumber,
  IsBoolean,
  IsDate,
  IsOptional,
  IsNotEmpty,
  IsEnum,
} from 'class-validator';
import { Network } from '../enums/network.enum';
import { SignalType } from '../enums/signal-type.enum';

export class SignalDto {
  @IsNotEmpty()
  @IsString()
  uniqueCode: string;

  @IsNotEmpty()
  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  symbol?: string;

  @IsNotEmpty()
  @IsEnum(SignalType, { message: 'Signal must be a valid signal type' })
  signal: SignalType;

  @IsNotEmpty()
  @IsEnum(Network, { message: 'Network must be a valid blockchain network' })
  network: Network;

  @IsNotEmpty()
  @IsDate()
  recommondTime: Date;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  reserve?: number;

  @IsBoolean()
  done: boolean = false;
}
