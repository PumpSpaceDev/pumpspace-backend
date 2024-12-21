import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateScoreDto {
  @ApiProperty({
    description: 'SOL balance in lamports (1 SOL = 1e9 lamports)',
    example: '1000000000',
    pattern: '^[0-9]+$',
  })
  @IsString()
  @Matches(/^[0-9]+$/, { message: 'SOL balance must be a valid number string' })
  solBalance: string;
}
