import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('smart_money')
@Index(['address', 'network'], { unique: true })
@Index(['priority', 'syncStatus'])
@Index(['lastSyncedAt'])
export class SmartMoney {
  @ApiProperty({ description: 'Unique identifier', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: 'Wallet address',
    example: '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
  })
  @Column({ type: 'varchar', length: 44 })
  address: string;

  @ApiProperty({ description: 'Nickname for the address', required: false })
  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  @ApiProperty({
    description: 'Blockchain network (e.g., Solana, Ethereum)',
    example: 'Solana',
  })
  @Column({ type: 'varchar', length: 50 })
  network: string;

  @ApiProperty({
    description: 'Twitter handle of the address owner',
    required: false,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  twitterHandle: string;

  @ApiProperty({
    description: 'Priority level for tracking',
    default: 4,
    minimum: 1,
    maximum: 10,
  })
  @Column({ type: 'int', default: 4 })
  priority: number;

  @ApiProperty({
    description: 'Whether the address is actively being synced',
    default: true,
  })
  @Column({ type: 'boolean', default: true })
  syncStatus: boolean;

  @ApiProperty({
    description: 'Last successful sync timestamp',
    required: false,
  })
  @Column({ type: 'timestamp', nullable: true })
  lastSyncedAt: Date;

  @ApiProperty({
    description: 'First transaction signature before tracking started',
    required: false,
  })
  @Column({ type: 'varchar', length: 128, nullable: true })
  firstBeforeTxSignature: string;
}
