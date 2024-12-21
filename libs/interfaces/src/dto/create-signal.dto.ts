import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateSignalDto {
  @IsString()
  uniqueCode: string;

  @IsString()
  address: string;

  @IsString()
  @IsOptional()
  symbol?: string;

  @IsString()
  signal: string;

  @IsString()
  network: string;

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
