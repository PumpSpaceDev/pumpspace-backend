import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Network } from '../enums/network.enum';
import { SignalType } from '../enums/signal-type.enum';

export class CreateSignalDto {
  @ApiProperty({
    description: 'Unique identifier for the signal',
    example: 'SIGNAL-123',
  })
  @IsString()
  uniqueCode: string;

  @ApiProperty({
    description: 'Wallet address associated with the signal',
    example: '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
  })
  @IsString()
  address: string;

  @ApiProperty({
    description: 'Token symbol',
    example: 'SOL',
    required: false,
  })
  @IsString()
  @IsOptional()
  symbol?: string;

  @ApiProperty({
    description: 'Type of the signal',
    enum: SignalType,
    example: SignalType.BUY,
  })
  @IsEnum(SignalType, { message: 'Signal must be a valid signal type' })
  signal: SignalType;

  @ApiProperty({
    description: 'Blockchain network',
    enum: Network,
    example: Network.SOLANA,
  })
  @IsEnum(Network, { message: 'Network must be a valid blockchain network' })
  network: Network;

  @ApiProperty({
    description: 'Token price at signal creation',
    example: 0.00123,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiProperty({
    description: 'Token reserve amount',
    example: 1000000,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  reserve?: number;

  @ApiProperty({
    description: 'Whether the signal is completed',
    example: false,
    default: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  done?: boolean;
}
