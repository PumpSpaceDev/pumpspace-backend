import { IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddressParamDto {
  @ApiProperty({
    description: 'Wallet address to evaluate',
    example: '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
    minLength: 32,
    maxLength: 44,
  })
  @IsString()
  @Length(32, 44)
  @Matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, {
    message: 'Address must be a valid blockchain address',
  })
  address: string;
}
