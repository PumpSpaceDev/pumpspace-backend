import {
  IsString,
  IsNumber,
  IsBoolean,
  IsDate,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';

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
  @IsString()
  signal: string;

  @IsNotEmpty()
  @IsString()
  network: string;

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
