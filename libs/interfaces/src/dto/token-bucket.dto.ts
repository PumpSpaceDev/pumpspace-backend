import { IsString, IsNumber, IsDate, IsNotEmpty } from 'class-validator';

export class TokenBucketDto {
  @IsNotEmpty()
  @IsString()
  tokenId: string;

  @IsNotEmpty()
  @IsString()
  bucketKey: string;

  @IsNotEmpty()
  @IsNumber()
  bucketVolume: number;

  @IsNotEmpty()
  @IsNumber()
  bucketPrice: number;

  @IsNotEmpty()
  @IsDate()
  lastUpdated: Date;
}
