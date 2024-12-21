import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Network } from '@app/interfaces/enums/network.enum';
import { SignalType } from '@app/interfaces/enums/signal-type.enum';
import { ApiProperty } from '@nestjs/swagger';

@Entity('signal')
@Index(['uniqueCode'], { unique: true })
@Index(['recommondTime'])
@Index(['network', 'symbol'])
export class Signal {
  @ApiProperty({ description: 'Unique identifier', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Unique signal code', example: 'SIGNAL-123' })
  @Column({ type: 'varchar', length: 100, unique: true })
  uniqueCode: string;

  @ApiProperty({
    description: 'Wallet address',
    example: '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
  })
  @Column({ type: 'varchar', length: 44 })
  address: string;

  @ApiProperty({ description: 'Token symbol', example: 'SOL', required: false })
  @Column({ type: 'varchar', length: 20, nullable: true })
  @Index()
  symbol: string;

  @ApiProperty({
    description: 'Signal type',
    enum: SignalType,
    example: SignalType.BUY,
  })
  @Column({ type: 'enum', enum: SignalType })
  signal: SignalType;

  @ApiProperty({
    description: 'Blockchain network',
    enum: Network,
    example: Network.SOLANA,
  })
  @Column({ type: 'enum', enum: Network })
  network: Network;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({ description: 'Recommended time for the signal' })
  @Column('timestamp', { nullable: false })
  recommondTime: Date;

  @ApiProperty({
    description: 'Token price',
    example: 0.00123,
    required: false,
  })
  @Column({ type: 'decimal', precision: 20, scale: 10, nullable: true })
  price: number;

  @ApiProperty({
    description: 'Token reserve amount',
    example: 1000000,
    required: false,
  })
  @Column({ type: 'decimal', precision: 20, scale: 10, nullable: true })
  reserve: number;

  @ApiProperty({ description: 'Signal completion status', default: false })
  @Column({ type: 'boolean', default: false })
  done: boolean;
}
