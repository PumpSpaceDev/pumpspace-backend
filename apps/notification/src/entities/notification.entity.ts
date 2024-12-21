import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import {
  IsString,
  IsEnum,
  IsObject,
  IsBoolean,
  IsNumber,
  Length,
  Matches,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

@Entity('notifications')
@Index(['walletAddress', 'processed'])
@Index(['type', 'processed'])
@Index(['createdAt', 'processed'])
@Index(['channel', 'processed'])
export class Notification {
  @ApiProperty({ description: 'Unique identifier for the notification' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: 'Type of notification',
    enum: ['SMART_MONEY_MATCH'],
    example: 'SMART_MONEY_MATCH',
  })
  @Column({ type: 'varchar', length: 255 })
  @IsString()
  @IsEnum(['SMART_MONEY_MATCH'])
  type: string;

  @ApiProperty({
    description: 'Additional data associated with the notification',
    type: 'object',
    additionalProperties: true,
    example: {
      tokenAddress: '0x1234567890abcdef',
      amount: '1000000000000000000',
      network: 'ethereum'
    }
  })
  @Column({ type: 'jsonb' })
  @IsObject()
  @ValidateNested()
  data: Record<string, any>;

  @ApiProperty({
    description: 'Wallet address associated with the notification',
    example: '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
    minLength: 32,
    maxLength: 44,
  })
  @Column({ type: 'varchar', length: 44, nullable: true })
  @IsString()
  @Length(32, 44)
  @Matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
  walletAddress: string;

  @ApiProperty({
    description: 'Whether the notification has been processed',
    default: false,
  })
  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  processed: boolean;

  @ApiProperty({
    description: 'Channel through which the notification was received',
    enum: ['smart-money'],
    example: 'smart-money',
  })
  @Column({ type: 'varchar', length: 50, nullable: true })
  @IsString()
  @IsEnum(['smart-money'])
  channel: string;

  @ApiProperty({
    description: 'Priority level of the notification (0-5)',
    minimum: 0,
    maximum: 5,
    default: 0,
  })
  @Column({ type: 'int', default: 0 })
  @IsNumber()
  @Min(0)
  @Max(5)
  priority: number;

  @ApiProperty({
    description: 'Timestamp when the notification was created',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the notification was last updated',
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
